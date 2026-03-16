'use client'

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  role: 'admin' | 'viewer'
  userEmail: string
}

export function DashboardLayoutClient({
  children,
  role,
  userEmail,
}: DashboardLayoutClientProps) {
  return (
    <SidebarProvider>
      <AppSidebar role={role} userEmail={userEmail} />
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
