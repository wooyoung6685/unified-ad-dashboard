import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// 루트 경로: 로그인 상태에 따라 /dashboard 또는 /login으로 리다이렉트
export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
