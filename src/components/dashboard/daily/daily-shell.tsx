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
import { Separator } from '@/components/ui/separator'
import type {
  DailyFilters,
  GmvMaxDailyRow,
  MetaDailyStatFull,
  ShopeeInappDayRow,
  ShopeeShoppingStat,
  TiktokDailyStatFull,
} from '@/types/database'
import { useDashboardData } from '@/components/layout/dashboard-data-provider'
import { DailyFilterBar } from './daily-filter-bar'
import { DailyFetchButton } from './daily-fetch-button'
import { MetaDailyTable } from './meta-daily-table'
import { ShopeeInappTable } from './shopee-inapp-table'
import { ShopeeShoppingTable } from './shopee-shopping-table'
import { ShopeeUploadArea } from './shopee-upload-area'
import { TiktokDailyTable } from './tiktok-daily-table'
import { TiktokGmvMaxDailyTable } from './tiktok-gmvmax-daily-table'

type DailyApiResponse =
  | { platform: 'meta'; rows: MetaDailyStatFull[] }
  | { platform: 'tiktok'; rows: TiktokDailyStatFull[]; gmvMaxRows: GmvMaxDailyRow[] | null }
  | { platform: 'shopee'; shopping_rows: ShopeeShoppingStat[]; inapp_rows: ShopeeInappDayRow[] }

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

export function DailyShell() {
  const { role, initialBrandId, brands, metaAccounts, tiktokAccounts, shopeeAccounts } =
    useDashboardData()
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

  const isShopee = filters.accountType === 'shopee_shopping' || filters.accountType === 'shopee_inapp'

  // 선택된 shopee 계정 정보 (대표 행)
  const selectedShopeeAccount = isShopee
    ? shopeeAccounts.find((a) => a.id === filters.accountId)
    : null

  // 업로드용: 같은 account_id의 shopping/inapp 각각의 DB PK 조회
  const shopeeExternalAccountId = selectedShopeeAccount?.account_id ?? ''
  const shoppingAccountForUpload = shopeeExternalAccountId
    ? shopeeAccounts.find(
        (a) => a.account_id === shopeeExternalAccountId && a.account_type === 'shopping'
      )
    : null
  const inappAccountForUpload = shopeeExternalAccountId
    ? shopeeAccounts.find(
        (a) => a.account_id === shopeeExternalAccountId && a.account_type === 'inapp'
      )
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

      {/* Shopee 파일 업로드 Dialog — 쇼핑몰/인앱 두 업로드 영역 */}
      <Dialog open={showUpload && !!selectedShopeeAccount} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>쇼피 파일 업로드</DialogTitle>
          </DialogHeader>
          {selectedShopeeAccount && (
            <div className="space-y-6">
              {shoppingAccountForUpload && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">쇼핑몰 데이터 (.xlsx)</p>
                  <ShopeeUploadArea
                    shopeeAccountId={shoppingAccountForUpload.id}
                    accountExternalId={shopeeExternalAccountId}
                    accountType="shopee_shopping"
                    onUploadSuccess={() => {
                      handleSearch()
                    }}
                  />
                </div>
              )}
              {shoppingAccountForUpload && inappAccountForUpload && <Separator />}
              {inappAccountForUpload && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">인앱 데이터 (.csv)</p>
                  <ShopeeUploadArea
                    shopeeAccountId={inappAccountForUpload.id}
                    accountExternalId={shopeeExternalAccountId}
                    accountType="shopee_inapp"
                    onUploadSuccess={() => {
                      handleSearch()
                    }}
                  />
                </div>
              )}
            </div>
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
              <TiktokDailyTable rows={data.rows as TiktokDailyStatFull[]} />
              {data.gmvMaxRows && data.gmvMaxRows.length > 0 && (
                <TiktokGmvMaxDailyTable rows={data.gmvMaxRows} />
              )}
            </>
          ) : (
            // shopee: 쇼핑몰 + 인앱 테이블 세로 나란히
            <>
              {data.shopping_rows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">쇼핑몰</p>
                  <div className="rounded-lg border">
                    <ShopeeShoppingTable rows={data.shopping_rows} />
                  </div>
                </div>
              )}
              {data.inapp_rows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">인앱</p>
                  <div className="rounded-lg border">
                    <ShopeeInappTable rows={data.inapp_rows} />
                  </div>
                </div>
              )}
              {data.shopping_rows.length === 0 && data.inapp_rows.length === 0 && (
                <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
                  해당 기간에 데이터가 없습니다.
                </div>
              )}
            </>
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
