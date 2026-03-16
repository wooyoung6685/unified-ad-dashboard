'use client'

import { logout } from '@/app/dashboard/actions'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { BarChart2, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AppSidebarProps {
  role: 'admin' | 'viewer'
  userEmail: string
}

export function AppSidebar({ role, userEmail }: AppSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { label: '대시보드', href: '/dashboard', icon: BarChart2 },
    ...(role === 'admin'
      ? [{ label: '관리자 설정', href: '/dashboard/admin', icon: Settings }]
      : []),
  ]

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <span className="text-lg font-bold">AD Dashboard</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        <p className="text-muted-foreground mb-2 truncate text-xs">
          {userEmail}
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
          >
            <LogOut className="size-4" />
            로그아웃
          </button>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
