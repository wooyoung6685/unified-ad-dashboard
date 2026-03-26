import { AppSidebar } from '@/components/layout/app-sidebar'
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/auth-cache'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  // Suspense + fallback을 제거하여 SSR/클라이언트 Radix useId 카운터 일치 보장
  // getCachedProfile은 React cache()로 메모이제이션되므로 추가 DB 호출 없음
  const profile = await getCachedProfile(user.id)

  return (
    <DashboardLayoutClient
      sidebar={
        <AppSidebar
          role={(profile?.role ?? 'viewer') as 'admin' | 'viewer'}
          userEmail={user.email ?? ''}
        />
      }
    >
      {children}
    </DashboardLayoutClient>
  )
}
