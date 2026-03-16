import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return (
    <DashboardLayoutClient
      role={profile?.role ?? 'viewer'}
      userEmail={user.email ?? ''}
    >
      {children}
    </DashboardLayoutClient>
  )
}
