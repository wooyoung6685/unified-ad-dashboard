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

// 광고 ROAS 포매터 — 이미지와 동일하게 배수(ratio)를 퍼센트(%)로 표기
const fmtRoasPct = (v: number | null) =>
  v == null ? '-' : `${(v * 100).toFixed(2)}%`

// 전월 날짜 범위 계산 ("2026-02-01 ~ 2026-02-28" → "2026-01-01 ~ 2026-01-31")
function getPrevDateRange(current: string): string {
  const match = current.match(/(\d{4})-(\d{2})-(\d{2})\s*~\s*(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return '-'
  const startYear = parseInt(match[1], 10)
  const startMonth = parseInt(match[2], 10)
  // 전월로 이동 (JS Date month는 0-indexed)
  const prevStart = new Date(startYear, startMonth - 2, 1)
  const prevEnd = new Date(startYear, startMonth - 1, 0) // 전월의 말일
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${fmt(prevStart)} ~ ${fmt(prevEnd)}`
}

// 성장률 셀 — 색상(증가가 좋으면 양수 파랑 / 음수 빨강, 반대면 그 반대)
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

// ── 월간 요약 테이블 ──────────────────────────────

function MonthlyTable({ m }: { m: Qoo10MonthlyData }) {
  const prevDateRange = getPrevDateRange(m.date_range)

  // 각 컬럼 정의: { label, curr, prev, fmt, goodUp }
  const qoo10Cols = [
    { label: '전체 매출', curr: m.revenue, prev: m.prev_revenue, fmt: fmtJPY, goodUp: true },
    { label: '구매수', curr: m.purchases, prev: m.prev_purchases, fmt: fmtNum, goodUp: true },
    { label: '전체 세션수', curr: m.sessions, prev: m.prev_sessions, fmt: fmtNum, goodUp: true },
    { label: '구매전환율', curr: m.conversion_rate, prev: m.prev_conversion_rate, fmt: fmtPct, goodUp: true },
    { label: 'AOV', curr: m.aov, prev: m.prev_aov, fmt: fmtJPY, goodUp: true },
  ]

  const adsCols = [
    { label: '광고매출', curr: m.ad_sales, prev: m.prev_ad_sales, fmt: fmtJPY, goodUp: true },
    { label: '광고비', curr: m.ad_cost, prev: m.prev_ad_cost, fmt: fmtJPY, goodUp: false },
    { label: '광고 ROAS', curr: m.roas, prev: m.prev_roas, fmt: fmtRoasPct, goodUp: true },
    { label: '노출수', curr: m.impressions, prev: m.prev_impressions, fmt: fmtNum, goodUp: true },
    { label: '클릭수', curr: m.clicks, prev: m.prev_clicks, fmt: fmtNum, goodUp: true },
    { label: 'CTR', curr: m.ctr, prev: m.prev_ctr, fmt: fmtPct, goodUp: true },
    { label: 'CPC', curr: m.cpc, prev: m.prev_cpc, fmt: fmtJPY, goodUp: false },
  ]

  const allCols = [...qoo10Cols, ...adsCols]

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">■ Qoo10_DATA</h2>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {/* 그룹 헤더 행 */}
            <TableRow className="bg-muted/50">
              <TableHead rowSpan={2} className="whitespace-nowrap align-middle border-r">
                날짜범위
              </TableHead>
              <TableHead
                colSpan={qoo10Cols.length}
                className="text-center font-semibold border-r"
              >
                Qoo10
              </TableHead>
              <TableHead colSpan={adsCols.length} className="text-center font-semibold">
                내부광고
              </TableHead>
            </TableRow>
            {/* 컬럼명 행 */}
            <TableRow className="bg-muted/30">
              {qoo10Cols.map((c, i) => (
                <TableHead
                  key={`q-${c.label}`}
                  className={`text-right whitespace-nowrap ${i === qoo10Cols.length - 1 ? 'border-r' : ''}`}
                >
                  {c.label}
                </TableHead>
              ))}
              {adsCols.map((c) => (
                <TableHead key={`a-${c.label}`} className="text-right whitespace-nowrap">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* 당월 데이터 행 */}
            <TableRow>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground border-r">
                {m.date_range}
              </TableCell>
              {allCols.map((c, i) => (
                <TableCell
                  key={`curr-${c.label}`}
                  className={`text-right font-medium ${i === qoo10Cols.length - 1 ? 'border-r' : ''}`}
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
                  className={`text-right text-muted-foreground ${i === qoo10Cols.length - 1 ? 'border-r' : ''}`}
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
                  className={`text-right ${i === qoo10Cols.length - 1 ? 'border-r' : ''}`}
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

// ── 주간 차트 ──────────────────────────────────────

function WeeklyCharts({ weekly }: { weekly: Qoo10WeeklyData[] }) {
  const data = weekly.map((w) => ({
    name: `${w.week}주차`,
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
  const qoo10Cols = [
    { label: '전체 매출',   get: (w: Qoo10WeeklyData) => w.revenue,         fmt: fmtJPY },
    { label: '구매건수',    get: (w: Qoo10WeeklyData) => w.purchases,       fmt: fmtNum },
    { label: '전체 세션수', get: (w: Qoo10WeeklyData) => w.sessions,        fmt: fmtNum },
    { label: '전환율',      get: (w: Qoo10WeeklyData) => w.conversion_rate, fmt: fmtPct },
    { label: 'AOV',         get: (w: Qoo10WeeklyData) => w.aov,             fmt: fmtJPY },
  ]

  const adsCols = [
    { label: '전체광고비',  get: (w: Qoo10WeeklyData) => w.ad_cost,     fmt: fmtJPY },
    { label: '광고매출',    get: (w: Qoo10WeeklyData) => w.ad_sales,    fmt: fmtJPY },
    { label: 'ROAS',        get: (w: Qoo10WeeklyData) => w.roas,        fmt: fmtRoasPct },
    { label: '광고노출수',  get: (w: Qoo10WeeklyData) => w.impressions, fmt: fmtNum },
    { label: '광고클릭수',  get: (w: Qoo10WeeklyData) => w.clicks,      fmt: fmtNum },
    { label: 'CPC',         get: (w: Qoo10WeeklyData) => w.cpc,         fmt: fmtJPY },
    { label: 'CTR',         get: (w: Qoo10WeeklyData) => w.ctr,         fmt: fmtPct },
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
                colSpan={qoo10Cols.length}
                className="text-center font-semibold border-r"
              >
                Qoo10
              </TableHead>
              <TableHead colSpan={adsCols.length} className="text-center font-semibold">
                내부광고
              </TableHead>
            </TableRow>
            {/* 컬럼명 행 */}
            <TableRow className="bg-muted/30">
              {qoo10Cols.map((c, i) => (
                <TableHead
                  key={`wq-${c.label}`}
                  className={`text-right whitespace-nowrap ${i === qoo10Cols.length - 1 ? 'border-r' : ''}`}
                >
                  {c.label}
                </TableHead>
              ))}
              {adsCols.map((c) => (
                <TableHead key={`wa-${c.label}`} className="text-right whitespace-nowrap">
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
                {qoo10Cols.map((c, i) => (
                  <TableCell
                    key={`wr-q-${c.label}`}
                    className={`text-right ${i === qoo10Cols.length - 1 ? 'border-r' : ''}`}
                  >
                    {c.fmt(c.get(w))}
                  </TableCell>
                ))}
                {adsCols.map((c) => (
                  <TableCell key={`wr-a-${c.label}`} className="text-right">
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

// ── 일별 섹션 ─────────────────────────────────────

function DailySection({ daily }: { daily: Qoo10DailyData[] }) {
  // 1일 → 말일 날짜 오름차순 정렬 (표/차트 모두 1일이 최상단)
  const sortedDaily = [...daily].sort((a, b) => a.date.localeCompare(b.date))

  // 차트용 데이터 (월-일 표기, 전체 일자)
  const chartData = sortedDaily.map((d) => ({
    date: d.date.slice(5),
    // 음수 매출은 막대/라벨 없이 처리
    revenue: Math.max(0, d.revenue ?? 0),
  }))

  // 표 행 높이(약 36px)에 맞춰 차트 높이 계산
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
            <CardTitle className="text-sm font-medium">일별 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart
                layout="vertical"
                data={chartData}
                margin={{ top: 8, right: 72, left: 0, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                  tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickMargin={2}
                  width={48}
                />
                <Tooltip formatter={(v) => [fmtJPY(v as number), '매출']} />
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
                          {fmtJPY(value)}
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

// ── 제품별 섹션 ───────────────────────────────────

function ProductSection({ products }: { products: Qoo10ProductData[] }) {
  const top20 = products.slice(0, 20)

  // 테이블과 동일한 순서(매출 내림차순). data[0]이 차트 상단
  const chartData = [...top20]
    .sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0))
    .map((p, i) => ({
      idx: `${i + 1}`,
      name: (p.product_name_ko ?? p.product_name_jp).slice(0, 24),
      sales: p.sales ?? 0,
    }))

  // 표 행 높이(2줄 이름 기준 약 56px)에 맞춰 차트 높이 계산
  const chartHeight = Math.max(top20.length * 56 + 48, 360)

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
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart
                layout="vertical"
                data={chartData}
                margin={{ top: 4, right: 96, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="idx"
                  tick={{ fontSize: 10 }}
                  width={28}
                />
                <Tooltip
                  formatter={(v) => [fmtJPY(v as number), '판매매출']}
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
                    formatter: (v: unknown) => fmtJPY(v as number),
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
      <MonthlyTable m={monthly} />

      {/* 주간 표 */}
      {weekly.length > 0 && <WeeklyTable weekly={weekly} />}

      {/* 주간 차트 */}
      {weekly.length > 0 && <WeeklyCharts weekly={weekly} />}

      {/* 일별 섹션 */}
      {daily.length > 0 && <DailySection daily={daily} />}

      {/* 제품별 섹션 */}
      {products.length > 0 && <ProductSection products={products} />}
    </div>
  )
}
