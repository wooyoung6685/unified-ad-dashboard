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
import { fmtJPY, fmtNum, fmtPct } from '@/lib/format'
import type {
  Qoo10DailyData,
  Qoo10MonthlyData,
  Qoo10ProductData,
  Qoo10ReportData,
  Qoo10WeeklyData,
} from '@/types/database'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface Props {
  data: Qoo10ReportData
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
  curr,
  prev,
  fmt,
  goodUp = true,
}: {
  label: string
  curr: number | null
  prev: number | null
  fmt: (v: number | null) => string
  goodUp?: boolean
}) {
  return (
    <Card>
      <CardContent className="px-4 pb-3 pt-4">
        <p className="mb-1 text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold leading-tight">{fmt(curr)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">전월: {fmt(prev)}</span>
          <DeltaBadge curr={curr} prev={prev} goodUp={goodUp} />
        </div>
      </CardContent>
    </Card>
  )
}

// ── 월간 KPI ─────────────────────────────────────

function MonthlyKpi({ m }: { m: Qoo10MonthlyData }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">■ Qoo10_DATA (월간 요약)</h2>
      <p className="mb-3 text-sm text-muted-foreground">{m.date_range}</p>

      {/* 전체 지표 */}
      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">전체 (오가닉)</p>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="전체 매출" curr={m.revenue} prev={m.prev_revenue} fmt={fmtJPY} />
        <KpiCard label="구매수" curr={m.purchases} prev={m.prev_purchases} fmt={fmtNum} />
        <KpiCard label="전체 세션수" curr={m.sessions} prev={m.prev_sessions} fmt={fmtNum} />
        <KpiCard label="구매전환율" curr={m.conversion_rate} prev={m.prev_conversion_rate} fmt={fmtPct} />
        <KpiCard label="AOV" curr={m.aov} prev={m.prev_aov} fmt={fmtJPY} />
      </div>

      {/* 내부광고 지표 */}
      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">내부 광고</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="광고 매출" curr={m.ad_sales} prev={m.prev_ad_sales} fmt={fmtJPY} />
        <KpiCard label="전체 광고비" curr={m.ad_cost} prev={m.prev_ad_cost} fmt={fmtJPY} goodUp={false} />
        <KpiCard label="광고 ROAS" curr={m.roas} prev={m.prev_roas} fmt={(v) => v == null ? '-' : `${v.toFixed(2)}x`} />
        <KpiCard label="노출수" curr={m.impressions} prev={m.prev_impressions} fmt={fmtNum} />
        <KpiCard label="클릭수" curr={m.clicks} prev={m.prev_clicks} fmt={fmtNum} />
        <KpiCard label="CTR" curr={m.ctr} prev={m.prev_ctr} fmt={fmtPct} />
        <KpiCard label="CPC" curr={m.cpc} prev={m.prev_cpc} fmt={fmtJPY} goodUp={false} />
      </div>
    </section>
  )
}

// ── 주간 차트 ──────────────────────────────────────

const WEEK_LABELS = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']

function WeeklyCharts({ weekly }: { weekly: Qoo10WeeklyData[] }) {
  const data = weekly.map((w) => ({
    name: `Week ${w.week}`,
    revenue: w.revenue ?? 0,
    sessions: w.sessions ?? 0,
    purchases: w.purchases ?? 0,
    conversion_rate: w.conversion_rate ?? 0,
    ad_sales: w.ad_sales ?? 0,
    ad_cost: w.ad_cost ?? 0,
    roas: w.roas ?? 0,
    cpc: w.cpc ?? 0,
    ctr: w.ctr ?? 0,
  }))

  const fmtY = (v: number) => `¥${(v / 1000).toFixed(0)}k`

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">■ 주별 차트</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. 전체매출 Bar + 세션수 Line */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">매출 &amp; 세션수</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={data} margin={{ top: 8, right: 32, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tickFormatter={fmtY} tick={{ fontSize: 10 }} width={52} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={44} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === '전체 매출') return [fmtJPY(value as number), name as string]
                    return [fmtNum(value as number), name as string]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="revenue" name="전체 매출" fill="#9ca3af" radius={[2, 2, 0, 0]} label={{ position: 'top', formatter: (v: unknown) => fmtJPY(v as number), fontSize: 9 }} />
                <Line yAxisId="right" type="monotone" dataKey="sessions" name="전체 세션수" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} label={{ position: 'top', fontSize: 9, fill: '#3b82f6' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. 구매건수 Bar + 전환율 Line */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">구매수 &amp; 전환율</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={data} margin={{ top: 8, right: 32, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={40} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10 }} width={48} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === '전환율') return [`${Number(value).toFixed(2)}%`, name as string]
                    return [fmtNum(value as number), name as string]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="purchases" name="구매건수" fill="#9ca3af" radius={[2, 2, 0, 0]} label={{ position: 'top', fontSize: 9 }} />
                <Line yAxisId="right" type="monotone" dataKey="conversion_rate" name="전환율" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} label={{ position: 'top', formatter: (v: unknown) => `${Number(v).toFixed(2)}%`, fontSize: 9, fill: '#3b82f6' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. 광고매출 Bar + 전체광고비 Bar + ROAS Line */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">광고비 &amp; 광고매출 &amp; ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={data} margin={{ top: 8, right: 48, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tickFormatter={fmtY} tick={{ fontSize: 10 }} width={52} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10 }} width={52} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'ROAS') return [`${(Number(value) * 100).toFixed(2)}%`, name as string]
                    return [fmtJPY(value as number), name as string]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="ad_cost" name="전체광고비" fill="#4b5563" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left" dataKey="ad_sales" name="광고매출" fill="#9ca3af" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} label={{ position: 'top', formatter: (v: unknown) => `${(Number(v) * 100).toFixed(2)}%`, fontSize: 9, fill: '#3b82f6' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 4. CPC Bar + CTR Line */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">CPC &amp; CTR</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={data} margin={{ top: 8, right: 48, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tickFormatter={(v) => `¥${v}`} tick={{ fontSize: 10 }} width={44} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10 }} width={48} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'CTR') return [`${Number(value).toFixed(2)}%`, name as string]
                    return [fmtJPY(value as number), name as string]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="cpc" name="CPC" fill="#9ca3af" radius={[2, 2, 0, 0]} label={{ position: 'top', formatter: (v: unknown) => fmtJPY(v as number), fontSize: 9 }} />
                <Line yAxisId="right" type="monotone" dataKey="ctr" name="CTR" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} label={{ position: 'top', formatter: (v: unknown) => `${Number(v).toFixed(2)}%`, fontSize: 9, fill: '#3b82f6' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ── 주간 표 ───────────────────────────────────────

function WeeklyTable({ weekly }: { weekly: Qoo10WeeklyData[] }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">■ 주별기준_DATA</h2>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="whitespace-nowrap">주차</TableHead>
              <TableHead className="whitespace-nowrap">날짜범위</TableHead>
              <TableHead className="whitespace-nowrap text-right">전체 매출</TableHead>
              <TableHead className="whitespace-nowrap text-right">구매수</TableHead>
              <TableHead className="whitespace-nowrap text-right">세션수</TableHead>
              <TableHead className="whitespace-nowrap text-right">전환율</TableHead>
              <TableHead className="whitespace-nowrap text-right">AOV</TableHead>
              <TableHead className="whitespace-nowrap text-right">광고매출</TableHead>
              <TableHead className="whitespace-nowrap text-right">광고비</TableHead>
              <TableHead className="whitespace-nowrap text-right">ROAS</TableHead>
              <TableHead className="whitespace-nowrap text-right">노출수</TableHead>
              <TableHead className="whitespace-nowrap text-right">클릭수</TableHead>
              <TableHead className="whitespace-nowrap text-right">CTR</TableHead>
              <TableHead className="whitespace-nowrap text-right">CPC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {weekly.map((w) => (
              <TableRow key={w.week}>
                <TableCell className="font-medium">Week {w.week}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{w.date_range}</TableCell>
                <TableCell className="text-right">{fmtJPY(w.revenue)}</TableCell>
                <TableCell className="text-right">{fmtNum(w.purchases)}</TableCell>
                <TableCell className="text-right">{fmtNum(w.sessions)}</TableCell>
                <TableCell className="text-right">{fmtPct(w.conversion_rate)}</TableCell>
                <TableCell className="text-right">{fmtJPY(w.aov)}</TableCell>
                <TableCell className="text-right">{fmtJPY(w.ad_sales)}</TableCell>
                <TableCell className="text-right">{fmtJPY(w.ad_cost)}</TableCell>
                <TableCell className="text-right">{w.roas != null ? `${w.roas.toFixed(2)}x` : '-'}</TableCell>
                <TableCell className="text-right">{fmtNum(w.impressions)}</TableCell>
                <TableCell className="text-right">{fmtNum(w.clicks)}</TableCell>
                <TableCell className="text-right">{fmtPct(w.ctr)}</TableCell>
                <TableCell className="text-right">{fmtJPY(w.cpc)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

// ── 일별 섹션 ─────────────────────────────────────

function DailySection({ daily }: { daily: Qoo10DailyData[] }) {
  // 수평 막대 차트용 상위 15일 (매출 기준)
  const chartData = [...daily]
    .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
    .slice(0, 20)
    .reverse()
    .map((d) => ({ date: d.date.slice(5), revenue: d.revenue ?? 0 }))

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">■ 일별기준_DATA</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 일별 표 */}
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>날짜</TableHead>
                <TableHead className="text-right">매출</TableHead>
                <TableHead className="text-right">구매수</TableHead>
                <TableHead className="text-right">세션수</TableHead>
                <TableHead className="text-right">구매전환율</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daily.map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="text-sm">{d.date}</TableCell>
                  <TableCell className="text-right text-sm">{fmtJPY(d.revenue)}</TableCell>
                  <TableCell className="text-right text-sm">{fmtNum(d.purchases)}</TableCell>
                  <TableCell className="text-right text-sm">{fmtNum(d.sessions)}</TableCell>
                  <TableCell className="text-right text-sm">{fmtPct(d.conversion_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 일별 매출 막대 차트 */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">본셉 일별 매출 (상위 20일)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(chartData.length * 22, 300)}>
              <ComposedChart
                layout="vertical"
                data={chartData}
                margin={{ top: 4, right: 64, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="date" tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v) => [fmtJPY(v as number), '매출']} />
                <Bar dataKey="revenue" fill="#6b7280" radius={[0, 2, 2, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#6b7280" />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ── 제품별 섹션 ───────────────────────────────────

function ProductSection({ products }: { products: Qoo10ProductData[] }) {
  const top20 = products.slice(0, 20)

  const chartData = [...top20]
    .sort((a, b) => (a.sales ?? 0) - (b.sales ?? 0))
    .map((p) => ({
      name: (p.product_name_ko ?? p.product_name_jp).slice(0, 20),
      sales: p.sales ?? 0,
    }))

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">■ 제품별기준_DATA</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 제품별 표 */}
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>상품명</TableHead>
                <TableHead className="text-right">판매매출</TableHead>
                <TableHead className="text-right">판매수량</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top20.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-[220px]">
                    <p className="truncate text-sm font-medium">
                      {p.product_name_ko ?? p.product_name_jp}
                    </p>
                    {p.product_name_ko && (
                      <p className="truncate text-xs text-muted-foreground">
                        {p.product_name_jp}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">{fmtJPY(p.sales)}</TableCell>
                  <TableCell className="text-right text-sm">{fmtNum(p.quantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 제품별 매출 막대 차트 */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">제품별 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(chartData.length * 26, 300)}>
              <ComposedChart
                layout="vertical"
                data={chartData}
                margin={{ top: 4, right: 72, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v) => [fmtJPY(v as number), '판매매출']} />
                <Bar dataKey="sales" fill="#6b7280" radius={[0, 2, 2, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#6b7280" />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────

export function Qoo10ReportDetail({ data, title }: Props) {
  const { monthly, weekly, daily, products } = data

  return (
    <div className="space-y-10">
      {/* 리포트 제목 카드 */}
      <Card className="border-2">
        <CardContent className="flex items-center justify-center py-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </CardContent>
      </Card>

      {/* 월간 KPI 요약 */}
      <MonthlyKpi m={monthly} />

      {/* 주간 차트 */}
      {weekly.length > 0 && <WeeklyCharts weekly={weekly} />}

      {/* 주간 표 */}
      {weekly.length > 0 && <WeeklyTable weekly={weekly} />}

      {/* 일별 섹션 */}
      {daily.length > 0 && <DailySection daily={daily} />}

      {/* 제품별 섹션 */}
      {products.length > 0 && <ProductSection products={products} />}
    </div>
  )
}
