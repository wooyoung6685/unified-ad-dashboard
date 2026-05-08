'use client'

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useSearchParams } from 'next/navigation'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  sidebar: React.ReactNode
}

export function DashboardLayoutClient({ children, sidebar }: DashboardLayoutClientProps) {
  const searchParams = useSearchParams()

  if (searchParams.get('print') === '1') {
    return <main className="min-w-0">{children}</main>
  }

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
