'use client'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import type { Brand, GlobalSetting } from '@/types/database'
import { useSearchParams } from 'next/navigation'
import { AccountsTab } from './accounts-tab'
import { BackfillTab } from './backfill-tab'
import { BrandsTab } from './brands-tab'
import { TokenTab } from './token-tab'
import { UsersTab } from './users-tab'

interface AdminShellProps {
  settings: GlobalSetting[]
  brands: Brand[]
}

export function AdminShell({ settings, brands }: AdminShellProps) {
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') ?? 'tokens'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">관리자 설정</h1>

      <Tabs value={currentTab}>
        <TabsContent value="tokens" className="mt-0">
          <TokenTab settings={settings} />
        </TabsContent>

        <TabsContent value="accounts" className="mt-0">
          <AccountsTab brands={brands} />
        </TabsContent>

        <TabsContent value="brands" className="mt-0">
          <BrandsTab brands={brands} />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <UsersTab brands={brands} />
        </TabsContent>

        <TabsContent value="backfill" className="mt-0">
          <BackfillTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
