'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Brand, GlobalSetting } from '@/types/database'
import { AccountsTab } from './accounts-tab'
import { BrandsTab } from './brands-tab'
import { TokenTab } from './token-tab'
import { UsersTab } from './users-tab'

interface AdminShellProps {
  settings: GlobalSetting[]
  brands: Brand[]
}

export function AdminShell({ settings, brands }: AdminShellProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">관리자 설정</h1>

      <Tabs defaultValue="tokens">
        <TabsList>
          <TabsTrigger value="tokens">토큰 관리</TabsTrigger>
          <TabsTrigger value="accounts">광고계정 관리</TabsTrigger>
          <TabsTrigger value="brands">브랜드 관리</TabsTrigger>
          <TabsTrigger value="users">유저 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="mt-6">
          <TokenTab settings={settings} />
        </TabsContent>

        <TabsContent value="accounts" className="mt-6">
          <AccountsTab brands={brands} />
        </TabsContent>

        <TabsContent value="brands" className="mt-6">
          <BrandsTab brands={brands} />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UsersTab brands={brands} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
