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
  ShopeeAdsBreakdownData,
  ShopeeMonthlyData,
  ShopeeReportData,
  ShopeeWeeklyData,
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
  data: ShopeeReportData
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

function ShopeeKpiCard({
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
function MonthlyKpi({ m }: { m: ShopeeMonthlyData }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📊 월간 요약 (Shopee)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          <ShopeeKpiCard
            label="지출금액 (한화)"
            curr={m.spend_krw}
            prev={m.prev_spend_krw}
            format="krw"
            goodUp={false}
          />
          <ShopeeKpiCard
            label="매출 (한화)"
            curr={m.revenue_krw}
            prev={m.prev_revenue_krw}
            format="krw"
            goodUp
          />
          <ShopeeKpiCard label="ROAS" curr={m.roas} prev={m.prev_roas} format="pct" goodUp />
          <ShopeeKpiCard
            label="구매(전환)수"
            curr={m.purchases}
            prev={m.prev_purchases}
            format="num"
            goodUp
          />
          <ShopeeKpiCard
            label="전환율"
            curr={m.conversion_rate}
            prev={m.prev_conversion_rate}
            format="pct"
            goodUp
          />
          <ShopeeKpiCard
            label="노출수"
            curr={m.impressions}
            prev={m.prev_impressions}
            format="num"
            goodUp
          />
          <ShopeeKpiCard
            label="클릭수"
            curr={m.clicks}
            prev={m.prev_clicks}
            format="num"
            goodUp
          />
          <ShopeeKpiCard
            label="클릭당 비용(CPC) (한화)"
            curr={m.cpc_krw}
            prev={m.prev_cpc_krw}
            format="krw"
            goodUp={false}
          />
          <ShopeeKpiCard
            label="클릭률(CTR)"
            curr={m.ctr}
            prev={m.prev_ctr}
            format="pct"
            goodUp
          />
        </div>
      </CardContent>
    </Card>
  )
}

// 광고 유형별 셀 (현재값 + 전월 + 증감)
function AdsCell({
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
  const fmt = (v: number | null) => {
    if (format === 'krw') return fmtKRW(v)
    if (format === 'num') return fmtNum(v)
    if (format === 'pct') return fmtPct(v)
    return fmtDec(v)
  }
  return (
    <TableCell className="whitespace-nowrap">
      <div className="flex flex-col gap-0.5">
        <span>{fmt(curr)}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Prev: {fmt(prev)}</span>
          <DeltaBadge curr={curr} prev={prev} goodUp={goodUp} />
        </div>
      </div>
    </TableCell>
  )
}

// 섹션 3: Shopee Ads 성과 테이블
function AdsBreakdownTable({ breakdown }: { breakdown: ShopeeAdsBreakdownData[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🎯 Shopee Ads 성과</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">구분</TableHead>
                <TableHead className="whitespace-nowrap">노출수</TableHead>
                <TableHead className="whitespace-nowrap">클릭수</TableHead>
                <TableHead className="whitespace-nowrap">클릭당 비용(CPC) (한화)</TableHead>
                <TableHead className="whitespace-nowrap">클릭률(CTR)</TableHead>
                <TableHead className="whitespace-nowrap">지출금액 (한화)</TableHead>
                <TableHead className="whitespace-nowrap">구매(전환)수</TableHead>
                <TableHead className="whitespace-nowrap">매출 (한화)</TableHead>
                <TableHead className="whitespace-nowrap">ROAS</TableHead>
                <TableHead className="whitespace-nowrap">전환율</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.map((b) => (
                <TableRow key={b.ads_type}>
                  <TableCell className="whitespace-nowrap font-medium">{b.label}</TableCell>
                  <AdsCell curr={b.impressions} prev={b.prev_impressions} format="num" goodUp />
                  <AdsCell curr={b.clicks} prev={b.prev_clicks} format="num" goodUp />
                  <AdsCell curr={b.cpc_krw} prev={b.prev_cpc_krw} format="krw" goodUp={false} />
                  <AdsCell curr={b.ctr} prev={b.prev_ctr} format="pct" goodUp />
                  <AdsCell
                    curr={b.spend_krw}
                    prev={b.prev_spend_krw}
                    format="krw"
                    goodUp={false}
                  />
                  <AdsCell curr={b.purchases} prev={b.prev_purchases} format="num" goodUp />
                  <AdsCell curr={b.revenue_krw} prev={b.prev_revenue_krw} format="krw" goodUp />
                  <AdsCell curr={b.roas} prev={b.prev_roas} format="pct" goodUp />
                  <AdsCell
                    curr={b.conversion_rate}
                    prev={b.prev_conversion_rate}
                    format="pct"
                    goodUp
                  />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// 섹션 4: 주간 차트
function WeeklyCharts({ weekly }: { weekly: ShopeeWeeklyData[] }) {
  const chartData = weekly.map((w) => ({
    label: `${w.week}주차`,
    clicks: w.clicks,
    ctr: w.ctr,
    revenue_krw: w.revenue_krw,
    roas: w.roas,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📈 주간 차트 (Shopee)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* CTR vs 클릭 */}
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
              CTR & 클릭수
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
                    v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  width={50}
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={30} />
                <Bar
                  yAxisId="left"
                  dataKey="clicks"
                  name="클릭수"
                  fill="#9CA3AF"
                  radius={[2, 2, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  dataKey="ctr"
                  name="CTR"
                  stroke="#3B82F6"
                  dot={{ r: 4 }}
                  type="monotone"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* ROAS vs 매출 */}
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
              ROAS & 매출(한화)
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 11 }}
                  width={70}
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
                  width={50}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={30} />
                <Bar
                  yAxisId="left"
                  dataKey="revenue_krw"
                  name="매출(한화)"
                  fill="#9CA3AF"
                  radius={[2, 2, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  dataKey="roas"
                  name="ROAS"
                  stroke="#10B981"
                  dot={{ r: 4 }}
                  type="monotone"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 섹션 5: 주간 데이터 테이블
function WeeklyTable({ weekly }: { weekly: ShopeeWeeklyData[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🗓️ 주간 데이터 (Shopee)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">주차</TableHead>
                <TableHead className="whitespace-nowrap">날짜</TableHead>
                <TableHead className="whitespace-nowrap">노출수</TableHead>
                <TableHead className="whitespace-nowrap">클릭수</TableHead>
                <TableHead className="whitespace-nowrap">CPC</TableHead>
                <TableHead className="whitespace-nowrap">CTR</TableHead>
                <TableHead className="whitespace-nowrap">지출(한화)</TableHead>
                <TableHead className="whitespace-nowrap">전환수</TableHead>
                <TableHead className="whitespace-nowrap">매출(한화)</TableHead>
                <TableHead className="whitespace-nowrap">ROAS</TableHead>
                <TableHead className="whitespace-nowrap">전환율</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekly.map((w) => (
                <TableRow key={w.week}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {w.week}주차
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{w.date_range}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(w.impressions)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(w.clicks)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.cpc_krw)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(w.ctr)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.spend_krw)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtNum(w.purchases)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtKRW(w.revenue_krw)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(w.roas)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtPct(w.conversion_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────

export function ShopeeReportDetail({ data, title }: Props) {
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

      {/* 섹션 3: Shopee Ads 성과 */}
      <AdsBreakdownTable breakdown={data.ads_breakdown} />

      {/* 섹션 4: 주간 차트 */}
      <WeeklyCharts weekly={data.weekly} />

      {/* 섹션 5: 주간 데이터 */}
      <WeeklyTable weekly={data.weekly} />
    </div>
  )
}
