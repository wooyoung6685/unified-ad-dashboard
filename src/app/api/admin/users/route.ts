import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 현재 어드민이 소유한 brand_id 목록 조회
async function getMyBrandIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('brands')
    .select('id')
    .eq('owner_user_id', userId)
  return (data ?? []).map((b) => b.id)
}

// users + user_brands JOIN + auth email 매핑 (내가 생성한 유저만)
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const [{ data: authData, error: authError }, { data, error }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin
      .from('users')
      .select('id, role, created_at, created_by, user_brands(brand_id, brands(name))')
      .eq('created_by', user.id)
      .order('created_at', { ascending: true }),
  ])

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const emailMap = new Map<string, string>(
    authData.users.map((u) => [u.id, u.email ?? '']),
  )

  const users = (data ?? []).map((row) => {
    type UbRow = { brand_id: string; brands: { name: string } | { name: string }[] | null }
    const ub = (row.user_brands ?? []) as unknown as UbRow[]
    return {
      id: row.id,
      email: emailMap.get(row.id) ?? '',
      brand_ids: ub.map((x) => x.brand_id),
      brand_names: ub.map((x) => {
        const b = x.brands
        if (!b) return ''
        return Array.isArray(b) ? (b[0]?.name ?? '') : b.name
      }),
      role: row.role,
      created_at: row.created_at,
    }
  })

  return NextResponse.json({ users })
}

// Auth 유저 생성 + users 테이블 INSERT + user_brands 다중 INSERT
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const body = await req.json()
  const { email, password, brand_ids, role } = body as {
    email: string
    password: string
    brand_ids: string[]
    role: 'viewer' | 'admin'
  }

  if (!email || !password || !role) {
    return NextResponse.json(
      { error: '이메일, 비밀번호, role은 필수입니다.' },
      { status: 400 },
    )
  }

  if (!Array.isArray(brand_ids) || brand_ids.length === 0) {
    return NextResponse.json(
      { error: '브랜드를 1개 이상 선택해주세요.' },
      { status: 400 },
    )
  }

  // 모든 brand_id가 현재 어드민 소유 브랜드인지 검증
  const myBrandIds = await getMyBrandIds(currentUser.id)
  const invalid = brand_ids.filter((b) => !myBrandIds.includes(b))
  if (invalid.length > 0) {
    return NextResponse.json({ error: '권한 없는 브랜드가 포함되어 있습니다.' }, { status: 403 })
  }

  // Auth 유저 생성
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const authUser = authData.user

  // users 테이블 INSERT (brand_id는 첫 번째 브랜드로 채움 — 컬럼 호환용)
  const { error: usersErr } = await supabaseAdmin
    .from('users')
    .insert({ id: authUser.id, brand_id: brand_ids[0], role: 'viewer', created_by: currentUser.id })

  if (usersErr) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.id)
    return NextResponse.json({ error: usersErr.message }, { status: 500 })
  }

  // user_brands 다중 INSERT
  const ubRows = brand_ids.map((bid) => ({ user_id: authUser.id, brand_id: bid }))
  const { error: ubErr } = await supabaseAdmin.from('user_brands').insert(ubRows)

  if (ubErr) {
    // 보상 롤백
    await supabaseAdmin.from('user_brands').delete().eq('user_id', authUser.id)
    await supabaseAdmin.from('users').delete().eq('id', authUser.id)
    await supabaseAdmin.auth.admin.deleteUser(authUser.id)
    return NextResponse.json({ error: ubErr.message }, { status: 500 })
  }

  // brand_names 조회 후 응답
  const { data: brandRows } = await supabaseAdmin
    .from('brands')
    .select('id, name')
    .in('id', brand_ids)
  const nameMap = new Map((brandRows ?? []).map((b) => [b.id, b.name]))

  return NextResponse.json({
    user: {
      id: authUser.id,
      email,
      brand_ids,
      brand_names: brand_ids.map((b) => nameMap.get(b) ?? ''),
      role: 'viewer',
      created_at: new Date().toISOString(),
    },
  })
}

// users 테이블 + Auth 유저 삭제 (?id=<uuid>)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 파라미터가 필요합니다.' }, { status: 400 })

  // 자기 자신 삭제 방지
  if (id === currentUser.id) {
    return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다.' }, { status: 403 })
  }

  // 삭제 대상 유저의 소유권 검증
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('created_by')
    .eq('id', id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: '유저를 찾을 수 없습니다.' }, { status: 404 })
  }

  const isMyCreation = targetUser.created_by === currentUser.id

  if (!isMyCreation) {
    // created_by가 아닌 경우 브랜드 매핑으로 2차 검증
    const myBrandIds = await getMyBrandIds(currentUser.id)
    const { data: ubRows } = await supabaseAdmin
      .from('user_brands')
      .select('brand_id')
      .eq('user_id', id)
    const targetBrandIds = (ubRows ?? []).map((r) => r.brand_id)
    const isMyBrandUser = targetBrandIds.some((b) => myBrandIds.includes(b))

    if (!isMyBrandUser) {
      return NextResponse.json({ error: '해당 유저에 대한 권한이 없습니다.' }, { status: 403 })
    }
  }

  // DB 먼저 삭제 (user_brands는 FK CASCADE로 자동 삭제)
  const { error: dbError } = await supabaseAdmin.from('users').delete().eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Auth 유저 삭제
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
