import { getCachedProfile } from '@/lib/supabase/auth-cache'
import { AppSidebar } from './app-sidebar'

interface AppSidebarLoaderProps {
  userId: string
  userEmail: string
}

export async function AppSidebarLoader({ userId, userEmail }: AppSidebarLoaderProps) {
  const profile = await getCachedProfile(userId)
  return (
    <AppSidebar
      role={(profile?.role ?? 'viewer') as 'admin' | 'viewer'}
      userEmail={userEmail}
    />
  )
}
