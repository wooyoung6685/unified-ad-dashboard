'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart2 } from 'lucide-react'
import { useState } from 'react'
import type {
  SummaryFilters,
  SummaryResponse,
} from '@/types/database'
import { useDashboardData } from '@/components/layout/dashboard-data-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MetaAnalyticsCharts } from './analysis-charts'
import { AmazonAdsAnalyticsCharts } from './amazon-ads-analytics-charts'
import { AmazonAdsKpiSection } from './amazon-ads-kpi-section'
import { AmazonAdsSummaryChart } from './amazon-ads-summary-chart'
import { AmazonCombinedKpi } from './amazon-combined-kpi'
import { AmazonOrganicAnalyticsCharts } from './amazon-organic-analytics-charts'
import { GmvMaxAnalyticsCharts } from './gmvmax-analytics-charts'
import { ShopeeInappAnalyticsCharts } from './shopee-inapp-analytics-charts'
import { ShopeeShoppingAnalyticsCharts } from './shopee-shopping-analytics-charts'
import { TiktokAnalyticsCharts } from './tiktok-analytics-charts'
import { KpiSection } from './kpi-section'
import { SummaryChart } from './summary-chart'
import { SummaryFilterBar } from './summary-filter-bar'

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

export function SummaryShell() {
  const { role, initialBrandId, brands, metaAccounts, tiktokAccounts, shopeeAccounts, amazonAccounts } =
    useDashboardData()
  const today = new Date().toISOString().slice(0, 10)

  const [filters, setFilters] = useState<SummaryFilters>({
    brandId: initialBrandId,
    accountId: '',
    accountType: 'meta' as SummaryFilters['accountType'],
    startDate: today,
    endDate: today,
  })

  // 기본 선택 지표: 지출금액 + 매출 + ROAS
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'spend',
    'revenue',
    'roas',
  ])

  // Amazon 광고 선택 지표
  const [selectedAdsMetrics, setSelectedAdsMetrics] = useState<string[]>(['cost', 'sales', 'acos'])

  const [activeTab, setActiveTab] = useState<'campaign' | 'gmv_max'>('gmv_max')

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
    if (newFilters.accountType !== filters.accountType || newFilters.accountId !== filters.accountId) {
      // shopee 계열은 지출금액 + 매출, tiktok은 캠페인 탭 기본(지출 + 노출)
      const defaultMetrics =
        (newFilters.accountType === 'shopee_shopping' || newFilters.accountType === 'shopee_inapp')
          ? ['spend', 'revenue']
          : newFilters.accountType === 'tiktok'
            ? ['spend', 'impressions']
            : (newFilters.accountType === 'amazon_organic' || newFilters.accountType === 'amazon_ads' || newFilters.accountType === 'amazon_asin')
              ? ['revenue', 'purchases']
              : ['spend', 'revenue', 'roas']
      setSelectedMetrics(defaultMetrics)
      if (newFilters.accountType === 'amazon_organic' || newFilters.accountType === 'amazon_ads' || newFilters.accountType === 'amazon_asin') {
        setSelectedAdsMetrics(['cost', 'sales', 'acos'])
      }
      setActiveTab(newFilters.accountType === 'tiktok' ? 'campaign' : 'gmv_max')
    }
    setFilters(newFilters)
  }

  function handleTabChange(tab: 'campaign' | 'gmv_max') {
    setActiveTab(tab)
    setSelectedMetrics(tab === 'gmv_max' ? ['roi', 'cost'] : ['spend', 'impressions'])
  }

  // FIFO 선택 로직: 최대 3개, 초과 시 가장 오래된 것 제거
  function handleMetricSelect(key: string) {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length < 3) return [...prev, key]
      return [...prev.slice(1), key]
    })
  }

  function handleAdsMetricSelect(key: string) {
    setSelectedAdsMetrics((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length < 3) return [...prev, key]
      return [...prev.slice(1), key]
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
        shopeeAccounts={shopeeAccounts}
        amazonAccounts={amazonAccounts}
        isFetching={isFetching}
        onChange={handleFiltersChange}
        onSearch={handleSearch}
      />

      {/* TikTok: 캠페인/GMV Max 탭 분기 */}
      {filters.accountType === 'tiktok' ? (() => {
        const hasCampaignData = !!data && data.dailyData.length > 0
        const hasGmvMaxData = !!data?.gmvMaxDailyData && data.gmvMaxDailyData.length > 0
        const showTabs = hasCampaignData && hasGmvMaxData

        // 캠페인 KPI + 차트 + 분석그래프
        const campaignContent = (
          <>
            <KpiSection
              totals={data?.totals ?? null}
              accountType="tiktok"
              selectedMetrics={selectedMetrics}
              onSelect={handleMetricSelect}
              isLoading={isFetching}
            />
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                일별 추이
              </h3>
              <div className="bg-card rounded-lg border p-4">
                <SummaryChart
                  data={data?.dailyData ?? []}
                  selectedMetrics={selectedMetrics}
                  platform="tiktok"
                />
              </div>
            </div>
            {data && <TiktokAnalyticsCharts data={data.dailyData} />}
          </>
        )

        // GMV Max KPI + 차트 + 분석그래프
        const gmvMaxContent = (
          <>
            <KpiSection
              totals={data?.gmvMaxTotals ?? null}
              accountType="tiktok"
              selectedMetrics={selectedMetrics}
              onSelect={handleMetricSelect}
              isLoading={isFetching}
              isGmvMax
            />
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                일별 추이
              </h3>
              <div className="bg-card rounded-lg border p-4">
                <SummaryChart
                  data={data?.gmvMaxDailyData ?? []}
                  selectedMetrics={selectedMetrics}
                  platform="tiktok"
                />
              </div>
            </div>
            {data?.gmvMaxDailyData && (
              <GmvMaxAnalyticsCharts data={data.gmvMaxDailyData} />
            )}
          </>
        )

        if (showTabs) {
          return (
            <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as 'campaign' | 'gmv_max')}>
              <TabsList variant="line">
                <TabsTrigger value="gmv_max">GMV Max</TabsTrigger>
                <TabsTrigger value="campaign">캠페인</TabsTrigger>
              </TabsList>
              <TabsContent value="campaign" className="space-y-6 pt-4">
                {campaignContent}
              </TabsContent>
              <TabsContent value="gmv_max" className="space-y-6 pt-4">
                {gmvMaxContent}
              </TabsContent>
            </Tabs>
          )
        }

        // 하나만 있거나 아직 데이터 없을 때
        return (
          <div className="space-y-6">
            {hasGmvMaxData ? gmvMaxContent : campaignContent}
            {!data && !isFetching && (
              <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
                계정을 선택하고 조회하기 버튼을 눌러주세요
              </div>
            )}
          </div>
        )
      })() : (filters.accountType === 'shopee_shopping' || filters.accountType === 'shopee_inapp') ? (
        <>
          {/* 쇼피: 쇼핑몰 + 인앱 각각 섹션 */}
          {!data && !isFetching && (
            <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
              계정을 선택하고 조회하기 버튼을 눌러주세요
            </div>
          )}

          {/* 쇼핑몰 섹션 */}
          {data && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold">쇼핑몰</h2>
              <KpiSection
                totals={data.shoppingTotals ?? null}
                accountType="shopee_shopping"
                selectedMetrics={selectedMetrics}
                onSelect={handleMetricSelect}
                isLoading={isFetching}
                shopeeExtra={data.shopeeExtra}
              />
              <div className="space-y-2">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  일별 추이
                </h3>
                <div className="bg-card rounded-lg border p-4">
                  <SummaryChart
                    data={data.shoppingDailyData ?? []}
                    selectedMetrics={selectedMetrics}
                    platform="shopee_shopping"
                  />
                </div>
              </div>
              <ShopeeShoppingAnalyticsCharts
                data={data.shoppingDailyData ?? []}
                hasKrw={data.shopeeExtra?.hasKrw ?? true}
                currency={data.shopeeExtra?.currency ?? null}
              />
            </div>
          )}

          {/* 인앱 섹션 */}
          {data && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold">인앱</h2>
              <KpiSection
                totals={data.inappTotals ?? null}
                accountType="shopee_inapp"
                selectedMetrics={selectedMetrics}
                onSelect={handleMetricSelect}
                isLoading={isFetching}
                shopeeExtra={data.shopeeExtra}
              />
              <div className="space-y-2">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  일별 추이
                </h3>
                <div className="bg-card rounded-lg border p-4">
                  <SummaryChart
                    data={data.inappDailyData ?? []}
                    selectedMetrics={selectedMetrics}
                    platform="shopee_inapp"
                  />
                </div>
              </div>
              <ShopeeInappAnalyticsCharts
                data={data.inappDailyData ?? []}
                hasKrw={data.shopeeExtra?.hasKrw ?? true}
                currency={data.shopeeExtra?.currency ?? null}
              />
            </div>
          )}
        </>
      ) : (filters.accountType === 'amazon_organic' || filters.accountType === 'amazon_ads' || filters.accountType === 'amazon_asin') ? (
        <>
          {/* Amazon: 통합 KPI + 오가닉 + 광고 섹션 */}
          {!data && !isFetching && (
            <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
              계정을 선택하고 조회하기 버튼을 눌러주세요
            </div>
          )}

          {data && data.platform === 'amazon' && (
            <div className="space-y-8">
              {/* 1. 통합 핵심 지표 */}
              <AmazonCombinedKpi
                totals={data.combinedTotals ?? null}
                isLoading={isFetching}
              />

              {/* 2. 오가닉 섹션 */}
              <div className="space-y-6">
                <h2 className="text-base font-semibold">📦 오가닉 (Organic)</h2>
                <KpiSection
                  totals={data.organicTotals ?? null}
                  accountType="amazon_organic"
                  selectedMetrics={selectedMetrics}
                  onSelect={handleMetricSelect}
                  isLoading={isFetching}
                  amazonExtra={data.amazonExtra}
                />
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                    일별 추이
                  </h3>
                  <div className="bg-card rounded-lg border p-4">
                    <SummaryChart
                      data={data.organicDailyData ?? []}
                      selectedMetrics={selectedMetrics}
                      platform="amazon_organic"
                    />
                  </div>
                </div>
                <AmazonOrganicAnalyticsCharts data={data.organicDailyData ?? []} />
              </div>

              {/* 3. 광고 섹션 */}
              <div className="space-y-6">
                <h2 className="text-base font-semibold">📢 광고 (Sponsored Ads)</h2>
                <AmazonAdsKpiSection
                  totals={data.adsTotals ?? null}
                  selectedMetrics={selectedAdsMetrics}
                  onSelect={handleAdsMetricSelect}
                  isLoading={isFetching}
                />
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                    일별 추이
                  </h3>
                  <div className="bg-card rounded-lg border p-4">
                    <AmazonAdsSummaryChart
                      data={data.adsDailyData ?? []}
                      selectedMetrics={selectedAdsMetrics}
                    />
                  </div>
                </div>
                <AmazonAdsAnalyticsCharts data={data.adsDailyData ?? []} />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Meta: 기존 단일 섹션 */}
          <KpiSection
            totals={data?.totals ?? null}
            accountType="meta"
            selectedMetrics={selectedMetrics}
            onSelect={handleMetricSelect}
            isLoading={isFetching}
          />

          <div className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              일별 추이
            </h3>
            {data ? (
              <div className="bg-card rounded-lg border p-4">
                <SummaryChart
                  data={data.dailyData}
                  selectedMetrics={selectedMetrics}
                  platform="meta"
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

          {data && <MetaAnalyticsCharts data={data.dailyData} />}
        </>
      )}
    </div>
  )
}
