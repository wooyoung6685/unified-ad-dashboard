import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// users + brands JOIN + auth email 매핑
export async function GET() {
  // Auth 유저 목록으로 id → email 맵 생성
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const emailMap = new Map<string, string>(
    authData.users.map((u) => [u.id, u.email ?? '']),
  )

  // users 테이블과 brands JOIN
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*, brands(name)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
  const body = await req.json()
  const { email, password, brand_id, role } = body

  if (!email || !password || !role) {
    return NextResponse.json(
      { error: '이메일, 비밀번호, role은 필수입니다.' },
      { status: 400 },
    )
  }

  // Auth 유저 생성
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const authUser = authData.user

  // users 테이블 INSERT
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({ id: authUser.id, brand_id: brand_id || null, role })
    .select('*, brands(name)')
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
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 파라미터가 필요합니다.' }, { status: 400 })

  // DB 먼저 삭제
  const { error: dbError } = await supabaseAdmin.from('users').delete().eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Auth 유저 삭제
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
