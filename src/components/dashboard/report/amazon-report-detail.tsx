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
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
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

function DeltaCell({
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
    <span className={`text-xs font-semibold ${isGood ? 'text-green-600' : 'text-red-500'}`}>
      {up ? '+' : ''}{pct.toFixed(0)}%
    </span>
  )
}

function fmtCompact(v: number | null): string {
  if (v == null) return '-'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}

// ── 섹션 1: 제목 ──────────────────────────────────

function TitleCard({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
      </CardContent>
    </Card>
  )
}

// ── 섹션 2: 월간 요약 ──────────────────────────────

function MonthlySection({ monthly: m }: { monthly: AmazonMonthlyData }) {
  const organicMetrics = [
    { label: '전체매출', curr: m.organic_sales, prev: m.prev_organic_sales, fmt: fmtUSD, goodUp: true },
    { label: '구매수', curr: m.orders, prev: m.prev_orders, fmt: fmtNum, goodUp: true },
    { label: '전체세션수', curr: m.sessions, prev: m.prev_sessions, fmt: fmtNum, goodUp: true },
    { label: '전환율', curr: m.conversion_rate, prev: m.prev_conversion_rate, fmt: fmtPct, goodUp: true },
    { label: 'AOV', curr: m.aov, prev: m.prev_aov, fmt: fmtUSD, goodUp: true },
  ]

  const adsMetrics = [
    { label: '전체광고비', curr: m.ad_cost, prev: m.prev_ad_cost, fmt: fmtUSD, goodUp: false },
    { label: '광고매출', curr: m.ad_sales, prev: m.prev_ad_sales, fmt: fmtUSD, goodUp: true },
    { label: 'ROAS', curr: m.ad_roas != null ? m.ad_roas * 100 : null, prev: m.prev_ad_roas != null ? m.prev_ad_roas * 100 : null, fmt: fmtPct, goodUp: true },
    { label: '광고노출수', curr: m.ad_impressions, prev: m.prev_ad_impressions, fmt: fmtNum, goodUp: true },
    { label: '광고클릭수', curr: m.ad_clicks, prev: m.prev_ad_clicks, fmt: fmtNum, goodUp: true },
    { label: 'CPC', curr: m.ad_cpc, prev: m.prev_ad_cpc, fmt: fmtUSD, goodUp: false },
    { label: 'CTR', curr: m.ad_ctr, prev: m.prev_ad_ctr, fmt: fmtPct, goodUp: true },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">월간 요약 (당월 vs 전월)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 오가닉 테이블 */}
          <div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      colSpan={organicMetrics.length + 1}
                      className="text-center text-white"
                      style={{ backgroundColor: '#374151' }}
                    >
                      아마존 (오가닉)
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="whitespace-nowrap text-xs" style={{ backgroundColor: '#374151', color: '#fff' }}>데이터</TableHead>
                    {organicMetrics.map((m) => (
                      <TableHead key={m.label} className="whitespace-nowrap text-center text-xs" style={{ backgroundColor: '#374151', color: '#fff' }}>
                        {m.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="whitespace-nowrap text-xs font-medium">당월</TableCell>
                    {organicMetrics.map((m) => (
                      <TableCell key={m.label} className="whitespace-nowrap text-center text-xs">
                        {m.fmt(m.curr)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap text-xs font-medium">전월</TableCell>
                    {organicMetrics.map((m) => (
                      <TableCell key={m.label} className="whitespace-nowrap text-center text-xs">
                        {m.fmt(m.prev)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap text-xs font-medium">성장률</TableCell>
                    {organicMetrics.map((m) => (
                      <TableCell key={m.label} className="whitespace-nowrap text-center">
                        <DeltaCell curr={m.curr} prev={m.prev} goodUp={m.goodUp} />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 광고 테이블 */}
          <div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      colSpan={adsMetrics.length + 1}
                      className="text-center text-white"
                      style={{ backgroundColor: '#1E3A5F' }}
                    >
                      내부광고 (Ads)
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="whitespace-nowrap text-xs" style={{ backgroundColor: '#1E3A5F', color: '#fff' }}>데이터</TableHead>
                    {adsMetrics.map((m) => (
                      <TableHead key={m.label} className="whitespace-nowrap text-center text-xs" style={{ backgroundColor: '#1E3A5F', color: '#fff' }}>
                        {m.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="whitespace-nowrap text-xs font-medium">당월</TableCell>
                    {adsMetrics.map((m) => (
                      <TableCell key={m.label} className="whitespace-nowrap text-center text-xs">
                        {m.fmt(m.curr)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap text-xs font-medium">전월</TableCell>
                    {adsMetrics.map((m) => (
                      <TableCell key={m.label} className="whitespace-nowrap text-center text-xs">
                        {m.fmt(m.prev)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap text-xs font-medium">성장률</TableCell>
                    {adsMetrics.map((m) => (
                      <TableCell key={m.label} className="whitespace-nowrap text-center">
                        <DeltaCell curr={m.curr} prev={m.prev} goodUp={m.goodUp} />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 섹션 3: 주별 데이터 테이블 ──────────────────────

function WeeklyTable({ weekly }: { weekly: AmazonWeeklyData[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">주별 데이터</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="whitespace-nowrap border-r text-xs">주차</TableHead>
                <TableHead rowSpan={2} className="whitespace-nowrap border-r text-xs">날짜</TableHead>
                <TableHead colSpan={5} className="text-center text-white text-xs border-r" style={{ backgroundColor: '#374151' }}>아마존 (오가닉)</TableHead>
                <TableHead colSpan={7} className="text-center text-white text-xs" style={{ backgroundColor: '#1E3A5F' }}>내부광고 (Ads)</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#374151' }}>전체매출</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#374151' }}>구매건수</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#374151' }}>세션수</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#374151' }}>전환율</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white border-r" style={{ backgroundColor: '#374151' }}>AOV</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#1E3A5F' }}>전체광고비</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#1E3A5F' }}>광고매출</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#1E3A5F' }}>ROAS</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#1E3A5F' }}>노출수</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#1E3A5F' }}>클릭수</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#1E3A5F' }}>CPC</TableHead>
                <TableHead className="whitespace-nowrap text-xs text-white" style={{ backgroundColor: '#1E3A5F' }}>CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekly.map((w) => (
                <TableRow key={w.week}>
                  <TableCell className="whitespace-nowrap text-xs font-medium border-r">W{w.week}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs border-r">{w.date_range}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtUSD(w.organic_sales)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtNum(w.orders)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtNum(w.sessions)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtPct(w.conversion_rate)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs border-r">{fmtUSD(w.aov)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtUSD(w.ad_cost)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtUSD(w.ad_sales)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{w.ad_roas != null ? `${(w.ad_roas * 100).toFixed(0)}%` : '-'}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtCompact(w.ad_impressions)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtNum(w.ad_clicks)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtUSD(w.ad_cpc)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtPct(w.ad_ctr)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 섹션 4: 주별 차트 (2x2) ──────────────────────

function WeeklyCharts({ weekly }: { weekly: AmazonWeeklyData[] }) {
  const chartData = weekly.map((w) => ({
    label: `W${w.week}`,
    organic_sales: w.organic_sales,
    sessions: w.sessions,
    orders: w.orders,
    conversion_rate: w.conversion_rate,
    ad_cost: w.ad_cost,
    ad_sales: w.ad_sales,
    ad_roas: w.ad_roas != null ? w.ad_roas * 100 : null,
    ad_cpc: w.ad_cpc,
    ad_ctr: w.ad_ctr,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">주별 차트</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* 차트 1: 매출 & 세션수 */}
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">매출 & 세션수</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} width={70}
                  tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={50}
                  tickFormatter={(v: number) => fmtCompact(v)} />
                <Tooltip />
                <Legend verticalAlign="top" height={30} />
                <Bar yAxisId="left" dataKey="organic_sales" name="매출" fill="#9CA3AF" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="organic_sales" position="top" fontSize={10}
                    formatter={(v: unknown) => `$${((v as number) / 1000).toFixed(1)}K`} />
                </Bar>
                <Line yAxisId="right" dataKey="sessions" name="세션수" stroke="#3B82F6" dot={{ r: 4 }} type="monotone" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 차트 2: 구매수 & 전환율 */}
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">구매수 & 전환율</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} width={50} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={50}
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                <Tooltip />
                <Legend verticalAlign="top" height={30} />
                <Bar yAxisId="left" dataKey="orders" name="구매수" fill="#9CA3AF" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="orders" position="top" fontSize={10} />
                </Bar>
                <Line yAxisId="right" dataKey="conversion_rate" name="전환율" stroke="#3B82F6" dot={{ r: 4 }} type="monotone" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 차트 3: 광고비 & 광고매출 & ROAS */}
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">광고비 & 광고매출 & ROAS</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} width={70}
                  tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={50}
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <Tooltip />
                <Legend verticalAlign="top" height={30} />
                <Bar yAxisId="left" dataKey="ad_cost" name="광고비" fill="#9CA3AF" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left" dataKey="ad_sales" name="광고매출" fill="#6B7280" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" dataKey="ad_roas" name="ROAS" stroke="#3B82F6" dot={{ r: 4 }} type="monotone" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 차트 4: CPC & CTR */}
          <div>
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">CPC & CTR</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} width={50}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={50}
                  tickFormatter={(v: number) => `${v.toFixed(2)}%`} />
                <Tooltip />
                <Legend verticalAlign="top" height={30} />
                <Bar yAxisId="right" dataKey="ad_ctr" name="CTR" fill="#9CA3AF" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="ad_ctr" position="top" fontSize={10}
                    formatter={(v: unknown) => `${(v as number).toFixed(2)}%`} />
                </Bar>
                <Line yAxisId="left" dataKey="ad_cpc" name="CPC" stroke="#3B82F6" dot={{ r: 4 }} type="monotone" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 수평 바 차트 공통 컴포넌트 ──────────────────────

function HorizontalBarChart({
  data,
  dataKey,
  nameKey,
  title,
  valueFormatter = (v: number) => fmtUSD(v),
  height,
}: {
  data: Record<string, unknown>[]
  dataKey: string
  nameKey: string
  title: string
  valueFormatter?: (v: number) => string
  height?: number
}) {
  const chartHeight = height ?? Math.max(200, data.length * 32)

  return (
    <div>
      <p className="mb-2 text-center text-sm font-medium text-muted-foreground">{title}</p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 60, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey={nameKey}
            tick={{ fontSize: 10 }}
            width={100}
            tickFormatter={(v: string) => v.length > 15 ? `${v.slice(0, 15)}...` : v}
          />
          <Tooltip formatter={(value: unknown) => valueFormatter(value as number)} />
          <Bar dataKey={dataKey} fill="#9CA3AF" radius={[0, 2, 2, 0]}>
            <LabelList
              dataKey={dataKey}
              position="right"
              fontSize={10}
              formatter={(v: unknown) => valueFormatter(v as number)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── 섹션 5: 키워드 분석 ──────────────────────────────

function KeywordSection({ keywords }: { keywords: AmazonKeywordData[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">키워드 분석 (Top {keywords.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 테이블 */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap text-xs">#</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">키워드</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-xs">노출수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((kw, i) => (
                  <TableRow key={kw.keyword}>
                    <TableCell className="whitespace-nowrap text-xs">{i + 1}</TableCell>
                    <TableCell className="text-xs">{kw.keyword}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs">{fmtNum(kw.impressions)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 수평 바 차트 */}
          <HorizontalBarChart
            data={[...keywords].reverse()}
            dataKey="impressions"
            nameKey="keyword"
            title="키워드별 노출수"
            valueFormatter={(v) => fmtNum(v)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ── 섹션 6: 일별 데이터 ──────────────────────────────

function DailySection({ daily }: { daily: AmazonDailyData[] }) {
  const dailyWithLabel = daily.map((d) => {
    const date = new Date(d.date)
    return {
      ...d,
      label: `${date.getMonth() + 1}.${date.getDate()}`,
    }
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">일별 데이터</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 테이블 */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap text-xs" style={{ backgroundColor: '#374151', color: '#fff' }}>날짜</TableHead>
                  <TableHead className="whitespace-nowrap text-xs" style={{ backgroundColor: '#374151', color: '#fff' }}>매출</TableHead>
                  <TableHead className="whitespace-nowrap text-xs" style={{ backgroundColor: '#374151', color: '#fff' }}>구매수</TableHead>
                  <TableHead className="whitespace-nowrap text-xs" style={{ backgroundColor: '#374151', color: '#fff' }}>세션수</TableHead>
                  <TableHead className="whitespace-nowrap text-xs" style={{ backgroundColor: '#374151', color: '#fff' }}>구매전환율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily.map((d) => {
                  const date = new Date(d.date)
                  return (
                    <TableRow key={d.date}>
                      <TableCell className="whitespace-nowrap text-xs">{date.getMonth() + 1}.{date.getDate()}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtUSD(d.organic_sales)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtNum(d.orders)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtNum(d.sessions)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtPct(d.conversion_rate)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* 수평 바 차트 */}
          <HorizontalBarChart
            data={[...dailyWithLabel].reverse() as unknown as Record<string, unknown>[]}
            dataKey="organic_sales"
            nameKey="label"
            title="일별 매출"
            valueFormatter={(v) => fmtUSD(v)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ── 섹션 7: 제품별 데이터 ──────────────────────────────

function ProductSection({ products }: { products: AmazonProductData[] }) {
  const productData = products.map((p) => ({
    ...p,
    shortTitle: p.title.length > 30 ? `${p.title.slice(0, 30)}...` : p.title,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">제품별 데이터 (ASIN)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 테이블 */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap text-xs" style={{ backgroundColor: '#374151', color: '#fff' }}>판매 제품</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-xs" style={{ backgroundColor: '#374151', color: '#fff' }}>판매 매출</TableHead>
                  <TableHead className="whitespace-nowrap text-right text-xs" style={{ backgroundColor: '#374151', color: '#fff' }}>판매수량</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.child_asin ?? p.title}>
                    <TableCell className="text-xs max-w-[200px] truncate" title={p.title}>{p.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs">{fmtUSD(p.sales)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs">{fmtNum(p.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 수평 바 차트 */}
          <HorizontalBarChart
            data={[...productData].reverse() as unknown as Record<string, unknown>[]}
            dataKey="sales"
            nameKey="shortTitle"
            title="제품별 매출"
            valueFormatter={(v) => fmtUSD(v)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────

export function AmazonReportDetail({ data, title }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* 섹션 1: 제목 */}
      <TitleCard title={title} />

      {/* 섹션 2: 월간 요약 */}
      <MonthlySection monthly={data.monthly} />

      {/* 섹션 3: 주별 데이터 테이블 */}
      <WeeklyTable weekly={data.weekly} />

      {/* 섹션 4: 주별 차트 (2x2 그리드) */}
      <WeeklyCharts weekly={data.weekly} />

      {/* 섹션 5: 키워드 분석 */}
      {data.keywords.length > 0 && <KeywordSection keywords={data.keywords} />}

      {/* 섹션 6: 일별 데이터 + 차트 */}
      <DailySection daily={data.daily} />

      {/* 섹션 7: 제품별 데이터 + 차트 */}
      {data.products.length > 0 && <ProductSection products={data.products} />}
    </div>
  )
}
