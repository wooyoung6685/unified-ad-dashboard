'use client'

import { useQuery } from '@tanstack/react-query'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import type { Brand, DailyFilters, MetaAccount, TiktokAccount } from '@/types/database'
import type { MetaDailyStatFull } from '@/types/database'
import type { TiktokDailyStatFull } from '@/types/database'
import { DailyFilterBar } from './daily-filter-bar'
import { DailyFetchButton } from './daily-fetch-button'
import { MetaDailyTable } from './meta-daily-table'
import { TiktokDailyTable } from './tiktok-daily-table'

interface DailyShellProps {
  role: 'admin' | 'viewer'
  initialBrandId: string
  brands: Brand[]
  metaAccounts: (MetaAccount & { brands: { name: string } | null })[]
  tiktokAccounts: (TiktokAccount & { brands: { name: string } | null })[]
}

async function fetchDailyStats(filters: DailyFilters) {
  const params = new URLSearchParams({
    brand_id: filters.brandId,
    account_id: filters.accountId,
    account_type: filters.accountType,
    start_date: filters.startDate,
    end_date: filters.endDate,
  })
  const res = await fetch(`/api/dashboard/daily?${params.toString()}`)
  if (!res.ok) throw new Error('데이터 조회에 실패했습니다.')
  return res.json() as Promise<{
    platform: 'meta' | 'tiktok'
    rows: MetaDailyStatFull[] | TiktokDailyStatFull[]
  }>
}

export function DailyShell({
  role,
  initialBrandId,
  brands,
  metaAccounts,
  tiktokAccounts,
}: DailyShellProps) {
  const today = new Date().toISOString().slice(0, 10)

  const [filters, setFilters] = useState<DailyFilters>({
    brandId: initialBrandId,
    accountId: '',
    accountType: 'meta',
    startDate: today,
    endDate: today,
  })

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['daily-stats', filters],
    queryFn: () => fetchDailyStats(filters),
    enabled: false,
  })

  function handleSearch() {
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <CalendarIcon className="text-primary size-6" />
        <div>
          <h1 className="text-2xl font-bold">일별 데이터 조회</h1>
          <p className="text-muted-foreground text-sm">
            브랜드와 계정을 선택하여 상세 성과를 확인하세요.
          </p>
        </div>
      </div>

      {/* 필터 바 */}
      <DailyFilterBar
        filters={filters}
        role={role}
        brands={brands}
        metaAccounts={metaAccounts}
        tiktokAccounts={tiktokAccounts}
        isFetching={isFetching}
        onChange={setFilters}
        onSearch={handleSearch}
        fetchButton={
          role === 'admin' ? (
            <DailyFetchButton
              accountId={filters.accountId}
              accountType={filters.accountType}
              startDate={filters.startDate}
              endDate={filters.endDate}
              onComplete={handleSearch}
            />
          ) : undefined
        }
      />

      {/* 테이블 */}
      {data && (
        <div className="rounded-lg border">
          {data.platform === 'meta' ? (
            <MetaDailyTable rows={data.rows as MetaDailyStatFull[]} />
          ) : (
            <TiktokDailyTable rows={data.rows as TiktokDailyStatFull[]} />
          )}
        </div>
      )}

      {/* 미선택 안내 */}
      {!data && !isFetching && (
        <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
          계정을 선택하고 조회하기 버튼을 눌러주세요
        </div>
      )}
    </div>
  )
}
