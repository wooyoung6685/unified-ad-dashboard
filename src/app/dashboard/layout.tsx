import { DashboardDataProvider } from '@/components/layout/dashboard-data-provider'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client'
import { getCachedCommonData } from '@/lib/supabase/fetch-common-data'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/auth-cache'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const profile = await getCachedProfile(user.id)
  const role = profile?.role ?? 'viewer'
  const brandIds = profile?.brandIds ?? []

  // 공통 데이터를 layout에서 1회 fetch — 탭 전환 시 re-fetch 없음
  const commonData = await getCachedCommonData(user.id, role, brandIds)

  return (
    <DashboardDataProvider data={commonData}>
      <DashboardLayoutClient
        sidebar={
          <AppSidebar
            role={role as 'admin' | 'viewer'}
            userEmail={user.email ?? ''}
          />
        }
      >
        {children}
      </DashboardLayoutClient>
    </DashboardDataProvider>
  )
}
