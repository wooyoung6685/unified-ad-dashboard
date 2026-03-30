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

// users + brands JOIN + auth email 매핑 (현재 어드민 소유 브랜드의 유저 + 내가 생성한 유저만)
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const myBrandIds = await getMyBrandIds(user.id)

  // 내 브랜드에 속한 유저 OR 내가 생성한 유저만 조회 (brand_id.is.null 제거)
  const conditions = [`created_by.eq.${user.id}`]
  if (myBrandIds.length > 0) {
    conditions.push(`brand_id.in.(${myBrandIds.join(',')})`)
  }

  const [{ data: authData, error: authError }, { data, error }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin
      .from('users')
      .select('*, brands!users_brand_id_fkey(name)')
      .or(conditions.join(','))
      .order('created_at', { ascending: true }),
  ])

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const emailMap = new Map<string, string>(
    authData.users.map((u) => [u.id, u.email ?? '']),
  )

  const users = (data ?? []).map((row) => ({
    id: row.id,
    email: emailMap.get(row.id) ?? '',
    brand_id: row.brand_id,
    brand_name: (row.brands as { name: string } | null)?.name ?? '',
    role: row.role,
    created_at: row.created_at,
  }))

  return NextResponse.json({ users })
}

// Auth 유저 생성 + users 테이블 INSERT
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const body = await req.json()
  const { email, password, brand_id, role } = body

  if (!email || !password || !role) {
    return NextResponse.json(
      { error: '이메일, 비밀번호, role은 필수입니다.' },
      { status: 400 },
    )
  }

  // brand_id가 있으면 현재 어드민 소유 브랜드인지 검증
  if (brand_id) {
    const myBrandIds = await getMyBrandIds(currentUser.id)
    if (!myBrandIds.includes(brand_id)) {
      return NextResponse.json({ error: '해당 브랜드에 대한 권한이 없습니다.' }, { status: 403 })
    }
  }

  // Auth 유저 생성
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const authUser = authData.user

  // users 테이블 INSERT (created_by에 현재 어드민 ID 기록)
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({ id: authUser.id, brand_id: brand_id || null, role: 'viewer', created_by: currentUser.id })
    .select('*, brands!users_brand_id_fkey(name)')
    .single()

  if (error) {
    // users 테이블 삽입 실패 시 Auth 유저도 롤백
    await supabaseAdmin.auth.admin.deleteUser(authUser.id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const user = {
    id: data.id,
    email,
    brand_id: data.brand_id,
    brand_name: (data.brands as { name: string } | null)?.name ?? '',
    role: data.role,
    created_at: data.created_at,
  }

  return NextResponse.json({ user })
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
    .select('brand_id, created_by')
    .eq('id', id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: '유저를 찾을 수 없습니다.' }, { status: 404 })
  }

  const myBrandIds = await getMyBrandIds(currentUser.id)
  const isMyCreation = targetUser.created_by === currentUser.id
  const isMyBrandUser = targetUser.brand_id != null && myBrandIds.includes(targetUser.brand_id)

  if (!isMyCreation && !isMyBrandUser) {
    return NextResponse.json({ error: '해당 유저에 대한 권한이 없습니다.' }, { status: 403 })
  }

  // DB 먼저 삭제
  const { error: dbError } = await supabaseAdmin.from('users').delete().eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Auth 유저 삭제
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
