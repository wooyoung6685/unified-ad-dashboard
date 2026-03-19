'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart2 } from 'lucide-react'
import { useState } from 'react'
import type {
  Brand,
  MetaAccount,
  SummaryFilters,
  SummaryResponse,
  TiktokAccount,
} from '@/types/database'
import { MetaAnalyticsCharts } from './analysis-charts'
import { TiktokAnalyticsCharts } from './tiktok-analytics-charts'
import { KpiSection } from './kpi-section'
import { SummaryChart } from './summary-chart'
import { SummaryFilterBar } from './summary-filter-bar'

interface SummaryShellProps {
  role: 'admin' | 'viewer'
  initialBrandId: string
  brands: Brand[]
  metaAccounts: (MetaAccount & { brands: { name: string } | null })[]
  tiktokAccounts: (TiktokAccount & { brands: { name: string } | null })[]
}

async function fetchSummaryStats(filters: SummaryFilters): Promise<SummaryResponse> {
  const params = new URLSearchParams({
    brand_id: filters.brandId,
    account_id: filters.accountId,
    account_type: filters.accountType,
    start_date: filters.startDate,
    end_date: filters.endDate,
  })
  const res = await fetch(`/api/dashboard/summary?${params.toString()}`)
  if (!res.ok) throw new Error('데이터 조회에 실패했습니다.')
  return res.json()
}

export function SummaryShell({
  role,
  initialBrandId,
  brands,
  metaAccounts,
  tiktokAccounts,
}: SummaryShellProps) {
  const today = new Date().toISOString().slice(0, 10)

  const [filters, setFilters] = useState<SummaryFilters>({
    brandId: initialBrandId,
    accountId: '',
    accountType: 'meta',
    startDate: today,
    endDate: today,
  })

  // 기본 선택 지표: CTR + 노출수
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'ctr',
    'impressions',
  ])

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['summary', filters],
    queryFn: () => fetchSummaryStats(filters),
    enabled: false,
  })

  function handleSearch() {
    refetch()
  }

  // 계정 타입 변경 시 선택 지표 초기화
  function handleFiltersChange(newFilters: SummaryFilters) {
    if (newFilters.accountType !== filters.accountType) {
      setSelectedMetrics(['ctr', 'impressions'])
    }
    setFilters(newFilters)
  }

  // FIFO 선택 로직: 최대 2개, 초과 시 가장 오래된 것 제거
  function handleMetricSelect(key: string) {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length < 2) return [...prev, key]
      return [prev[1], key]
    })
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <BarChart2 className="text-primary size-6" />
        <div>
          <h1 className="text-2xl font-bold">대시보드 요약</h1>
          <p className="text-muted-foreground text-sm">
            브랜드와 계정을 선택하여 광고 성과를 확인하세요.
          </p>
        </div>
      </div>

      {/* 필터 바 */}
      <SummaryFilterBar
        filters={filters}
        role={role}
        brands={brands}
        metaAccounts={metaAccounts}
        tiktokAccounts={tiktokAccounts}
        isFetching={isFetching}
        onChange={handleFiltersChange}
        onSearch={handleSearch}
      />

      {/* KPI 섹션 */}
      <KpiSection
        totals={data?.totals ?? null}
        accountType={filters.accountType}
        selectedMetrics={selectedMetrics}
        onSelect={handleMetricSelect}
        isLoading={isFetching}
      />

      {/* 일별 추이 차트 */}
      <div className="space-y-2">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          일별 추이
        </h3>
        {data ? (
          <div className="bg-card rounded-lg border p-4">
            <SummaryChart
              data={data.dailyData}
              selectedMetrics={selectedMetrics}
              platform={data.platform}
            />
          </div>
        ) : (
          !isFetching && (
            <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
              계정을 선택하고 조회하기 버튼을 눌러주세요
            </div>
          )
        )}
      </div>

      {/* 성과 분석 그래프 */}
      {data && (
        filters.accountType === 'meta' ? (
          <MetaAnalyticsCharts data={data.dailyData} />
        ) : (
          <TiktokAnalyticsCharts data={data.dailyData} />
        )
      )}
    </div>
  )
}
