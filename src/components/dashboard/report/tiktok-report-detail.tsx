'use client'

import { InsightMemoCard } from './insight-memo-card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fmtDec, fmtKRW, fmtNum, fmtPct } from '@/lib/format'
import {
  DEFAULT_GMVMAX_WIDGETS,
  DEFAULT_TIKTOK_WIDGETS,
  GMVMAX_FILTER_OPTIONS,
  GMVMAX_RANK_OPTIONS,
  TIKTOK_FILTER_OPTIONS,
  TIKTOK_RANK_OPTIONS,
  applyWidgetConfig,
  getWidgetAutoTitle,
  getWidgetSubtitle,
} from '@/lib/creative-widget-defaults'
import type {
  CreativeWidgetConfig,
  GmvMaxCampaignRow,
  GmvMaxItemRow,
  GmvMaxMonthlyData,
  GmvMaxWeeklyData,
  ReportFilters,
  TiktokAdRow,
  TiktokAdgroupRow,
  TiktokCampaignRow,
  TiktokMonthlyData,
  TiktokReportData,
  TiktokWeeklyData,
} from '@/types/database'
import { Settings, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
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
  data: TiktokReportData
  title: string
  reportId: string
  role: 'admin' | 'viewer'
  insightMemo: string | null
  insightMemoGmvMax: string | null
  filters?: ReportFilters | null
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
          <TiktokKpiCard label="노출수" curr={m.impressions} prev={m.prev_impressions} format="num" goodUp />
          <TiktokKpiCard label="도달수" curr={m.reach} prev={m.prev_reach} format="num" goodUp />
          <TiktokKpiCard label="클릭수(랜딩)" curr={m.clicks} prev={m.prev_clicks} format="num" goodUp />
          <TiktokKpiCard label="빈도" curr={m.frequency} prev={m.prev_frequency} format="dec" goodUp={false} />
          <TiktokKpiCard label="CPC" curr={m.cpc} prev={m.prev_cpc} format="krw" goodUp={false} />
          <TiktokKpiCard label="CTR" curr={m.ctr} prev={m.prev_ctr} format="pct" goodUp />
          <TiktokKpiCard label="CPM" curr={m.cpm} prev={m.prev_cpm} format="krw" goodUp={false} />
          <TiktokKpiCard label="동영상 조회수" curr={m.video_views} prev={m.prev_video_views} format="num" goodUp />
          <TiktokKpiCard label="2초 동영상 조회수" curr={m.views_2s} prev={m.prev_views_2s} format="num" goodUp />
          <TiktokKpiCard label="6초 동영상 조회수" curr={m.views_6s} prev={m.prev_views_6s} format="num" goodUp />
          <TiktokKpiCard label="25% 동영상 조회수" curr={m.views_25pct} prev={m.prev_views_25pct} format="num" goodUp />
          <TiktokKpiCard label="100% 동영상 조회수" curr={m.views_100pct} prev={m.prev_views_100pct} format="num" goodUp />
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
    video_views: w.video_views,
    views_2s: w.views_2s,
    views_6s: w.views_6s,
    views_25pct: w.views_25pct,
    views_100pct: w.views_100pct,
    ctr: w.ctr,
    clicks: w.clicks,
  }))

  const tickFmt = (v: number) =>
    v >= 1000000
      ? `${(v / 1000000).toFixed(1)}M`
      : v >= 1000
        ? `${(v / 1000).toFixed(0)}K`
        : String(Math.round(v))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📈 주간 차트 (TikTok)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* 차트 1 – 노출 vs 조회수 */}
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">노출 vs 조회수</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} width={60} tickFormatter={tickFmt} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={60} tickFormatter={tickFmt} />
                <Tooltip formatter={(v, n) => [Math.round(Number(v)).toLocaleString('ko-KR'), n]} />
                <Legend verticalAlign="bottom" height={30} />
                <Bar yAxisId="left" dataKey="impressions" name="노출수" fill="#D1D5DB" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" dataKey="video_views" name="동영상 조회수" stroke="#6366F1" dot={{ r: 4 }} type="monotone" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 차트 2 – 조회수 vs 2초 vs 6초 */}
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">조회수 vs 2초 vs 6초</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} width={60} tickFormatter={tickFmt} />
                <Tooltip formatter={(v, n) => [Math.round(Number(v)).toLocaleString('ko-KR'), n]} />
                <Legend verticalAlign="bottom" height={30} />
                <Bar yAxisId="left" dataKey="video_views" name="동영상 조회수" fill="#D1D5DB" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left" dataKey="views_2s" name="2초 조회수" fill="#06B6D4" radius={[2, 2, 0, 0]} />
                <Line yAxisId="left" dataKey="views_6s" name="6초 조회수" stroke="#6366F1" dot={{ r: 4 }} type="monotone" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 차트 3 – 6초 vs 25% vs 100% */}
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">6초 vs 25% vs 100%</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} width={60} tickFormatter={tickFmt} />
                <Tooltip formatter={(v, n) => [Math.round(Number(v)).toLocaleString('ko-KR'), n]} />
                <Legend verticalAlign="bottom" height={30} />
                <Bar yAxisId="left" dataKey="views_6s" name="6초 조회수" fill="#06B6D4" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left" dataKey="views_25pct" name="25% 조회수" fill="#10B981" radius={[2, 2, 0, 0]} />
                <Line yAxisId="left" dataKey="views_100pct" name="100% 조회수" stroke="#6366F1" dot={{ r: 4 }} type="monotone" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 차트 4 – CTR vs 클릭수(랜딩) */}
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">CTR vs 클릭수(랜딩)</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} width={60} tickFormatter={tickFmt} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={55} tickFormatter={(v: number) => `${v.toFixed(2)}%`} />
                <Tooltip
                  formatter={(v, n) => {
                    if (String(n) === 'CTR (랜딩)') return [`${Number(v).toFixed(2)}%`, n]
                    return [Math.round(Number(v)).toLocaleString('ko-KR'), n]
                  }}
                />
                <Legend verticalAlign="bottom" height={30} />
                <Bar yAxisId="left" dataKey="clicks" name="클릭수 (랜딩)" fill="#9CA3AF" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" dataKey="ctr" name="CTR (랜딩)" stroke="#6366F1" dot={{ r: 4 }} type="monotone" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
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
  onFilterClick,
}: {
  campaigns: TiktokCampaignRow[]
  title: string
  emptyMessage?: string
  onFilterClick?: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {onFilterClick && (
            <Button variant="outline" size="sm" onClick={onFilterClick}>
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              필터
            </Button>
          )}
        </div>
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
                <TableHead className="whitespace-nowrap">전환수</TableHead>
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
                  <TableCell className="sticky left-0 z-10 max-w-50 whitespace-nowrap bg-white font-medium after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                    <span className="block truncate" title={c.campaign_name}>
                      {c.campaign_name}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(c.spend)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(c.revenue)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(c.roas)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(c.purchases)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(c.conversions)}</TableCell>
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

// ── 섹션 5.5: 광고그룹(세트) 테이블 ─────────────────────

function AdgroupSection({
  adgroups,
  onFilterClick,
}: {
  adgroups: TiktokAdgroupRow[]
  onFilterClick?: () => void
}) {
  if (adgroups.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">📂 광고그룹 성과 분석 (TikTok)</CardTitle>
          {onFilterClick && (
            <Button variant="outline" size="sm" onClick={onFilterClick}>
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              필터
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 whitespace-nowrap bg-white after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                  광고그룹명
                </TableHead>
                <TableHead className="whitespace-nowrap">캠페인명</TableHead>
                <TableHead className="whitespace-nowrap">지출금액</TableHead>
                <TableHead className="whitespace-nowrap">매출</TableHead>
                <TableHead className="whitespace-nowrap">ROAS</TableHead>
                <TableHead className="whitespace-nowrap">구매수</TableHead>
                <TableHead className="whitespace-nowrap">전환수</TableHead>
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
              {adgroups.map((a) => (
                <TableRow key={a.adgroup_id}>
                  <TableCell className="sticky left-0 z-10 max-w-50 whitespace-nowrap bg-white font-medium after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
                    <span className="block truncate" title={a.adgroup_name}>
                      {a.adgroup_name}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-40 whitespace-nowrap">
                    <span className="block truncate text-xs text-muted-foreground" title={a.campaign_name}>
                      {a.campaign_name}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(a.spend)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(a.revenue)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(a.roas)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(a.purchases)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(a.conversions)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(a.video_views)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(a.clicks)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(a.cpc)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(a.impressions)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(a.reach)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(a.cpm)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(a.ctr)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
          <div>
            <p className="text-xs text-muted-foreground">전환수</p>
            <p className="text-sm font-semibold">{fmtNum(ad.conversions)}</p>
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

// TikTok 소재 지표 accessor
function tiktokMetricAccessor(item: TiktokAdRow, metric: string): number {
  const m = metric as keyof TiktokAdRow
  return (item[m] as number | null) ?? 0
}

function CreativeSection({
  ads,
  widgets,
  onWidgetsChange,
  isAdmin,
}: {
  ads: TiktokAdRow[]
  widgets: CreativeWidgetConfig[]
  onWidgetsChange: (widgets: CreativeWidgetConfig[]) => void
  isAdmin: boolean
}) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<CreativeWidgetConfig | undefined>()

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">🎨 소재 성과 분석 (TikTok)</CardTitle>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              disabled={widgets.length >= 10}
            >
              + 리스트 추가
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {widgets.map((widget) => {
          const items = applyWidgetConfig(ads, widget, tiktokMetricAccessor)
          const displayTitle = widget.title ?? getWidgetAutoTitle(widget, TIKTOK_RANK_OPTIONS)
          const subtitle = getWidgetSubtitle(widget)
          return (
            <div key={widget.id}>
              <div className="mb-3 flex items-center gap-2">
                <p className="text-sm font-semibold">{displayTitle}</p>
                <span className="text-xs text-muted-foreground">({subtitle})</span>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setEditingWidget(widget)}
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
                  {items.map((ad, i) => (
                    <TiktokCreativeCard key={ad.ad_id} ad={ad} rank={i + 1} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>

      <CreativeWidgetDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onApply={handleAdd}
        rankByOptions={TIKTOK_RANK_OPTIONS}
        filterMetricOptions={TIKTOK_FILTER_OPTIONS}
      />
      <CreativeWidgetDialog
        open={!!editingWidget}
        onOpenChange={(open) => { if (!open) setEditingWidget(undefined) }}
        onApply={handleEdit}
        initialConfig={editingWidget}
        rankByOptions={TIKTOK_RANK_OPTIONS}
        filterMetricOptions={TIKTOK_FILTER_OPTIONS}
      />
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

function GmvMaxCampaignSection({
  campaigns,
  onFilterClick,
}: {
  campaigns: GmvMaxCampaignRow[]
  onFilterClick?: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">🎯 캠페인 성과 분석 (GMV Max)</CardTitle>
          {onFilterClick && (
            <Button variant="outline" size="sm" onClick={onFilterClick}>
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              필터
            </Button>
          )}
        </div>
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
                    <TableCell className="sticky left-0 z-10 max-w-50 whitespace-nowrap bg-white font-medium after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border dark:bg-background">
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

// GMV Max 소재 지표 accessor
function gmvMaxMetricAccessor(item: GmvMaxItemRow, metric: string): number {
  const m = metric as keyof GmvMaxItemRow
  return (item[m] as number | null) ?? 0
}

function GmvMaxCreativeSection({
  items,
  widgets,
  onWidgetsChange,
  isAdmin,
}: {
  items: GmvMaxItemRow[]
  widgets: CreativeWidgetConfig[]
  onWidgetsChange: (widgets: CreativeWidgetConfig[]) => void
  isAdmin: boolean
}) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<CreativeWidgetConfig | undefined>()

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">🎨 소재 성과 분석 (GMV Max)</CardTitle>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              disabled={widgets.length >= 10}
            >
              + 리스트 추가
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {widgets.map((widget) => {
          const widgetItems = applyWidgetConfig(items, widget, gmvMaxMetricAccessor)
          const displayTitle = widget.title ?? getWidgetAutoTitle(widget, GMVMAX_RANK_OPTIONS)
          const subtitle = getWidgetSubtitle(widget)
          return (
            <div key={widget.id}>
              <div className="mb-3 flex items-center gap-2">
                <p className="text-sm font-semibold">{displayTitle}</p>
                <span className="text-xs text-muted-foreground">({subtitle})</span>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setEditingWidget(widget)}
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
              {widgetItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">조건에 맞는 소재가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {widgetItems.map((item, i) => (
                    <GmvMaxItemCard key={item.item_id} item={item} rank={i + 1} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>

      <CreativeWidgetDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onApply={handleAdd}
        rankByOptions={GMVMAX_RANK_OPTIONS}
        filterMetricOptions={GMVMAX_FILTER_OPTIONS}
      />
      <CreativeWidgetDialog
        open={!!editingWidget}
        onOpenChange={(open) => { if (!open) setEditingWidget(undefined) }}
        onApply={handleEdit}
        initialConfig={editingWidget}
        rankByOptions={GMVMAX_RANK_OPTIONS}
        filterMetricOptions={GMVMAX_FILTER_OPTIONS}
      />
    </Card>
  )
}

// ══════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════

export function TiktokReportDetail({
  data,
  title,
  reportId,
  role,
  insightMemo,
  insightMemoGmvMax,
  filters: initialFilters,
}: Props) {
  const isAdmin = role === 'admin'
  const {
    monthly,
    weekly,
    campaigns,
    adgroups,
    ads,
    hasGmvMax,
    gmvMaxMonthly,
    gmvMaxWeekly,
    gmvMaxCampaigns,
    gmvMaxItems,
  } = data

  const allNormalCampaigns = campaigns.filter((c) => !c.isGmvMax)
  const allAdgroups = adgroups ?? []
  const allGmvMaxCampaigns = gmvMaxCampaigns ?? []
  const showGmvMaxTab = hasGmvMax && gmvMaxMonthly != null

  // 필터 상태
  const [campaignFilter, setCampaignFilter] = useState<string[] | null>(
    initialFilters?.tiktok_campaign_ids ?? null,
  )
  const [adgroupFilter, setAdgroupFilter] = useState<string[] | null>(
    initialFilters?.tiktok_adgroup_ids ?? null,
  )
  const [gmvMaxCampaignFilter, setGmvMaxCampaignFilter] = useState<string[] | null>(
    initialFilters?.tiktok_gmvmax_campaign_ids ?? null,
  )
  const [currentFilters, setCurrentFilters] = useState<ReportFilters>(initialFilters ?? {})
  const [tiktokCreativeWidgets, setTiktokCreativeWidgets] = useState<CreativeWidgetConfig[]>(
    initialFilters?.tiktok_creative_widgets ?? DEFAULT_TIKTOK_WIDGETS,
  )
  const [gmvmaxCreativeWidgets, setGmvmaxCreativeWidgets] = useState<CreativeWidgetConfig[]>(
    initialFilters?.gmvmax_creative_widgets ?? DEFAULT_GMVMAX_WIDGETS,
  )

  // 다이얼로그 열림 상태
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false)
  const [adgroupDialogOpen, setAdgroupDialogOpen] = useState(false)
  const [gmvMaxDialogOpen, setGmvMaxDialogOpen] = useState(false)

  // 필터 저장
  const saveFilters = async (updated: ReportFilters) => {
    await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: updated }),
    })
    setCurrentFilters(updated)
  }

  const handleCampaignApply = async (ids: string[] | null) => {
    setCampaignFilter(ids)
    await saveFilters({ ...currentFilters, tiktok_campaign_ids: ids })
  }

  const handleAdgroupApply = async (ids: string[] | null) => {
    setAdgroupFilter(ids)
    await saveFilters({ ...currentFilters, tiktok_adgroup_ids: ids })
  }

  const handleGmvMaxApply = async (ids: string[] | null) => {
    setGmvMaxCampaignFilter(ids)
    await saveFilters({ ...currentFilters, tiktok_gmvmax_campaign_ids: ids })
  }

  const handleTiktokCreativeWidgetsChange = async (widgets: CreativeWidgetConfig[]) => {
    setTiktokCreativeWidgets(widgets)
    await saveFilters({ ...currentFilters, tiktok_creative_widgets: widgets })
  }

  const handleGmvmaxCreativeWidgetsChange = async (widgets: CreativeWidgetConfig[]) => {
    setGmvmaxCreativeWidgets(widgets)
    await saveFilters({ ...currentFilters, gmvmax_creative_widgets: widgets })
  }

  // 필터 적용
  const filteredCampaigns = campaignFilter
    ? allNormalCampaigns.filter((c) => campaignFilter.includes(c.campaign_id))
    : allNormalCampaigns

  const filteredAdgroups = adgroupFilter
    ? allAdgroups.filter((a) => adgroupFilter.includes(a.adgroup_id))
    : allAdgroups

  const filteredGmvMaxCampaigns = gmvMaxCampaignFilter
    ? allGmvMaxCampaigns.filter((c) => gmvMaxCampaignFilter.includes(c.campaign_id))
    : allGmvMaxCampaigns

  // 다이얼로그용 목록
  const campaignItems = allNormalCampaigns.map((c) => ({ id: c.campaign_id, name: c.campaign_name }))
  const adgroupItems = allAdgroups.map((a) => ({ id: a.adgroup_id, name: a.adgroup_name }))
  const gmvMaxItems2 = allGmvMaxCampaigns.map((c) => ({
    id: c.campaign_id,
    name: c.campaign_name ?? c.campaign_id,
  }))

  // 공통 다이얼로그 모음
  const filterDialogs = (
    <>
      <FilterDialog
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        title="캠페인 선택"
        items={campaignItems}
        selectedIds={campaignFilter}
        onApply={handleCampaignApply}
      />
      <FilterDialog
        open={adgroupDialogOpen}
        onOpenChange={setAdgroupDialogOpen}
        title="광고그룹 선택"
        items={adgroupItems}
        selectedIds={adgroupFilter}
        onApply={handleAdgroupApply}
      />
      <FilterDialog
        open={gmvMaxDialogOpen}
        onOpenChange={setGmvMaxDialogOpen}
        title="GMV Max 캠페인 선택"
        items={gmvMaxItems2}
        selectedIds={gmvMaxCampaignFilter}
        onApply={handleGmvMaxApply}
      />
    </>
  )

  // GMV Max 데이터가 없으면 탭 없이 렌더링
  if (!showGmvMaxTab) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="py-8 text-center">
            <h1 className="text-2xl font-bold">{title}</h1>
          </CardContent>
        </Card>
        <MonthlyKpi m={monthly} />
        <WeeklyCharts weekly={weekly} />
        <WeeklyTable weekly={weekly} />
        <CampaignSection
          campaigns={filteredCampaigns}
          title="🎯 캠페인 성과 분석 (TikTok)"
          onFilterClick={isAdmin && campaignItems.length > 0 ? () => setCampaignDialogOpen(true) : undefined}
        />
        <AdgroupSection
          adgroups={filteredAdgroups}
          onFilterClick={isAdmin && adgroupItems.length > 0 ? () => setAdgroupDialogOpen(true) : undefined}
        />
        <CreativeSection
          ads={ads}
          widgets={tiktokCreativeWidgets}
          onWidgetsChange={handleTiktokCreativeWidgetsChange}
          isAdmin={isAdmin}
        />
        <InsightMemoCard
          reportId={reportId}
          initialContent={insightMemo}
          role={role}
          fieldKey="insight_memo"
        />
        {filterDialogs}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="py-8 text-center">
          <h1 className="text-2xl font-bold">{title}</h1>
        </CardContent>
      </Card>

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
          <CampaignSection
            campaigns={filteredCampaigns}
            title="🎯 캠페인 성과 분석 (TikTok)"
            onFilterClick={isAdmin && campaignItems.length > 0 ? () => setCampaignDialogOpen(true) : undefined}
          />
          <AdgroupSection
            adgroups={filteredAdgroups}
            onFilterClick={isAdmin && adgroupItems.length > 0 ? () => setAdgroupDialogOpen(true) : undefined}
          />
          <CreativeSection
          ads={ads}
          widgets={tiktokCreativeWidgets}
          onWidgetsChange={handleTiktokCreativeWidgetsChange}
          isAdmin={isAdmin}
        />
          <InsightMemoCard
            reportId={reportId}
            initialContent={insightMemo}
            role={role}
            label="일반 캠페인 인사이트 & 메모"
            fieldKey="insight_memo"
          />
        </TabsContent>

        {/* GMV Max 탭 */}
        <TabsContent value="gmvmax" className="flex flex-col gap-6">
          <GmvMaxMonthlyKpi m={gmvMaxMonthly} />
          <GmvMaxWeeklyCharts weekly={gmvMaxWeekly ?? []} />
          <GmvMaxWeeklyTable weekly={gmvMaxWeekly ?? []} />
          <GmvMaxCampaignSection
            campaigns={filteredGmvMaxCampaigns}
            onFilterClick={isAdmin && gmvMaxItems2.length > 0 ? () => setGmvMaxDialogOpen(true) : undefined}
          />
          <GmvMaxCreativeSection
            items={gmvMaxItems ?? []}
            widgets={gmvmaxCreativeWidgets}
            onWidgetsChange={handleGmvmaxCreativeWidgetsChange}
            isAdmin={isAdmin}
          />
          <InsightMemoCard
            reportId={reportId}
            initialContent={insightMemoGmvMax}
            role={role}
            label="GMV Max 인사이트 & 메모"
            fieldKey="insight_memo_gmv_max"
          />
        </TabsContent>
      </Tabs>

      {filterDialogs}
    </div>
  )
}
