import { AdminShell } from '@/components/dashboard/admin/admin-shell'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/auth-cache'
import { createClient } from '@/lib/supabase/server'
import type { AdminPlatformToken, Brand } from '@/types/database'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const profile = await getCachedProfile(user.id)
  if (profile?.role !== 'admin') redirect('/dashboard')

  // 초기 데이터 병렬 fetch
  const supabase = await createClient()
  const [{ data: rawTokens }, { data: brands }] = await Promise.all([
    supabase.from('admin_platform_tokens').select('*').eq('user_id', user.id),
    supabase
      .from('brands')
      .select('*')
      .or(`owner_user_id.eq.${user.id},owner_user_id.is.null`)
      .order('created_at', { ascending: false }),
  ])

  // 토큰이 없는 플랫폼은 빈 객체로 초기화
  const tokenMap = new Map((rawTokens ?? []).map((t) => [t.platform, t]))
  const settings: AdminPlatformToken[] = (['meta', 'tiktok'] as const).map(
    (p) =>
      tokenMap.get(p) ?? {
        id: '',
        user_id: user.id,
        platform: p,
        access_token: null,
        app_id: null,
        secret: null,
        created_at: '',
        updated_at: '',
      },
  )

  return (
    <AdminShell
      settings={settings}
      brands={(brands ?? []) as Brand[]}
    />
  )
}
