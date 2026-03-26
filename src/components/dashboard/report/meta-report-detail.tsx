'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtDec, fmtKRW, fmtNum, fmtPct } from '@/lib/format'
import type {
  MetaCampaignData,
  MetaCreativeData,
  MetaMonthlyData,
  MetaReportData,
  MetaWeeklyData,
} from '@/types/database'
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

interface Props {
  data: MetaReportData
  title: string
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

function KpiCard({
  label,
  value,
  prev,
  curr,
  goodUp = true,
}: {
  label: string
  value: string
  prev: string
  curr: number | null
  goodUp?: boolean
}) {
  return (
    <Card>
      <CardContent className="px-4 pb-3 pt-4">
        <p className="mb-1 text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Prev: {prev}</span>
          <DeltaBadge curr={curr} prev={null} goodUp={goodUp} />
        </div>
      </CardContent>
    </Card>
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
          <MetaKpiCard label="매출" curr={m.revenue} prev={m.prev_revenue} format="krw" goodUp />
          <MetaKpiCard label="ROAS" curr={m.roas} prev={m.prev_roas} format="pct" goodUp />
          <MetaKpiCard label="구매(전환)수" curr={m.purchases} prev={m.prev_purchases} format="num" goodUp />
          <MetaKpiCard label="노출수" curr={m.impressions} prev={m.prev_impressions} format="num" goodUp />
          <MetaKpiCard label="도달수" curr={m.reach} prev={m.prev_reach} format="num" goodUp />
          <MetaKpiCard label="빈도" curr={m.frequency} prev={m.prev_frequency} format="dec" goodUp />
          <MetaKpiCard label="CPM" curr={m.cpm} prev={m.prev_cpm} format="krw" goodUp={false} />
          <MetaKpiCard label="클릭수" curr={m.clicks} prev={m.prev_clicks} format="num" goodUp />
          <MetaKpiCard label="클릭률(CTR)" curr={m.ctr} prev={m.prev_ctr} format="pct" goodUp />
          <MetaKpiCard label="클릭당 비용(CPC)" curr={m.cpc} prev={m.prev_cpc} format="krw" goodUp={false} />
          <MetaKpiCard label="장바구니 담기" curr={m.add_to_cart} prev={m.prev_add_to_cart} format="num" goodUp />
          <MetaKpiCard
            label="장바구니 담기당 비용"
            curr={m.cost_per_add_to_cart}
            prev={m.prev_cost_per_add_to_cart}
            format="krw"
            goodUp={false}
          />
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
      title: 'CPM & 노출수',
      barKey: 'impressions',
      barName: '노출수',
      lineKey: 'cpm',
      lineName: 'CPM',
      lineStroke: '#EF4444',
      lineLabel: '₩',
    },
    {
      title: 'CTR & 클릭수',
      barKey: 'clicks',
      barName: '클릭수',
      lineKey: 'ctr',
      lineName: 'CTR',
      lineStroke: '#3B82F6',
      lineLabel: '%',
    },
    {
      title: '장바구니 전환값 & 장바구니 담기',
      barKey: 'add_to_cart',
      barName: '장바구니 담기',
      lineKey: 'add_to_cart_value',
      lineName: '전환값',
      lineStroke: '#F59E0B',
      lineLabel: '₩',
    },
    {
      title: 'ROAS & 매출',
      barKey: 'revenue',
      barName: '매출',
      lineKey: 'roas',
      lineName: 'ROAS',
      lineStroke: '#10B981',
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
function CampaignTable({ campaigns }: { campaigns: MetaCampaignData[] }) {
  if (campaigns.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🎯 캠페인 성과 분석 (Meta)</CardTitle>
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
                    <TableCell className="sticky left-0 z-10 max-w-[200px] whitespace-nowrap bg-white font-medium after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
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
function CreativeCard({ creative, rank }: { creative: MetaCreativeData; rank: number }) {
  const thumbSrc = creative.thumbnail_url
    ? creative.thumbnail_url.includes('fbcdn.net') || creative.thumbnail_url.includes('cdninstagram.com')
      ? `/api/proxy/image?url=${encodeURIComponent(creative.thumbnail_url)}`
      : creative.thumbnail_url
    : null

  return (
    <Card className="overflow-hidden">
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ paddingBottom: '100%' }}>
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt={creative.ad_name}
            className="absolute inset-0 h-full w-full object-cover"
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
          <div>
            <p className="text-xs text-muted-foreground">지출금액</p>
            <p className="text-sm font-semibold">{fmtKRW(creative.spend)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">매출</p>
            <p className="text-sm font-bold text-emerald-600">{fmtKRW(creative.revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ROAS</p>
            <p className="text-sm font-bold text-blue-600">{fmtPct(creative.roas)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CPC</p>
            <p className="text-sm font-semibold">{fmtKRW(creative.cpc)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 섹션 6: 소재 성과
function CreativeSection({ creatives }: { creatives: MetaCreativeData[] }) {
  if (creatives.length === 0) return null

  const byCartValue = [...creatives]
    .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
    .slice(0, 3)

  const byRoas = [...creatives]
    .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
    .slice(0, 3)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🎨 소재 성과 분석 (Meta)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <p className="mb-3 text-sm font-semibold">구매전환값 Best 3 (전체 대상)</p>
          <div className="grid grid-cols-3 gap-4">
            {byCartValue.map((c, i) => (
              <CreativeCard key={c.ad_id} creative={c} rank={i + 1} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">ROAS Best 3 (전체 대상)</p>
          <div className="grid grid-cols-3 gap-4">
            {byRoas.map((c, i) => (
              <CreativeCard key={c.ad_id} creative={c} rank={i + 1} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────

export function MetaReportDetail({ data, title }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* 섹션 1: 리포트 제목 */}
      <Card>
        <CardContent className="py-8 text-center">
          <h1 className="text-2xl font-bold">{title}</h1>
        </CardContent>
      </Card>

      {/* 섹션 2: 월간 요약 */}
      <MonthlyKpi m={data.monthly} />

      {/* 섹션 3: 주간 차트 */}
      <WeeklyCharts weekly={data.weekly} />

      {/* 섹션 4: 주간 데이터 */}
      <WeeklyTable weekly={data.weekly} />

      {/* 섹션 5: 캠페인 성과 */}
      <CampaignTable campaigns={data.campaigns} />

      {/* 섹션 6: 소재 성과 */}
      <CreativeSection creatives={data.creatives} />
    </div>
  )
}
