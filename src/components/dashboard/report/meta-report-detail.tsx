'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtDec, fmtKRW, fmtNum, fmtPct, formatMetricValue } from '@/lib/format'
import {
  DEFAULT_META_WIDGETS,
  META_FILTER_OPTIONS,
  META_RANK_OPTIONS,
  applyWidgetConfig,
  getCardMetrics,
  getWidgetAutoTitle,
  getWidgetSubtitle,
} from '@/lib/creative-widget-defaults'
import type {
  CreativeWidgetConfig,
  MetaAdsetData,
  MetaCampaignData,
  MetaCreativeData,
  MetaMonthlyData,
  MetaReportData,
  MetaWeeklyData,
  ReportFilters,
  SectionInsights,
} from '@/types/database'
import { META_SECTION_KEYS } from '@/lib/reports/section-keys'
import { Settings, SlidersHorizontal, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useRepairThumbnails } from '@/hooks/use-reports'
import { SectionInsightCard } from './section-insight-card'
import { SectionVisibilityWrapper } from './section-visibility-wrapper'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CreativeWidgetDialog } from './creative-widget-dialog'
import { FilterDialog } from './filter-dialog'

interface Props {
  data: MetaReportData
  title: string
  role?: 'admin' | 'viewer'
  reportId?: string
  filters?: ReportFilters | null
  sectionInsights?: SectionInsights
  titleAction?: ReactNode
}

// ── 헬퍼 ─────────────────────────────────────────

function calcChange(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

function DeltaBadge({
  curr,
  prev,
  goodUp = true,
}: {
  curr: number | null
  prev: number | null
  goodUp?: boolean
}) {
  const pct = calcChange(curr, prev)
  if (pct == null) return <span className="text-xs text-muted-foreground">-</span>
  const up = pct >= 0
  const isGood = goodUp ? up : !up
  return (
    <span className={`text-xs font-medium ${isGood ? 'text-green-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// DeltaBadge를 prev 값 기반으로 사용하는 전용 카드
function MetaKpiCard({
  label,
  curr,
  prev,
  format,
  goodUp = true,
}: {
  label: string
  curr: number | null
  prev: number | null
  format: 'krw' | 'num' | 'pct' | 'dec'
  goodUp?: boolean
}) {
  const fmt = (v: number | null) => {
    if (format === 'krw') return fmtKRW(v)
    if (format === 'num') return fmtNum(v)
    if (format === 'pct') return fmtPct(v)
    return fmtDec(v)
  }
  return (
    <Card>
      <CardContent className="px-4 pb-3 pt-4">
        <p className="mb-1 text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold leading-tight">{fmt(curr)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Prev: {fmt(prev)}</span>
          <DeltaBadge curr={curr} prev={prev} goodUp={goodUp} />
        </div>
      </CardContent>
    </Card>
  )
}

// ── 섹션 컴포넌트 ──────────────────────────────────

// 섹션 2: 월간 KPI
function MonthlyKpi({ m }: { m: MetaMonthlyData }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📊 월간 요약 (Meta)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          <MetaKpiCard label="지출금액" curr={m.spend} prev={m.prev_spend} format="krw" goodUp={false} />
          <MetaKpiCard label="구매전환값" curr={m.revenue} prev={m.prev_revenue} format="krw" goodUp />
          <MetaKpiCard label="ROAS" curr={m.roas} prev={m.prev_roas} format="pct" goodUp />
          <MetaKpiCard label="구매전환수" curr={m.purchases} prev={m.prev_purchases} format="num" goodUp />
          <MetaKpiCard label="장바구니 담기" curr={m.add_to_cart} prev={m.prev_add_to_cart} format="num" goodUp />
          <MetaKpiCard label="노출수" curr={m.impressions} prev={m.prev_impressions} format="num" goodUp />
          <MetaKpiCard label="도달" curr={m.reach} prev={m.prev_reach} format="num" goodUp />
          <MetaKpiCard label="빈도" curr={m.frequency} prev={m.prev_frequency} format="dec" goodUp />
          <MetaKpiCard label="CPM" curr={m.cpm} prev={m.prev_cpm} format="krw" goodUp={false} />
          <MetaKpiCard label="클릭수" curr={m.clicks} prev={m.prev_clicks} format="num" goodUp />
          <MetaKpiCard label="CTR (클릭률)" curr={m.ctr} prev={m.prev_ctr} format="pct" goodUp />
          <MetaKpiCard label="CPC (클릭당 비용)" curr={m.cpc} prev={m.prev_cpc} format="krw" goodUp={false} />
        </div>
      </CardContent>
    </Card>
  )
}

// 섹션 3: 주간 차트
function WeeklyCharts({ weekly }: { weekly: MetaWeeklyData[] }) {
  const chartData = weekly.map((w) => ({
    label: `${w.week}주차`,
    impressions: w.impressions,
    cpm: w.cpm,
    clicks: w.clicks,
    ctr: w.ctr,
    add_to_cart: w.add_to_cart,
    add_to_cart_value: w.add_to_cart_value,
    revenue: w.revenue,
    roas: w.roas,
  }))

  const chartConfigs = [
    {
      title: 'ROAS vs 매출',
      barKey: 'revenue',
      barName: '매출',
      lineKey: 'roas',
      lineName: 'ROAS',
      lineStroke: '#10B981',
      lineLabel: '%',
    },
    {
      title: '구매전환값 vs 장바구니 담기',
      barKey: 'add_to_cart',
      barName: '장바구니 담기',
      lineKey: 'revenue',
      lineName: '구매전환값',
      lineStroke: '#F59E0B',
      lineLabel: '₩',
    },
    {
      title: 'CPM vs 노출',
      barKey: 'impressions',
      barName: '노출',
      lineKey: 'cpm',
      lineName: 'CPM',
      lineStroke: '#EF4444',
      lineLabel: '₩',
    },
    {
      title: 'CTR vs 클릭',
      barKey: 'clicks',
      barName: '클릭',
      lineKey: 'ctr',
      lineName: 'CTR',
      lineStroke: '#3B82F6',
      lineLabel: '%',
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📈 주간 차트 (Meta)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {chartConfigs.map((cfg) => (
            <div key={cfg.title}>
              <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
                {cfg.title}
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tick={{ fontSize: 11 }}
                    width={60}
                    tickFormatter={(v: number) =>
                      v >= 1000000
                        ? `${(v / 1000000).toFixed(1)}M`
                        : v >= 1000
                          ? `${(v / 1000).toFixed(0)}K`
                          : String(v)
                    }
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    width={55}
                    tickFormatter={(v: number) => {
                      if (cfg.lineLabel === '%') return `${v.toFixed(1)}%`
                      if (cfg.lineLabel === '₩')
                        return v >= 1000 ? `₩${(v / 1000).toFixed(0)}K` : `₩${Math.round(v)}`
                      return v.toFixed(1)
                    }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const v = Number(value)
                      const n = String(name)
                      if (n === cfg.lineName) {
                        if (cfg.lineLabel === '%') return [`${v.toFixed(2)}%`, n]
                        if (cfg.lineLabel === '₩')
                          return [`₩${Math.round(v).toLocaleString('ko-KR')}`, n]
                      }
                      return [Math.round(v).toLocaleString('ko-KR'), n]
                    }}
                  />
                  <Legend verticalAlign="top" height={30} />
                  <Bar
                    yAxisId="left"
                    dataKey={cfg.barKey}
                    name={cfg.barName}
                    fill="#9CA3AF"
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    dataKey={cfg.lineKey}
                    name={cfg.lineName}
                    stroke={cfg.lineStroke}
                    dot={{ r: 4 }}
                    type="monotone"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// 섹션 4: 주간 데이터 테이블
function WeeklyTable({ weekly }: { weekly: MetaWeeklyData[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🗓️ 주간 데이터 (Meta)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">주차</TableHead>
                <TableHead className="whitespace-nowrap">날짜</TableHead>
                <TableHead className="whitespace-nowrap">지출금액</TableHead>
                <TableHead className="whitespace-nowrap">장바구니 담기</TableHead>
                <TableHead className="whitespace-nowrap">장바구니 전환값</TableHead>
                <TableHead className="whitespace-nowrap">구매(전환)수</TableHead>
                <TableHead className="whitespace-nowrap">매출</TableHead>
                <TableHead className="whitespace-nowrap">ROAS</TableHead>
                <TableHead className="whitespace-nowrap">노출수</TableHead>
                <TableHead className="whitespace-nowrap">도달수</TableHead>
                <TableHead className="whitespace-nowrap">빈도</TableHead>
                <TableHead className="whitespace-nowrap">CPM</TableHead>
                <TableHead className="whitespace-nowrap">클릭수</TableHead>
                <TableHead className="whitespace-nowrap">클릭당 비용(CPC)</TableHead>
                <TableHead className="whitespace-nowrap">클릭률(CTR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekly.map((w) => (
                <TableRow key={w.week}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {w.week}주차
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{w.date_range}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.spend)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(w.add_to_cart)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.add_to_cart_value)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(w.purchases)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.revenue)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(w.roas)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(w.impressions)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(w.reach)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDec(w.frequency)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.cpm)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(w.clicks)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.cpc)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(w.ctr)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// 캠페인 테이블 셀 (현재값 + 전월값 + 증감)
function CampCell({
  curr,
  prev,
  format,
  goodUp = true,
}: {
  curr: number | null
  prev: number | null
  format: 'krw' | 'num' | 'pct' | 'dec'
  goodUp?: boolean
}) {
  // curr: null이면 krw/num은 0으로, pct/dec(ROAS 등)는 "-" 유지
  // prev: null이면 항상 "-" 유지 (Prev: - 표시)
  const fmtValue = (v: number | null, isPrev = false) => {
    if (!isPrev && v == null) {
      if (format === 'krw') return fmtKRW(0)
      if (format === 'num') return fmtNum(0)
    }
    if (format === 'krw') return fmtKRW(v)
    if (format === 'num') return fmtNum(v)
    if (format === 'pct') return fmtPct(v)
    return fmtDec(v)
  }
  return (
    <TableCell className="whitespace-nowrap">
      <div className="flex flex-col gap-0.5">
        <span>{fmtValue(curr)}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Prev: {fmtValue(prev, true)}</span>
          <DeltaBadge curr={curr} prev={prev} goodUp={goodUp} />
        </div>
      </div>
    </TableCell>
  )
}

// 섹션 5: 캠페인 성과
function CampaignTable({
  campaigns,
  onFilterClick,
  headerAction,
}: {
  campaigns: MetaCampaignData[]
  onFilterClick?: () => void
  headerAction?: ReactNode
}) {
  if (campaigns.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">🎯 캠페인 성과 분석 (Meta)</CardTitle>
          <div className="flex items-center gap-2">
            {headerAction}
            {onFilterClick && (
              <Button variant="outline" size="sm" onClick={onFilterClick}>
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                필터
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 whitespace-nowrap bg-white after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                  캠페인명
                </TableHead>
                <TableHead className="whitespace-nowrap">지출금액</TableHead>
                <TableHead className="whitespace-nowrap">장바구니 담기</TableHead>
                <TableHead className="whitespace-nowrap">장바구니 담기당 비용</TableHead>
                <TableHead className="whitespace-nowrap">장바구니 전환값</TableHead>
                <TableHead className="whitespace-nowrap">구매(전환)수</TableHead>
                <TableHead className="whitespace-nowrap">매출</TableHead>
                <TableHead className="whitespace-nowrap">ROAS</TableHead>
                <TableHead className="whitespace-nowrap">노출수</TableHead>
                <TableHead className="whitespace-nowrap">도달수</TableHead>
                <TableHead className="whitespace-nowrap">빈도</TableHead>
                <TableHead className="whitespace-nowrap">CPC</TableHead>
                <TableHead className="whitespace-nowrap">클릭률(CTR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                // cost_per_add_to_cart가 null이면 spend/add_to_cart로 직접 계산
                const costPerCart =
                  c.cost_per_add_to_cart ??
                  (c.spend != null && c.add_to_cart != null && c.add_to_cart > 0
                    ? c.spend / c.add_to_cart
                    : null)
                const prevCostPerCart =
                  c.prev_cost_per_add_to_cart ??
                  (c.prev_spend != null && c.prev_add_to_cart != null && c.prev_add_to_cart > 0
                    ? c.prev_spend / c.prev_add_to_cart
                    : null)
                return (
                  <TableRow key={c.campaign_id}>
                    <TableCell className="sticky left-0 z-10 max-w-50 whitespace-nowrap bg-white font-medium after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                      <span className="block truncate" title={c.campaign_name}>
                        {c.campaign_name}
                      </span>
                    </TableCell>
                    <CampCell curr={c.spend} prev={c.prev_spend} format="krw" goodUp={false} />
                    <CampCell curr={c.add_to_cart} prev={c.prev_add_to_cart} format="num" goodUp />
                    <CampCell curr={costPerCart} prev={prevCostPerCart} format="krw" goodUp={false} />
                    <CampCell curr={c.add_to_cart_value} prev={null} format="krw" goodUp />
                    <CampCell curr={c.purchases} prev={c.prev_purchases} format="num" goodUp />
                    <CampCell curr={c.revenue} prev={c.prev_revenue} format="krw" goodUp />
                    <CampCell curr={c.roas ?? 0} prev={c.prev_roas} format="pct" goodUp />
                    <CampCell curr={c.impressions} prev={c.prev_impressions} format="num" goodUp />
                    <CampCell curr={c.reach} prev={c.prev_reach} format="num" goodUp />
                    <CampCell curr={c.frequency} prev={c.prev_frequency} format="dec" goodUp />
                    <CampCell curr={c.cpc} prev={c.prev_cpc} format="krw" goodUp={false} />
                    <CampCell curr={c.ctr} prev={c.prev_ctr} format="pct" goodUp />
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// 섹션 6: 광고세트 성과
function AdsetTable({
  adsets,
  onFilterClick,
  headerAction,
}: {
  adsets: MetaAdsetData[]
  onFilterClick?: () => void
  headerAction?: ReactNode
}) {
  if (adsets.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">📂 광고세트 성과 분석 (Meta)</CardTitle>
          <div className="flex items-center gap-2">
            {headerAction}
            {onFilterClick && (
              <Button variant="outline" size="sm" onClick={onFilterClick}>
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                필터
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 whitespace-nowrap bg-white after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                  광고세트명
                </TableHead>
                <TableHead className="whitespace-nowrap">캠페인명</TableHead>
                <TableHead className="whitespace-nowrap">지출금액</TableHead>
                <TableHead className="whitespace-nowrap">장바구니 담기</TableHead>
                <TableHead className="whitespace-nowrap">장바구니 담기당 비용</TableHead>
                <TableHead className="whitespace-nowrap">장바구니 전환값</TableHead>
                <TableHead className="whitespace-nowrap">구매(전환)수</TableHead>
                <TableHead className="whitespace-nowrap">매출</TableHead>
                <TableHead className="whitespace-nowrap">ROAS</TableHead>
                <TableHead className="whitespace-nowrap">노출수</TableHead>
                <TableHead className="whitespace-nowrap">도달수</TableHead>
                <TableHead className="whitespace-nowrap">빈도</TableHead>
                <TableHead className="whitespace-nowrap">CPC</TableHead>
                <TableHead className="whitespace-nowrap">클릭률(CTR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adsets.map((a) => {
                const costPerCart =
                  a.cost_per_add_to_cart ??
                  (a.spend != null && a.add_to_cart != null && a.add_to_cart > 0
                    ? a.spend / a.add_to_cart
                    : null)
                const prevCostPerCart =
                  a.prev_cost_per_add_to_cart ??
                  (a.prev_spend != null && a.prev_add_to_cart != null && a.prev_add_to_cart > 0
                    ? a.prev_spend / a.prev_add_to_cart
                    : null)
                return (
                  <TableRow key={a.adset_id}>
                    <TableCell className="sticky left-0 z-10 max-w-50 whitespace-nowrap bg-white font-medium after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                      <span className="block truncate" title={a.adset_name}>
                        {a.adset_name}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-40 whitespace-nowrap">
                      <span className="block truncate text-xs text-muted-foreground" title={a.campaign_name}>
                        {a.campaign_name}
                      </span>
                    </TableCell>
                    <CampCell curr={a.spend} prev={a.prev_spend} format="krw" goodUp={false} />
                    <CampCell curr={a.add_to_cart} prev={a.prev_add_to_cart} format="num" goodUp />
                    <CampCell curr={costPerCart} prev={prevCostPerCart} format="krw" goodUp={false} />
                    <CampCell curr={a.add_to_cart_value} prev={null} format="krw" goodUp />
                    <CampCell curr={a.purchases} prev={a.prev_purchases} format="num" goodUp />
                    <CampCell curr={a.revenue} prev={a.prev_revenue} format="krw" goodUp />
                    <CampCell curr={a.roas ?? 0} prev={a.prev_roas} format="pct" goodUp />
                    <CampCell curr={a.impressions} prev={a.prev_impressions} format="num" goodUp />
                    <CampCell curr={a.reach} prev={a.prev_reach} format="num" goodUp />
                    <CampCell curr={a.frequency} prev={a.prev_frequency} format="dec" goodUp />
                    <CampCell curr={a.cpc} prev={a.prev_cpc} format="krw" goodUp={false} />
                    <CampCell curr={a.ctr} prev={a.prev_ctr} format="pct" goodUp />
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// 순위 뱃지 색상
function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    2: 'bg-gray-100 text-gray-700 border-gray-300',
    3: 'bg-orange-100 text-orange-700 border-orange-300',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${styles[rank] ?? 'bg-gray-100 text-gray-600'}`}
    >
      #{rank}
    </span>
  )
}

// 소재 카드
function CreativeCard({
  creative,
  rank,
  rankBy,
}: {
  creative: MetaCreativeData
  rank: number
  rankBy: string
}) {
  const [imgError, setImgError] = useState(false)

  const thumbSrc = creative.thumbnail_url
    ? creative.thumbnail_url.includes('fbcdn.net') || creative.thumbnail_url.includes('cdninstagram.com')
      ? `/api/proxy/image?url=${encodeURIComponent(creative.thumbnail_url)}`
      : creative.thumbnail_url
    : null

  const metrics = getCardMetrics('meta', rankBy)

  return (
    <Card className="overflow-hidden">
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ paddingBottom: '100%' }}>
        {thumbSrc && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt={creative.ad_name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <span className="text-sm">이미지 없음</span>
          </div>
        )}
        <div className="absolute left-2 top-2">
          <RankBadge rank={rank} />
        </div>
      </div>
      <CardContent className="px-3 pb-3 pt-2">
        <p className="mb-0.5 truncate text-xs text-muted-foreground">{creative.campaign_name}</p>
        <p className="mb-2 line-clamp-2 text-sm font-medium">{creative.ad_name}</p>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3">
          {metrics.map((m) => (
            <div key={m.key}>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p
                className={[
                  'text-sm font-semibold',
                  m.highlight === 'emerald' ? 'font-bold text-emerald-600' : '',
                  m.highlight === 'blue' ? 'font-bold text-blue-600' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {formatMetricValue(
                  (creative[m.key as keyof MetaCreativeData] as number | null) ?? null,
                  m.format,
                )}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Meta 소재 지표 accessor
function metaMetricAccessor(item: MetaCreativeData, metric: string): number {
  const m = metric as keyof MetaCreativeData
  return (item[m] as number | null) ?? 0
}

// 섹션 6: 소재 성과
function CreativeSection({
  creatives,
  widgets,
  onWidgetsChange,
  isAdmin,
  reportId,
  headerAction,
}: {
  creatives: MetaCreativeData[]
  widgets: CreativeWidgetConfig[]
  onWidgetsChange: (widgets: CreativeWidgetConfig[]) => void
  isAdmin: boolean
  reportId?: string
  headerAction?: ReactNode
}) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<CreativeWidgetConfig | undefined>()
  const repairMutation = useRepairThumbnails()

  if (creatives.length === 0) return null

  const handleAdd = (config: CreativeWidgetConfig) => {
    if (widgets.length >= 10) return
    onWidgetsChange([...widgets, config])
  }

  const handleEdit = (config: CreativeWidgetConfig) => {
    onWidgetsChange(widgets.map((w) => (w.id === config.id ? config : w)))
  }

  const handleDelete = (id: string) => {
    onWidgetsChange(widgets.filter((w) => w.id !== id))
  }

  const openEdit = (widget: CreativeWidgetConfig) => {
    setEditingWidget(widget)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">🎨 소재 성과 분석 (Meta)</CardTitle>
          <div className="flex items-center gap-2">
            {headerAction}
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reportId && repairMutation.mutate({ id: reportId, section: 'meta' })}
                  disabled={!reportId || repairMutation.isPending}
                >
                  {repairMutation.isPending ? '복구 중...' : '🔧 썸네일 복구'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddDialogOpen(true)}
                  disabled={widgets.length >= 10}
                >
                  + 리스트 추가
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {widgets.map((widget) => {
          const items = applyWidgetConfig(creatives, widget, metaMetricAccessor)
          const displayTitle =
            widget.title ?? getWidgetAutoTitle(widget, META_RANK_OPTIONS)
          const subtitle = getWidgetSubtitle(widget)
          return (
            <div key={widget.id}>
              <div className="mb-3 flex items-center gap-2">
                <p className="text-sm font-semibold">
                  {displayTitle}
                </p>
                <span className="text-xs text-muted-foreground">({subtitle})</span>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => openEdit(widget)}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                      title="위젯 설정"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(widget.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="위젯 삭제"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">조건에 맞는 소재가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {items.map((c, i) => (
                    <CreativeCard key={c.ad_id} creative={c} rank={i + 1} rankBy={widget.rankBy} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>

      {/* 위젯 추가 다이얼로그 */}
      <CreativeWidgetDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onApply={handleAdd}
        rankByOptions={META_RANK_OPTIONS}
        filterMetricOptions={META_FILTER_OPTIONS}
      />

      {/* 위젯 수정 다이얼로그 */}
      <CreativeWidgetDialog
        open={!!editingWidget}
        onOpenChange={(open) => { if (!open) setEditingWidget(undefined) }}
        onApply={handleEdit}
        initialConfig={editingWidget}
        rankByOptions={META_RANK_OPTIONS}
        filterMetricOptions={META_FILTER_OPTIONS}
      />
    </Card>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────

export function MetaReportDetail({
  data,
  title,
  role,
  reportId,
  filters: initialFilters,
  sectionInsights,
  titleAction,
}: Props) {
  const isAdmin = role === 'admin'
  const effectiveRole: 'admin' | 'viewer' = role ?? 'viewer'
  const insights = sectionInsights ?? {}

  // 필터 상태 (null = 전체 표시)
  const [campaignFilter, setCampaignFilter] = useState<string[] | null>(
    initialFilters?.meta_campaign_ids ?? null,
  )
  const [adsetFilter, setAdsetFilter] = useState<string[] | null>(
    initialFilters?.meta_adset_ids ?? null,
  )
  const [currentFilters, setCurrentFilters] = useState<ReportFilters>(initialFilters ?? {})
  const [creativeWidgets, setCreativeWidgets] = useState<CreativeWidgetConfig[]>(
    initialFilters?.meta_creative_widgets ?? DEFAULT_META_WIDGETS,
  )

  // 다이얼로그 열림 상태
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false)
  const [adsetDialogOpen, setAdsetDialogOpen] = useState(false)

  // 필터 저장 (PATCH API 호출)
  const saveFilters = async (updated: ReportFilters) => {
    if (!reportId) return
    await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: updated }),
    })
    setCurrentFilters(updated)
  }

  const handleCampaignApply = async (ids: string[] | null) => {
    setCampaignFilter(ids)
    await saveFilters({ ...currentFilters, meta_campaign_ids: ids })
  }

  const handleAdsetApply = async (ids: string[] | null) => {
    setAdsetFilter(ids)
    await saveFilters({ ...currentFilters, meta_adset_ids: ids })
  }

  const handleCreativeWidgetsChange = async (widgets: CreativeWidgetConfig[]) => {
    setCreativeWidgets(widgets)
    await saveFilters({ ...currentFilters, meta_creative_widgets: widgets })
  }

  // 필터 적용
  const filteredCampaigns = campaignFilter
    ? data.campaigns.filter((c) => campaignFilter.includes(c.campaign_id))
    : data.campaigns

  const allAdsets = data.adsets ?? []
  const filteredAdsets = adsetFilter
    ? allAdsets.filter((a) => adsetFilter.includes(a.adset_id))
    : allAdsets

  // 다이얼로그용 목록
  const campaignItems = data.campaigns.map((c) => ({ id: c.campaign_id, name: c.campaign_name }))
  const adsetItems = allAdsets.map((a) => ({ id: a.adset_id, name: a.adset_name }))

  return (
    <div className="flex flex-col gap-6">
      {/* 섹션 1: 리포트 제목 */}
      <Card className="relative">
        <CardContent className="py-8 text-center">
          <h1 className="text-2xl font-bold">{title}</h1>
        </CardContent>
        {titleAction && (
          <div className="absolute right-4 top-4">{titleAction}</div>
        )}
      </Card>

      {/* 섹션 2: 월간 요약 */}
      <SectionInsightCard
        reportId={reportId ?? ''}
        role={effectiveRole}
        sectionKey={META_SECTION_KEYS.monthly}
        defaultLabel="월간 요약 인사이트"
        initialEntry={insights[META_SECTION_KEYS.monthly]}
      >
        <MonthlyKpi m={data.monthly} />
      </SectionInsightCard>

      {/* 섹션 3: 주간 차트 */}
      <SectionInsightCard
        reportId={reportId ?? ''}
        role={effectiveRole}
        sectionKey={META_SECTION_KEYS.weeklyCharts}
        defaultLabel="주간 차트 인사이트"
        initialEntry={insights[META_SECTION_KEYS.weeklyCharts]}
      >
        <WeeklyCharts weekly={data.weekly} />
      </SectionInsightCard>

      {/* 섹션 4: 주간 데이터 */}
      <SectionInsightCard
        reportId={reportId ?? ''}
        role={effectiveRole}
        sectionKey={META_SECTION_KEYS.weeklyTable}
        defaultLabel="주간 데이터 인사이트"
        initialEntry={insights[META_SECTION_KEYS.weeklyTable]}
      >
        <WeeklyTable weekly={data.weekly} />
      </SectionInsightCard>

      {/* 섹션 5: 캠페인 성과 */}
      <SectionVisibilityWrapper
        reportId={reportId ?? ''}
        sectionKey={META_SECTION_KEYS.campaigns}
        label="캠페인 성과 분석 (Meta)"
        role={effectiveRole}
        hiddenSections={currentFilters?.hiddenSections ?? []}
        currentFilters={currentFilters}
      >
        <SectionInsightCard
          reportId={reportId ?? ''}
          role={effectiveRole}
          sectionKey={META_SECTION_KEYS.campaigns}
          defaultLabel="캠페인 성과 인사이트"
          initialEntry={insights[META_SECTION_KEYS.campaigns]}
        >
          {(addButton) => (
            <CampaignTable
              campaigns={filteredCampaigns}
              onFilterClick={isAdmin && campaignItems.length > 0 ? () => setCampaignDialogOpen(true) : undefined}
              headerAction={addButton}
            />
          )}
        </SectionInsightCard>
      </SectionVisibilityWrapper>

      {/* 섹션 6: 광고세트 성과 */}
      <SectionInsightCard
        reportId={reportId ?? ''}
        role={effectiveRole}
        sectionKey={META_SECTION_KEYS.adsets}
        defaultLabel="광고세트 성과 인사이트"
        initialEntry={insights[META_SECTION_KEYS.adsets]}
      >
        {(addButton) => (
          <AdsetTable
            adsets={filteredAdsets}
            onFilterClick={isAdmin && adsetItems.length > 0 ? () => setAdsetDialogOpen(true) : undefined}
            headerAction={addButton}
          />
        )}
      </SectionInsightCard>

      {/* 섹션 7: 소재 성과 */}
      <SectionInsightCard
        reportId={reportId ?? ''}
        role={effectiveRole}
        sectionKey={META_SECTION_KEYS.creatives}
        defaultLabel="소재 성과 인사이트"
        initialEntry={insights[META_SECTION_KEYS.creatives]}
      >
        {(addButton) => (
          <CreativeSection
            creatives={data.creatives}
            widgets={creativeWidgets}
            onWidgetsChange={handleCreativeWidgetsChange}
            isAdmin={isAdmin}
            reportId={reportId}
            headerAction={addButton}
          />
        )}
      </SectionInsightCard>

      {/* 캠페인 필터 다이얼로그 */}
      <FilterDialog
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        title="캠페인 선택"
        items={campaignItems}
        selectedIds={campaignFilter}
        onApply={handleCampaignApply}
      />

      {/* 광고세트 필터 다이얼로그 */}
      <FilterDialog
        open={adsetDialogOpen}
        onOpenChange={setAdsetDialogOpen}
        title="광고세트 선택"
        items={adsetItems}
        selectedIds={adsetFilter}
        onApply={handleAdsetApply}
      />
    </div>
  )
}
