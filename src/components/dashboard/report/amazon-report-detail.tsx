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
import { fmtNum, fmtPct, fmtUSD } from '@/lib/format'
import type {
  AmazonDailyData,
  AmazonKeywordData,
  AmazonMonthlyData,
  AmazonProductData,
  AmazonReportData,
  AmazonWeeklyData,
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
  data: AmazonReportData
  title: string
}

// ── 헬퍼 ─────────────────────────────────────────

function calcChange(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

// 광고 ROAS 포매터 — 배수(ratio)를 퍼센트(%)로 표기
const fmtRoasPct = (v: number | null) =>
  v == null ? '-' : `${(v * 100).toFixed(2)}%`

// 전월 날짜 범위 계산 ("2026-02-01 ~ 2026-02-28" → "2026-01-01 ~ 2026-01-31")
function getPrevDateRange(current: string): string {
  const match = current.match(/(\d{4})-(\d{2})-(\d{2})\s*~\s*(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return '-'
  const startYear = parseInt(match[1], 10)
  const startMonth = parseInt(match[2], 10)
  const prevStart = new Date(startYear, startMonth - 2, 1)
  const prevEnd = new Date(startYear, startMonth - 1, 0)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${fmt(prevStart)} ~ ${fmt(prevEnd)}`
}

// weekly 배열에서 당월 날짜범위 문자열을 파생 (첫 주 시작 ~ 마지막 주 종료)
function deriveDateRange(weekly: AmazonWeeklyData[]): string {
  if (weekly.length === 0) return '-'
  const first = weekly[0].date_range
  const last = weekly[weekly.length - 1].date_range
  const startMatch = first.match(/(\d{4}-\d{2}-\d{2})/)
  const endMatch = last.match(/.*?(\d{4}-\d{2}-\d{2})\s*$/)
  if (!startMatch || !endMatch) return '-'
  return `${startMatch[1]} ~ ${endMatch[1]}`
}

// 성장률 셀 — 증가 좋음=파랑, 나쁨=빨강
function GrowthCell({
  curr,
  prev,
  goodUp = true,
}: {
  curr: number | null
  prev: number | null
  goodUp?: boolean
}) {
  const pct = calcChange(curr, prev)
  if (pct == null) return <span className="text-muted-foreground">-</span>
  const up = pct >= 0
  const isGood = goodUp ? up : !up
  const colorClass = isGood ? 'text-blue-600' : 'text-red-500'
  return (
    <span className={`font-medium ${colorClass}`}>
      {up ? '' : '-'}
      {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

// ── 섹션 1: 제목 ──────────────────────────────────

function TitleCard({ title }: { title: string }) {
  return (
    <Card className="border-2">
      <CardContent className="flex items-center justify-center py-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </CardContent>
    </Card>
  )
}

// ── 섹션 2: 월간 요약 ──────────────────────────────

function MonthlySection({
  monthly: m,
  weekly,
}: {
  monthly: AmazonMonthlyData
  weekly: AmazonWeeklyData[]
}) {
  const dateRange = deriveDateRange(weekly)
  const prevDateRange = getPrevDateRange(dateRange)

  const amazonCols = [
    { label: '전체매출', curr: m.organic_sales, prev: m.prev_organic_sales, fmt: fmtUSD, goodUp: true },
    { label: '구매수', curr: m.orders, prev: m.prev_orders, fmt: fmtNum, goodUp: true },
    { label: '전체세션수', curr: m.sessions, prev: m.prev_sessions, fmt: fmtNum, goodUp: true },
    { label: '구매전환율', curr: m.conversion_rate, prev: m.prev_conversion_rate, fmt: fmtPct, goodUp: true },
    { label: 'AOV', curr: m.aov, prev: m.prev_aov, fmt: fmtUSD, goodUp: true },
  ]

  const adsCols = [
    { label: '광고매출', curr: m.ad_sales, prev: m.prev_ad_sales, fmt: fmtUSD, goodUp: true },
    { label: '광고비', curr: m.ad_cost, prev: m.prev_ad_cost, fmt: fmtUSD, goodUp: false },
    { label: '광고 ROAS', curr: m.ad_roas, prev: m.prev_ad_roas, fmt: fmtRoasPct, goodUp: true },
    { label: '노출수', curr: m.ad_impressions, prev: m.prev_ad_impressions, fmt: fmtNum, goodUp: true },
    { label: '클릭수', curr: m.ad_clicks, prev: m.prev_ad_clicks, fmt: fmtNum, goodUp: true },
    { label: 'CTR', curr: m.ad_ctr, prev: m.prev_ad_ctr, fmt: fmtPct, goodUp: true },
    { label: 'CPC', curr: m.ad_cpc, prev: m.prev_ad_cpc, fmt: fmtUSD, goodUp: false },
  ]

  const allCols = [...amazonCols, ...adsCols]

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">■ Amazon_DATA</h2>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {/* 그룹 헤더 행 */}
            <TableRow className="bg-muted/50">
              <TableHead rowSpan={2} className="whitespace-nowrap align-middle border-r">
                날짜범위
              </TableHead>
              <TableHead
                colSpan={amazonCols.length}
                className="text-center font-semibold border-r"
              >
                Amazon
              </TableHead>
              <TableHead colSpan={adsCols.length} className="text-center font-semibold">
                내부광고
              </TableHead>
            </TableRow>
            {/* 컬럼명 행 */}
            <TableRow className="bg-muted/30">
              {amazonCols.map((c, i) => (
                <TableHead
                  key={`am-${c.label}`}
                  className={`text-right whitespace-nowrap ${i === amazonCols.length - 1 ? 'border-r' : ''}`}
                >
                  {c.label}
                </TableHead>
              ))}
              {adsCols.map((c) => (
                <TableHead key={`ad-${c.label}`} className="text-right whitespace-nowrap">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* 당월 데이터 행 */}
            <TableRow>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground border-r">
                {dateRange}
              </TableCell>
              {allCols.map((c, i) => (
                <TableCell
                  key={`curr-${c.label}`}
                  className={`text-right font-medium ${i === amazonCols.length - 1 ? 'border-r' : ''}`}
                >
                  {c.fmt(c.curr)}
                </TableCell>
              ))}
            </TableRow>
            {/* 전월 데이터 행 */}
            <TableRow>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground border-r">
                {prevDateRange}
              </TableCell>
              {allCols.map((c, i) => (
                <TableCell
                  key={`prev-${c.label}`}
                  className={`text-right text-muted-foreground ${i === amazonCols.length - 1 ? 'border-r' : ''}`}
                >
                  {c.fmt(c.prev)}
                </TableCell>
              ))}
            </TableRow>
            {/* 전월 대비 성장률 행 */}
            <TableRow className="bg-muted/20">
              <TableCell className="whitespace-nowrap text-xs font-medium border-r">
                전월 대비 성장률
              </TableCell>
              {allCols.map((c, i) => (
                <TableCell
                  key={`growth-${c.label}`}
                  className={`text-right ${i === amazonCols.length - 1 ? 'border-r' : ''}`}
                >
                  <GrowthCell curr={c.curr} prev={c.prev} goodUp={c.goodUp} />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

// ── 섹션 3: 주별 데이터 테이블 ──────────────────────

function WeeklyTable({ weekly }: { weekly: AmazonWeeklyData[] }) {
  const amazonCols = [
    { label: '전체매출', get: (w: AmazonWeeklyData) => w.organic_sales, fmt: fmtUSD },
    { label: '구매건수', get: (w: AmazonWeeklyData) => w.orders, fmt: fmtNum },
    { label: '전체세션수', get: (w: AmazonWeeklyData) => w.sessions, fmt: fmtNum },
    { label: '전환율', get: (w: AmazonWeeklyData) => w.conversion_rate, fmt: fmtPct },
    { label: 'AOV', get: (w: AmazonWeeklyData) => w.aov, fmt: fmtUSD },
  ]

  const adsCols = [
    { label: '전체광고비', get: (w: AmazonWeeklyData) => w.ad_cost, fmt: fmtUSD },
    { label: '광고매출', get: (w: AmazonWeeklyData) => w.ad_sales, fmt: fmtUSD },
    { label: 'ROAS', get: (w: AmazonWeeklyData) => w.ad_roas, fmt: fmtRoasPct },
    { label: '광고노출수', get: (w: AmazonWeeklyData) => w.ad_impressions, fmt: fmtNum },
    { label: '광고클릭수', get: (w: AmazonWeeklyData) => w.ad_clicks, fmt: fmtNum },
    { label: 'CPC', get: (w: AmazonWeeklyData) => w.ad_cpc, fmt: fmtUSD },
    { label: 'CTR', get: (w: AmazonWeeklyData) => w.ad_ctr, fmt: fmtPct },
  ]

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">■ 주별기준_DATA</h2>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {/* 그룹 헤더 행 */}
            <TableRow className="bg-muted/50">
              <TableHead rowSpan={2} className="whitespace-nowrap align-middle border-r">
                주차
              </TableHead>
              <TableHead rowSpan={2} className="whitespace-nowrap align-middle border-r">
                날짜범위
              </TableHead>
              <TableHead
                colSpan={amazonCols.length}
                className="text-center font-semibold border-r"
              >
                Amazon
              </TableHead>
              <TableHead colSpan={adsCols.length} className="text-center font-semibold">
                내부광고
              </TableHead>
            </TableRow>
            {/* 컬럼명 행 */}
            <TableRow className="bg-muted/30">
              {amazonCols.map((c, i) => (
                <TableHead
                  key={`wam-${c.label}`}
                  className={`text-right whitespace-nowrap ${i === amazonCols.length - 1 ? 'border-r' : ''}`}
                >
                  {c.label}
                </TableHead>
              ))}
              {adsCols.map((c) => (
                <TableHead key={`wad-${c.label}`} className="text-right whitespace-nowrap">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {weekly.map((w) => (
              <TableRow key={w.week}>
                <TableCell className="font-medium whitespace-nowrap border-r">{w.week}주차</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap border-r">{w.date_range}</TableCell>
                {amazonCols.map((c, i) => (
                  <TableCell
                    key={`wr-am-${c.label}`}
                    className={`text-right ${i === amazonCols.length - 1 ? 'border-r' : ''}`}
                  >
                    {c.fmt(c.get(w))}
                  </TableCell>
                ))}
                {adsCols.map((c) => (
                  <TableCell key={`wr-ad-${c.label}`} className="text-right">
                    {c.fmt(c.get(w))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

// ── 섹션 4: 주별 차트 (2×2) ──────────────────────

function WeeklyCharts({ weekly }: { weekly: AmazonWeeklyData[] }) {
  const chartData = weekly.map((w) => ({
    label: `${w.week}주차`,
    organic_sales: w.organic_sales,
    sessions: w.sessions,
    orders: w.orders,
    conversion_rate: w.conversion_rate,
    ad_cost: w.ad_cost,
    ad_sales: w.ad_sales,
    ad_roas: w.ad_roas, // raw ratio (배수) — 포매터에서 *100 처리
    ad_cpc: w.ad_cpc,
    ad_ctr: w.ad_ctr,
  }))

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">■ 주별 차트</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 차트 1: 매출 & 세션수 */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">매출 &amp; 세션수</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 32, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 10 }}
                  width={60}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={44} />
                <Tooltip
                  formatter={(value, name) =>
                    name === '매출' ? [fmtUSD(value as number), name as string] : [fmtNum(value as number), name as string]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="organic_sales"
                  name="매출"
                  fill="#9ca3af"
                  radius={[2, 2, 0, 0]}
                  label={{ position: 'top', formatter: (v: unknown) => `$${((v as number) / 1000).toFixed(1)}K`, fontSize: 9 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sessions"
                  name="세션수"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  label={{ position: 'top', fontSize: 9, fill: '#3b82f6' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 차트 2: 구매수 & 전환율 */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">구매수 &amp; 전환율</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 32, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={40} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  tick={{ fontSize: 10 }}
                  width={48}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === '전환율'
                      ? [`${Number(value).toFixed(2)}%`, name as string]
                      : [fmtNum(value as number), name as string]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="orders"
                  name="구매수"
                  fill="#9ca3af"
                  radius={[2, 2, 0, 0]}
                  label={{ position: 'top', fontSize: 9 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversion_rate"
                  name="전환율"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  label={{ position: 'top', formatter: (v: unknown) => `${Number(v).toFixed(2)}%`, fontSize: 9, fill: '#3b82f6' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 차트 3: 광고비 & 광고매출 & ROAS */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">광고비 &amp; 광고매출 &amp; ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 48, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 10 }}
                  width={60}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 10 }}
                  width={52}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'ROAS') return [`${(Number(value) * 100).toFixed(2)}%`, name as string]
                    return [fmtUSD(value as number), name as string]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="ad_cost" name="전체광고비" fill="#4b5563" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left" dataKey="ad_sales" name="광고매출" fill="#9ca3af" radius={[2, 2, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ad_roas"
                  name="ROAS"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  label={{ position: 'top', formatter: (v: unknown) => `${(Number(v) * 100).toFixed(2)}%`, fontSize: 9, fill: '#3b82f6' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 차트 4: CPC & CTR — CPC=Bar, CTR=Line (큐텐과 동일 순서) */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">CPC &amp; CTR</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 48, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                  tick={{ fontSize: 10 }}
                  width={44}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  tick={{ fontSize: 10 }}
                  width={48}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'CTR'
                      ? [`${Number(value).toFixed(2)}%`, name as string]
                      : [fmtUSD(value as number), name as string]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="ad_cpc"
                  name="CPC"
                  fill="#9ca3af"
                  radius={[2, 2, 0, 0]}
                  label={{ position: 'top', formatter: (v: unknown) => fmtUSD(v as number), fontSize: 9 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ad_ctr"
                  name="CTR"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  label={{ position: 'top', formatter: (v: unknown) => `${Number(v).toFixed(2)}%`, fontSize: 9, fill: '#3b82f6' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ── 섹션 5: 키워드 분석 (Amazon 전용) ──────────────────────────────

function KeywordSection({ keywords }: { keywords: AmazonKeywordData[] }) {
  const filtered = keywords.filter((kw) => !kw.keyword.startsWith('B0'))
  if (filtered.length === 0) return null

  const sorted = [...filtered].sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
  const chartData = sorted.map((kw, i) => ({
    idx: `${i + 1}`,
    name: kw.keyword.length > 20 ? `${kw.keyword.slice(0, 20)}…` : kw.keyword,
    impressions: kw.impressions,
  }))
  const chartHeight = Math.max(sorted.length * 36 + 48, 240)

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">■ 키워드_DATA (Top {filtered.length})</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 테이블 */}
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>#</TableHead>
                <TableHead>키워드</TableHead>
                <TableHead className="text-right">노출수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((kw, i) => (
                <TableRow key={kw.keyword}>
                  <TableCell className="text-sm">{i + 1}</TableCell>
                  <TableCell className="text-sm">{kw.keyword}</TableCell>
                  <TableCell className="text-right text-sm">{fmtNum(kw.impressions)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 수직 막대 차트 */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">키워드별 노출수</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart
                layout="vertical"
                data={chartData}
                margin={{ top: 4, right: 80, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => fmtNum(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="idx" tick={{ fontSize: 10 }} width={28} />
                <Tooltip
                  formatter={(v) => [fmtNum(v as number), '노출수']}
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload as { name?: string } | undefined
                    return p?.name ?? `#${label}`
                  }}
                />
                <Bar
                  dataKey="impressions"
                  fill="#6b7280"
                  radius={[0, 2, 2, 0]}
                  label={{ position: 'right', formatter: (v: unknown) => fmtNum(v as number), fontSize: 10 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ── 섹션 6: 일별 데이터 ──────────────────────────────

function DailySection({ daily }: { daily: AmazonDailyData[] }) {
  const sortedDaily = [...daily].sort((a, b) => a.date.localeCompare(b.date))

  const chartData = sortedDaily.map((d) => ({
    date: d.date.slice(5),
    revenue: Math.max(0, d.organic_sales ?? 0),
  }))

  const chartHeight = Math.max(sortedDaily.length * 36 + 48, 360)

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
              {sortedDaily.map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="text-sm">{d.date}</TableCell>
                  <TableCell className="text-right text-sm">{fmtUSD(d.organic_sales)}</TableCell>
                  <TableCell className="text-right text-sm">{fmtNum(d.orders)}</TableCell>
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
            <CardTitle className="text-sm font-medium">일별 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart
                layout="vertical"
                data={chartData}
                margin={{ top: 8, right: 80, left: 0, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickMargin={2}
                  width={48}
                />
                <Tooltip formatter={(v) => [fmtUSD(v as number), '매출']} />
                <Bar
                  dataKey="revenue"
                  fill="#6b7280"
                  radius={[0, 2, 2, 0]}
                  label={{
                    content: (props) => {
                      const { x, y, width, height, value } = props as {
                        x: number; y: number; width: number; height: number; value: number
                      }
                      if (!value) return <text />
                      return (
                        <text
                          x={x + width + 4}
                          y={y + height / 2}
                          textAnchor="start"
                          dominantBaseline="middle"
                          fontSize={10}
                          fill="#374151"
                        >
                          {fmtUSD(value)}
                        </text>
                      )
                    },
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ── 섹션 7: 제품별 데이터 ──────────────────────────────

function ProductSection({ products }: { products: AmazonProductData[] }) {
  // 공통 브랜드 접두사 자동 제거 (Amazon 특화)
  const firstWords = products.map((p) => p.title.split(' ')[0]?.toLowerCase() ?? '')
  const commonPrefix =
    firstWords.length > 1 && firstWords.every((w) => w === firstWords[0]) ? firstWords[0] : null

  function shortenTitle(title: string, maxLen: number): string {
    let name = title
    if (commonPrefix && name.toLowerCase().startsWith(commonPrefix)) {
      name = name.slice(commonPrefix.length).trim()
    }
    return name.length > maxLen ? `${name.slice(0, maxLen)}…` : name
  }

  const sorted = [...products].sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0))
  const chartData = sorted.map((p, i) => ({
    idx: `${i + 1}`,
    name: shortenTitle(p.title, 24),
    sales: p.sales ?? 0,
  }))
  const chartHeight = Math.max(sorted.length * 56 + 48, 360)

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">■ 제품별기준_DATA</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 제품별 표 */}
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>판매 제품</TableHead>
                <TableHead className="text-right">판매매출</TableHead>
                <TableHead className="text-right">판매수량</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.child_asin ?? p.title}>
                  <TableCell className="max-w-[220px]">
                    <p className="truncate text-sm" title={p.title}>{shortenTitle(p.title, 45)}</p>
                  </TableCell>
                  <TableCell className="text-right text-sm">{fmtUSD(p.sales)}</TableCell>
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
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart
                layout="vertical"
                data={chartData}
                margin={{ top: 4, right: 96, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 10 }}
                />
                <YAxis type="category" dataKey="idx" tick={{ fontSize: 10 }} width={28} />
                <Tooltip
                  formatter={(v) => [fmtUSD(v as number), '판매매출']}
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload as { name?: string } | undefined
                    return p?.name ?? `#${label}`
                  }}
                />
                <Bar
                  dataKey="sales"
                  fill="#6b7280"
                  radius={[0, 2, 2, 0]}
                  label={{
                    position: 'right',
                    formatter: (v: unknown) => fmtUSD(v as number),
                    fontSize: 10,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────

export function AmazonReportDetail({ data, title }: Props) {
  return (
    <div className="space-y-10">
      {/* 섹션 1: 제목 */}
      <TitleCard title={title} />

      {/* 섹션 2: 월간 요약 */}
      <MonthlySection monthly={data.monthly} weekly={data.weekly} />

      {/* 섹션 3: 주별 데이터 테이블 */}
      {data.weekly.length > 0 && <WeeklyTable weekly={data.weekly} />}

      {/* 섹션 4: 주별 차트 (2×2 그리드) */}
      {data.weekly.length > 0 && <WeeklyCharts weekly={data.weekly} />}

      {/* 섹션 5: 키워드 분석 (Amazon 전용) */}
      {data.keywords.length > 0 && <KeywordSection keywords={data.keywords} />}

      {/* 섹션 6: 일별 데이터 + 차트 */}
      {data.daily.length > 0 && <DailySection daily={data.daily} />}

      {/* 섹션 7: 제품별 데이터 + 차트 */}
      {data.products.length > 0 && <ProductSection products={data.products} />}
    </div>
  )
}
