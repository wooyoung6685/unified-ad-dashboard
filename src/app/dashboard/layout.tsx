import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client'
import { AppSidebarLoader } from '@/components/layout/app-sidebar-loader'
import { AppSidebarSkeleton } from '@/components/layout/app-sidebar-skeleton'
import { getCachedUser } from '@/lib/supabase/auth-cache'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const sidebar = (
    <Suspense fallback={<AppSidebarSkeleton />}>
      <AppSidebarLoader userId={user.id} userEmail={user.email ?? ''} />
    </Suspense>
  )

  return (
    <DashboardLayoutClient sidebar={sidebar}>
      {children}
    </DashboardLayoutClient>
  )
}
