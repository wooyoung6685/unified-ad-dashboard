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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fmtDec, fmtKRW, fmtNum, fmtPct } from '@/lib/format'
import type {
  GmvMaxCampaignRow,
  GmvMaxItemRow,
  GmvMaxMonthlyData,
  GmvMaxWeeklyData,
  TiktokAdRow,
  TiktokCampaignRow,
  TiktokMonthlyData,
  TiktokReportData,
  TiktokWeeklyData,
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
  data: TiktokReportData
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

function TiktokKpiCard({
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

// ── 순위 뱃지 ────────────────────────────────────

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

// ══════════════════════════════════════════════════
// 일반 TikTok 캠페인 섹션
// ══════════════════════════════════════════════════

// ── 섹션 1: 월간 KPI ─────────────────────────────

function MonthlyKpi({ m }: { m: TiktokMonthlyData }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📊 월간 요약 (TikTok)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          <TiktokKpiCard label="지출금액" curr={m.spend} prev={m.prev_spend} format="krw" goodUp={false} />
          <TiktokKpiCard label="매출" curr={m.revenue} prev={m.prev_revenue} format="krw" goodUp />
          <TiktokKpiCard label="ROAS" curr={m.roas} prev={m.prev_roas} format="pct" goodUp />
          <TiktokKpiCard label="전환수" curr={m.purchases} prev={m.prev_purchases} format="num" goodUp />
          <TiktokKpiCard label="노출수" curr={m.impressions} prev={m.prev_impressions} format="num" goodUp />
          <TiktokKpiCard label="도달수" curr={m.reach} prev={m.prev_reach} format="num" goodUp />
          <TiktokKpiCard label="CPM" curr={m.cpm} prev={m.prev_cpm} format="krw" goodUp={false} />
          <TiktokKpiCard label="클릭수" curr={m.clicks} prev={m.prev_clicks} format="num" goodUp />
          <TiktokKpiCard label="클릭률(CTR)" curr={m.ctr} prev={m.prev_ctr} format="pct" goodUp />
          <TiktokKpiCard label="클릭당 비용(CPC)" curr={m.cpc} prev={m.prev_cpc} format="krw" goodUp={false} />
        </div>
      </CardContent>
    </Card>
  )
}

// ── 섹션 2: 주간 차트 ─────────────────────────────

function WeeklyCharts({ weekly }: { weekly: TiktokWeeklyData[] }) {
  const chartData = weekly.map((w) => ({
    label: `${w.week}주차`,
    impressions: w.impressions,
    cpm: w.cpm,
    clicks: w.clicks,
    ctr: w.ctr,
    revenue: w.revenue,
    roas: w.roas,
    video_views: w.video_views,
    purchases: w.purchases,
    spend: w.spend,
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
      title: '동영상 조회수 & 전환수',
      barKey: 'purchases',
      barName: '전환수',
      lineKey: 'video_views',
      lineName: '동영상 조회수',
      lineStroke: '#8B5CF6',
      lineLabel: 'num',
    },
    {
      title: 'ROAS & 지출금액',
      barKey: 'spend',
      barName: '지출금액',
      lineKey: 'roas',
      lineName: 'ROAS',
      lineStroke: '#10B981',
      lineLabel: '%',
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📈 주간 차트 (TikTok)</CardTitle>
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
                          : String(Math.round(v))
                    }
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    width={55}
                    tickFormatter={(v: number) => {
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
                        if (cfg.lineLabel === 'num') return [Math.round(v).toLocaleString('ko-KR'), n]
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

// ── 섹션 3: 주간 데이터 테이블 ───────────────────

function WeeklyTable({ weekly }: { weekly: TiktokWeeklyData[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🗓️ 주간 데이터 (TikTok)</CardTitle>
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
                  <TableCell className="whitespace-nowrap font-medium">{w.week}주차</TableCell>
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

// ── 섹션 4/5: 캠페인 테이블 ─────────────────────

function CampaignSection({
  campaigns,
  title,
  emptyMessage = '🎵 틱톡 캠페인 데이터 준비 중...',
}: {
  campaigns: TiktokCampaignRow[]
  title: string
  emptyMessage?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 whitespace-nowrap bg-white after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                  캠페인명
                </TableHead>
                <TableHead className="whitespace-nowrap">지출금액</TableHead>
                <TableHead className="whitespace-nowrap">매출</TableHead>
                <TableHead className="whitespace-nowrap">ROAS</TableHead>
                <TableHead className="whitespace-nowrap">구매수</TableHead>
                <TableHead className="whitespace-nowrap">동영상 조회수</TableHead>
                <TableHead className="whitespace-nowrap">클릭수</TableHead>
                <TableHead className="whitespace-nowrap">CPC</TableHead>
                <TableHead className="whitespace-nowrap">노출수</TableHead>
                <TableHead className="whitespace-nowrap">도달수</TableHead>
                <TableHead className="whitespace-nowrap">CPM</TableHead>
                <TableHead className="whitespace-nowrap">클릭률(CTR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.campaign_id}>
                  <TableCell className="sticky left-0 z-10 max-w-[200px] whitespace-nowrap bg-white font-medium after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                    <span className="block truncate" title={c.campaign_name}>
                      {c.campaign_name}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(c.spend)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(c.revenue)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(c.roas)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(c.purchases)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(c.video_views)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(c.clicks)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(c.cpc)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(c.impressions)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(c.reach)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(c.cpm)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(c.ctr)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── 섹션 6: 소재 성과 ────────────────────────────

function TiktokCreativeCard({ ad, rank }: { ad: TiktokAdRow; rank: number }) {
  const thumbSrc = ad.thumbnail_url
    ? ad.thumbnail_url.includes('ibyteimg.com') || ad.thumbnail_url.includes('tiktokcdn.com')
      ? `/api/proxy/image?url=${encodeURIComponent(ad.thumbnail_url)}`
      : ad.thumbnail_url
    : null

  return (
    <Card className="overflow-hidden">
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ paddingBottom: '100%' }}>
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt={ad.ad_name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <span className="text-2xl">🎵</span>
            <span className="text-xs">이미지 없음</span>
          </div>
        )}
        <div className="absolute left-2 top-2">
          <RankBadge rank={rank} />
        </div>
      </div>
      <CardContent className="px-3 pb-3 pt-2">
        <p className="mb-0.5 truncate text-xs text-muted-foreground">{ad.campaign_name}</p>
        <p className="mb-2 line-clamp-2 text-sm font-medium">{ad.ad_name}</p>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3">
          <div>
            <p className="text-xs text-muted-foreground">지출금액</p>
            <p className="text-sm font-semibold">{fmtKRW(ad.spend)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">매출</p>
            <p className="text-sm font-bold text-emerald-600">{fmtKRW(ad.revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ROAS</p>
            <p className="text-sm font-bold text-blue-600">{fmtPct(ad.roas)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">구매수</p>
            <p className="text-sm font-semibold">{fmtNum(ad.purchases)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">동영상 조회수</p>
            <p className="text-sm font-semibold">{fmtNum(ad.video_views)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CreativeSection({ ads }: { ads: TiktokAdRow[] }) {
  if (ads.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🎨 소재 성과 분석 (TikTok)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-sm text-muted-foreground">
            🎵 틱톡 소재 분석 준비 중...
          </div>
        </CardContent>
      </Card>
    )
  }

  const byRevenue = [...ads].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0)).slice(0, 3)
  const byRoas = [...ads].sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0)).slice(0, 3)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🎨 소재 성과 분석 (TikTok)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">

        {/* 매출 Best 3 */}
        <div>
          <p className="mb-3 text-sm font-semibold">매출 Best 3 (전체 대상)</p>
          <div className="grid grid-cols-3 gap-4">
            {byRevenue.map((ad, i) => (
              <TiktokCreativeCard key={ad.ad_id} ad={ad} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* ROAS Best 3 */}
        <div>
          <p className="mb-3 text-sm font-semibold">ROAS Best 3 (전체 대상)</p>
          <div className="grid grid-cols-3 gap-4">
            {byRoas.map((ad, i) => (
              <TiktokCreativeCard key={ad.ad_id} ad={ad} rank={i + 1} />
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════════════
// GMV Max 전용 섹션
// ══════════════════════════════════════════════════

// ── GMV Max 월간 KPI ─────────────────────────────

function GmvMaxMonthlyKpi({ m }: { m: GmvMaxMonthlyData }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📊 월간 요약 (GMV Max)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          <TiktokKpiCard label="비용" curr={m.cost} prev={m.prev_cost} format="krw" goodUp={false} />
          <TiktokKpiCard label="매출" curr={m.gross_revenue} prev={m.prev_gross_revenue} format="krw" goodUp />
          <TiktokKpiCard label="ROI" curr={m.roi} prev={m.prev_roi} format="pct" goodUp />
          <TiktokKpiCard label="주문수" curr={m.orders} prev={m.prev_orders} format="num" goodUp />
          <TiktokKpiCard label="주문당 비용" curr={m.cost_per_order} prev={m.prev_cost_per_order} format="krw" goodUp={false} />
        </div>
      </CardContent>
    </Card>
  )
}

// ── GMV Max 주간 차트 ─────────────────────────────

function GmvMaxWeeklyCharts({ weekly }: { weekly: GmvMaxWeeklyData[] }) {
  const chartData = weekly.map((w) => ({
    label: `${w.week}주차`,
    cost: w.cost,
    gross_revenue: w.gross_revenue,
    roi: w.roi,
    orders: w.orders,
  }))

  const chartConfigs = [
    {
      title: 'ROI & 비용',
      barKey: 'cost',
      barName: '비용',
      lineKey: 'roi',
      lineName: 'ROI',
      lineStroke: '#10B981',
      lineLabel: '%',
    },
    {
      title: '주문수 & 매출',
      barKey: 'orders',
      barName: '주문수',
      lineKey: 'gross_revenue',
      lineName: '매출',
      lineStroke: '#3B82F6',
      lineLabel: '₩',
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📈 주간 차트 (GMV Max)</CardTitle>
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
                          : String(Math.round(v))
                    }
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    width={55}
                    tickFormatter={(v: number) => {
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

// ── GMV Max 주간 테이블 ───────────────────────────

function GmvMaxWeeklyTable({ weekly }: { weekly: GmvMaxWeeklyData[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🗓️ 주간 데이터 (GMV Max)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">주차</TableHead>
                <TableHead className="whitespace-nowrap">날짜</TableHead>
                <TableHead className="whitespace-nowrap">비용</TableHead>
                <TableHead className="whitespace-nowrap">매출</TableHead>
                <TableHead className="whitespace-nowrap">ROI</TableHead>
                <TableHead className="whitespace-nowrap">주문수</TableHead>
                <TableHead className="whitespace-nowrap">주문당 비용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekly.map((w) => (
                <TableRow key={w.week}>
                  <TableCell className="whitespace-nowrap font-medium">{w.week}주차</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{w.date_range}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.cost)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.gross_revenue)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(w.roi)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(w.orders)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.cost_per_order)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ── GMV Max 캠페인 테이블 ────────────────────────

function GmvMaxCampaignSection({ campaigns }: { campaigns: GmvMaxCampaignRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🎯 캠페인 성과 분석 (GMV Max)</CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            GMV Max 캠페인 데이터가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 whitespace-nowrap bg-white after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                    캠페인명
                  </TableHead>
                  <TableHead className="whitespace-nowrap">비용</TableHead>
                  <TableHead className="whitespace-nowrap">매출</TableHead>
                  <TableHead className="whitespace-nowrap">ROI</TableHead>
                  <TableHead className="whitespace-nowrap">주문수</TableHead>
                  <TableHead className="whitespace-nowrap">주문당 비용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.campaign_id}>
                    <TableCell className="sticky left-0 z-10 max-w-[200px] whitespace-nowrap bg-white font-medium after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                      <span className="block truncate" title={c.campaign_name ?? c.campaign_id}>
                        {c.campaign_name ?? c.campaign_id}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{fmtKRW(c.cost)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtKRW(c.gross_revenue)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtPct(c.roi)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtNum(c.orders)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtKRW(c.cost_per_order)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── GMV Max 소재(item) 카드 ──────────────────────

function GmvMaxItemCard({ item, rank }: { item: GmvMaxItemRow; rank: number }) {
  const thumbSrc = item.thumbnail_url
    ? item.thumbnail_url.includes('ibyteimg.com') || item.thumbnail_url.includes('tiktokcdn.com')
      ? `/api/proxy/image?url=${encodeURIComponent(item.thumbnail_url)}`
      : item.thumbnail_url
    : null

  return (
    <Card className="overflow-hidden">
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ paddingBottom: '100%' }}>
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt={item.item_id}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <span className="text-2xl">🛒</span>
            <span className="text-xs">이미지 없음</span>
          </div>
        )}
        <div className="absolute left-2 top-2">
          <RankBadge rank={rank} />
        </div>
      </div>
      <CardContent className="px-3 pb-3 pt-2">
        {item.title ? (
          <p className="mb-2 line-clamp-2 text-sm font-medium">{item.title}</p>
        ) : (
          <p className="mb-2 truncate text-xs text-muted-foreground">ID: {item.item_id}</p>
        )}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3">
          <div>
            <p className="text-xs text-muted-foreground">비용</p>
            <p className="text-sm font-semibold">{fmtKRW(item.cost)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">매출</p>
            <p className="text-sm font-bold text-emerald-600">{fmtKRW(item.gross_revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ROI</p>
            <p className="text-sm font-bold text-blue-600">{fmtPct(item.roi)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">주문수</p>
            <p className="text-sm font-semibold">{fmtNum(item.orders)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function GmvMaxCreativeSection({ items }: { items: GmvMaxItemRow[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🎨 소재 성과 분석 (GMV Max)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-sm text-muted-foreground">
            🛒 GMV Max 소재 데이터 준비 중...
          </div>
        </CardContent>
      </Card>
    )
  }

  const byRevenue = [...items].sort((a, b) => (b.gross_revenue ?? 0) - (a.gross_revenue ?? 0)).slice(0, 3)
  const byRoi = [...items].sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0)).slice(0, 3)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🎨 소재 성과 분석 (GMV Max)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">

        {/* 매출 Best 3 */}
        <div>
          <p className="mb-3 text-sm font-semibold">매출 Best 3</p>
          <div className="grid grid-cols-3 gap-4">
            {byRevenue.map((item, i) => (
              <GmvMaxItemCard key={item.item_id} item={item} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* ROI Best 3 */}
        <div>
          <p className="mb-3 text-sm font-semibold">ROI Best 3</p>
          <div className="grid grid-cols-3 gap-4">
            {byRoi.map((item, i) => (
              <GmvMaxItemCard key={item.item_id} item={item} rank={i + 1} />
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════

export function TiktokReportDetail({ data, title }: Props) {
  const {
    monthly,
    weekly,
    campaigns,
    ads,
    hasGmvMax,
    gmvMaxMonthly,
    gmvMaxWeekly,
    gmvMaxCampaigns,
    gmvMaxItems,
  } = data

  const normalCampaigns = campaigns.filter((c) => !c.isGmvMax)
  const showGmvMaxTab = hasGmvMax && gmvMaxMonthly != null

  // GMV Max 데이터가 없으면 기존 레이아웃 유지
  if (!showGmvMaxTab) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <MonthlyKpi m={monthly} />
        <WeeklyCharts weekly={weekly} />
        <WeeklyTable weekly={weekly} />
        <CampaignSection campaigns={normalCampaigns} title="🎯 캠페인 성과 분석 (TikTok)" />
        <CreativeSection ads={ads} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">{title}</h2>

      <Tabs defaultValue="normal">
        <TabsList className="mb-2">
          <TabsTrigger value="normal">일반 캠페인</TabsTrigger>
          <TabsTrigger value="gmvmax">GMV Max</TabsTrigger>
        </TabsList>

        {/* 일반 캠페인 탭 */}
        <TabsContent value="normal" className="flex flex-col gap-6">
          <MonthlyKpi m={monthly} />
          <WeeklyCharts weekly={weekly} />
          <WeeklyTable weekly={weekly} />
          <CampaignSection campaigns={normalCampaigns} title="🎯 캠페인 성과 분석 (TikTok)" />
          <CreativeSection ads={ads} />
        </TabsContent>

        {/* GMV Max 탭 */}
        <TabsContent value="gmvmax" className="flex flex-col gap-6">
          <GmvMaxMonthlyKpi m={gmvMaxMonthly} />
          <GmvMaxWeeklyCharts weekly={gmvMaxWeekly ?? []} />
          <GmvMaxWeeklyTable weekly={gmvMaxWeekly ?? []} />
          <GmvMaxCampaignSection campaigns={gmvMaxCampaigns ?? []} />
          <GmvMaxCreativeSection items={gmvMaxItems ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
