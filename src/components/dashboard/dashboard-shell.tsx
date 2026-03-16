'use client'

import type { DashboardFilters, MetaAccount, TiktokAccount } from '@/types/database'
import { calcKpi, fetchDashboardStats } from '@/lib/queries/stats'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { FilterBar } from './filter-bar'
import { KpiCards } from './kpi-cards'
import { SpendRevenueChart } from './spend-revenue-chart'
import { StatsTable } from './stats-table'

interface DashboardShellProps {
  metaAccounts: MetaAccount[]
  tiktokAccounts: TiktokAccount[]
}

function parseFilters(params: URLSearchParams): DashboardFilters {
  return {
    platform: (params.get('platform') as DashboardFilters['platform']) ?? 'all',
    range: (params.get('range') as DashboardFilters['range']) ?? '7d',
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    accountId: params.get('account') ?? 'all',
  }
}

function filtersToParams(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams()
  params.set('platform', filters.platform)
  params.set('range', filters.range)
  if (filters.range === 'custom') {
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
  }
  params.set('account', filters.accountId)
  return params
}

export function DashboardShell({
  metaAccounts,
  tiktokAccounts,
}: DashboardShellProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = parseFilters(searchParams)

  const handleFiltersChange = useCallback(
    (newFilters: DashboardFilters) => {
      router.replace(`/dashboard?${filtersToParams(newFilters).toString()}`)
    },
    [router],
  )

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', filters],
    queryFn: () => fetchDashboardStats(filters),
  })

  const rows = stats ?? []
  const summary = isLoading ? undefined : calcKpi(rows)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      <FilterBar
        filters={filters}
        metaAccounts={metaAccounts}
        tiktokAccounts={tiktokAccounts}
        onChange={handleFiltersChange}
      />

      <KpiCards summary={summary} isLoading={isLoading} />

      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-sm font-semibold">지출 / 매출 추이</h2>
        <SpendRevenueChart data={rows} isLoading={isLoading} />
      </div>

      <StatsTable data={rows} isLoading={isLoading} />
    </div>
  )
}
