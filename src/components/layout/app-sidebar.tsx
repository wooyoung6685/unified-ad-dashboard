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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import {
  BarChart2,
  Building2,
  ChevronDown,
  CreditCard,
  DollarSign,
  FileText,
  KeyRound,
  LogOut,
  Settings,
  TableProperties,
  Users,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Collapsible } from 'radix-ui'
import { Suspense } from 'react'

interface AppSidebarProps {
  role: 'admin' | 'viewer'
  userEmail: string
}

const ADMIN_SUB_ITEMS = [
  { label: '토큰 관리', tab: 'tokens', icon: KeyRound },
  { label: '광고계정 관리', tab: 'accounts', icon: CreditCard },
  { label: '브랜드 관리', tab: 'brands', icon: Building2 },
  { label: '유저 관리', tab: 'users', icon: Users },
  { label: '환율 설정', tab: 'exchange-rates', icon: DollarSign },
]

// useSearchParams를 별도 컴포넌트로 분리하여 SSR deoptimization 범위를 최소화
function AdminSubMenuItems({ isAdminPage }: { isAdminPage: boolean }) {
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') ?? 'tokens'

  return (
    <SidebarMenuSub>
      {ADMIN_SUB_ITEMS.map(({ label, tab, icon: Icon }) => {
        const isActive = isAdminPage && currentTab === tab
        return (
          <SidebarMenuSubItem key={tab}>
            <SidebarMenuSubButton asChild isActive={isActive}>
              <Link href={`/dashboard/admin?tab=${tab}`}>
                <Icon className="size-3.5" />
                <span>{label}</span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      })}
    </SidebarMenuSub>
  )
}

export function AppSidebar({ role, userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const isAdminPage = pathname.startsWith('/dashboard/admin')
  const queryClient = useQueryClient()

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <span className="text-lg font-bold">AD Dashboard</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 대시보드 메뉴 */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard'}>
                  <Link href="/dashboard">
                    <BarChart2 className="size-4" />
                    <span>대시보드</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 일별 데이터 메뉴 */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/daily'}>
                  <Link href="/dashboard/daily">
                    <TableProperties className="size-4" />
                    <span>일별 데이터</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 리포트 메뉴 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/dashboard/report')}
                >
                  <Link href="/dashboard/report">
                    <FileText className="size-4" />
                    <span>광고 성과 리포트</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 관리자 설정 — Collapsible 서브메뉴 */}
              {role === 'admin' && (
                <Collapsible.Root defaultOpen={isAdminPage} className="group/collapsible">
                  <SidebarMenuItem>
                    <Collapsible.Trigger asChild>
                      <SidebarMenuButton isActive={isAdminPage}>
                        <Settings className="size-4" />
                        <span>관리자 설정</span>
                        <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </Collapsible.Trigger>

                    <Collapsible.Content>
                      {/* Suspense로 감싸 useSearchParams 의 SSR deoptimization을 이 레벨로 제한 */}
                      <Suspense fallback={null}>
                        <AdminSubMenuItems isAdminPage={isAdminPage} />
                      </Suspense>
                    </Collapsible.Content>
                  </SidebarMenuItem>
                </Collapsible.Root>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        <p className="text-muted-foreground mb-2 truncate text-xs">
          {userEmail}
        </p>
        <form action={logout} onSubmit={() => queryClient.clear()}>
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
