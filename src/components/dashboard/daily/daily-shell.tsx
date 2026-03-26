'use client'

import { useQuery } from '@tanstack/react-query'
import { CalendarIcon, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  Brand,
  DailyFilters,
  GmvMaxDailyRow,
  MetaAccount,
  MetaDailyStatFull,
  ShopeeAccount,
  ShopeeInappDayRow,
  ShopeeShoppingStat,
  TiktokAccount,
  TiktokDailyStatFull,
} from '@/types/database'
import { DailyFilterBar } from './daily-filter-bar'
import { DailyFetchButton } from './daily-fetch-button'
import { MetaDailyTable } from './meta-daily-table'
import { ShopeeInappTable } from './shopee-inapp-table'
import { ShopeeShoppingTable } from './shopee-shopping-table'
import { ShopeeUploadArea } from './shopee-upload-area'
import { TiktokDailyTable } from './tiktok-daily-table'
import { TiktokGmvMaxDailyTable } from './tiktok-gmvmax-daily-table'

interface DailyShellProps {
  role: 'admin' | 'viewer'
  initialBrandId: string
  brands: Brand[]
  metaAccounts: (MetaAccount & { brands: { name: string } | null })[]
  tiktokAccounts: (TiktokAccount & { brands: { name: string } | null })[]
  shopeeAccounts: (ShopeeAccount & { brands: { name: string } | null })[]
}

type DailyApiResponse =
  | { platform: 'meta'; rows: MetaDailyStatFull[] }
  | { platform: 'tiktok'; rows: TiktokDailyStatFull[]; gmvMaxRows: GmvMaxDailyRow[] | null }
  | { platform: 'shopee_shopping'; rows: ShopeeShoppingStat[] }
  | { platform: 'shopee_inapp'; rows: ShopeeInappDayRow[] }

async function fetchDailyStats(filters: DailyFilters): Promise<DailyApiResponse> {
  const params = new URLSearchParams({
    brand_id: filters.brandId,
    account_id: filters.accountId,
    account_type: filters.accountType,
    start_date: filters.startDate,
    end_date: filters.endDate,
  })
  const res = await fetch(`/api/dashboard/daily?${params.toString()}`)
  if (!res.ok) throw new Error('데이터 조회에 실패했습니다.')
  return res.json()
}

export function DailyShell({
  role,
  initialBrandId,
  brands,
  metaAccounts,
  tiktokAccounts,
  shopeeAccounts,
}: DailyShellProps) {
  const today = new Date().toISOString().slice(0, 10)

  const [filters, setFilters] = useState<DailyFilters>({
    brandId: initialBrandId,
    accountId: '',
    accountType: 'meta',
    startDate: today,
    endDate: today,
  })

  const [showUpload, setShowUpload] = useState(false)

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['daily-stats', filters],
    queryFn: () => fetchDailyStats(filters),
    enabled: false,
  })

  function handleSearch() {
    refetch()
  }

  function handleFiltersChange(newFilters: DailyFilters) {
    setFilters(newFilters)
    // 계정이 변경되면 업로드 영역 숨김
    if (newFilters.accountId !== filters.accountId) {
      setShowUpload(false)
    }
  }

  const isShopee =
    filters.accountType === 'shopee_shopping' || filters.accountType === 'shopee_inapp'

  // 선택된 shopee 계정 정보
  const selectedShopeeAccount = isShopee
    ? shopeeAccounts.find((a) => a.id === filters.accountId)
    : null

  // fetchButton 슬롯
  let fetchButtonSlot: React.ReactNode = undefined
  if (filters.accountId) {
    if (isShopee) {
      if (role === 'admin') {
        fetchButtonSlot = (
          <Button
            variant={showUpload ? 'secondary' : 'outline'}
            size="sm"
            className="h-9"
            onClick={() => setShowUpload((v) => !v)}
          >
            <Upload className="mr-1.5 size-4" />
            파일 업로드
          </Button>
        )
      }
    } else {
      if (role === 'admin') {
        fetchButtonSlot = (
          <DailyFetchButton
            accountId={filters.accountId}
            accountType={filters.accountType as 'meta' | 'tiktok'}
            startDate={filters.startDate}
            endDate={filters.endDate}
            onComplete={handleSearch}
          />
        )
      }
    }
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
        shopeeAccounts={shopeeAccounts}
        isFetching={isFetching}
        onChange={handleFiltersChange}
        onSearch={handleSearch}
        fetchButton={fetchButtonSlot}
      />

      {/* Shopee 파일 업로드 Dialog */}
      <Dialog open={showUpload && !!selectedShopeeAccount} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>파일 업로드</DialogTitle>
          </DialogHeader>
          {selectedShopeeAccount && (
            <ShopeeUploadArea
              shopeeAccountId={selectedShopeeAccount.id}
              accountExternalId={selectedShopeeAccount.account_id}
              accountType={filters.accountType as 'shopee_shopping' | 'shopee_inapp'}
              onUploadSuccess={() => {
                setShowUpload(false)
                handleSearch()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 테이블 */}
      {data && (
        <div className="space-y-6">
          {data.platform === 'meta' ? (
            <div className="rounded-lg border">
              <MetaDailyTable rows={data.rows as MetaDailyStatFull[]} />
            </div>
          ) : data.platform === 'tiktok' ? (
            <>
              <div className="rounded-lg border">
                <TiktokDailyTable rows={data.rows as TiktokDailyStatFull[]} />
              </div>
              {data.gmvMaxRows && data.gmvMaxRows.length > 0 && (
                <TiktokGmvMaxDailyTable rows={data.gmvMaxRows} />
              )}
            </>
          ) : data.platform === 'shopee_shopping' ? (
            <div className="rounded-lg border">
              <ShopeeShoppingTable rows={data.rows as ShopeeShoppingStat[]} />
            </div>
          ) : (
            <div className="rounded-lg border">
              <ShopeeInappTable rows={data.rows as ShopeeInappDayRow[]} />
            </div>
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
