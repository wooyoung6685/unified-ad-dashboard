import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// admin 권한 체크 유틸 — API 라우트에서 공통으로 사용
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }),
      user: null,
      supabase,
    } as const
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return {
      error: NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 }),
      user: null,
      supabase,
    } as const
  }

  return { error: null, user, supabase } as const
}
