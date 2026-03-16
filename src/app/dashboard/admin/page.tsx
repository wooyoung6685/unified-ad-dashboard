import { AdminShell } from '@/components/dashboard/admin/admin-shell'
import { createClient } from '@/lib/supabase/server'
import type { Brand, GlobalSetting } from '@/types/database'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()

  // 인증 및 role 검사
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // 초기 데이터 병렬 fetch
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
