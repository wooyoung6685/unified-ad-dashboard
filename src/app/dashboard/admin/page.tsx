import { AdminShell } from '@/components/dashboard/admin/admin-shell'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/auth-cache'
import { createClient } from '@/lib/supabase/server'
import type { Brand, GlobalSetting } from '@/types/database'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const profile = await getCachedProfile(user.id)
  if (profile?.role !== 'admin') redirect('/dashboard')

  // 초기 데이터 병렬 fetch
  const supabase = await createClient()
  const [{ data: settings }, { data: brands }] = await Promise.all([
    supabase.from('global_settings').select('*'),
    supabase.from('brands').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <AdminShell
      settings={(settings ?? []) as GlobalSetting[]}
      brands={(brands ?? []) as Brand[]}
    />
  )
}
