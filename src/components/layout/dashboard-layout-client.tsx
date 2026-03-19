'use client'

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  sidebar: React.ReactNode
}

export function DashboardLayoutClient({ children, sidebar }: DashboardLayoutClientProps) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset className="min-w-0">
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="min-w-0 overflow-hidden p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
