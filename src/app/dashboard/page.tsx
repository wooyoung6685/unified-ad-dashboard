import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { createClient } from '@/lib/supabase/server'
import type { MetaAccount, TiktokAccount } from '@/types/database'
import { Suspense } from 'react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 계정 목록 SSR fetch (RLS가 brand_id 자동 필터링)
  const [{ data: metaAccounts }, { data: tiktokAccounts }] = await Promise.all([
    supabase.from('meta_accounts').select('*').eq('is_active', true),
    supabase.from('tiktok_accounts').select('*').eq('is_active', true),
  ])

  return (
    <Suspense>
      <DashboardShell
        metaAccounts={(metaAccounts ?? []) as MetaAccount[]}
        tiktokAccounts={(tiktokAccounts ?? []) as TiktokAccount[]}
      />
    </Suspense>
  )
}
