'use client'

import type { ReactNode } from 'react'
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
  SectionInsights,
  ShopeeMonthlyData,
  ShopeePromotionRow,
  ShopeeReportData,
  ShopeeWeeklyData,
} from '@/types/database'
import { SHOPEE_SECTION_KEYS } from '@/lib/reports/section-keys'
import { SectionInsightCard } from './section-insight-card'
import { ShopeePromotionSection } from './shopee-promotion-section'
import { ShopeeVoucherTop3Section } from './shopee-voucher-top3-section'
import { ShopeeProductTop5Section } from './shopee-product-top5-section'
import { ShopeeAdsRoasTop5Section } from './shopee-ads-roas-top5-section'
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
  reportId: string
  initialPromotionRows: ShopeePromotionRow[]
  role: 'admin' | 'viewer'
  sectionInsights: SectionInsights
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
            label="Sales (한화)"
            curr={m.sales_krw ?? null}
            prev={m.prev_sales_krw ?? null}
            format="krw"
            goodUp
          />
          <ShopeeKpiCard
            label="Orders"
            curr={m.orders ?? null}
            prev={m.prev_orders ?? null}
            format="num"
            goodUp
          />
          <ShopeeKpiCard
            label="Product Clicks"
            curr={m.product_clicks ?? null}
            prev={m.prev_product_clicks ?? null}
            format="num"
            goodUp
          />
          <ShopeeKpiCard
            label="Visitors"
            curr={m.visitors ?? null}
            prev={m.prev_visitors ?? null}
            format="num"
            goodUp
          />
          <ShopeeKpiCard
            label="CVR"
            curr={m.cvr ?? null}
            prev={m.prev_cvr ?? null}
            format="pct"
            goodUp
          />
          <ShopeeKpiCard
            label="Units Sold"
            curr={m.units_sold ?? null}
            prev={m.prev_units_sold ?? null}
            format="num"
            goodUp
          />
          <ShopeeKpiCard
            label="Sales per Buyer (한화)"
            curr={m.sales_per_buyer ?? null}
            prev={m.prev_sales_per_buyer ?? null}
            format="krw"
            goodUp
          />
          <ShopeeKpiCard
            label="New Buyers"
            curr={m.new_buyers ?? null}
            prev={m.prev_new_buyers ?? null}
            format="num"
            goodUp
          />
          <ShopeeKpiCard
            label="Existing Buyers"
            curr={m.existing_buyers ?? null}
            prev={m.prev_existing_buyers ?? null}
            format="num"
            goodUp
          />
          <ShopeeKpiCard
            label="광고비 (인앱)"
            curr={m.ad_spend_inapp_krw ?? null}
            prev={m.prev_ad_spend_inapp_krw ?? null}
            format="krw"
            goodUp={false}
          />
          <ShopeeKpiCard
            label="광고비 (메타)"
            curr={m.ad_spend_meta ?? null}
            prev={m.prev_ad_spend_meta ?? null}
            format="krw"
            goodUp={false}
          />
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

export function ShopeeReportDetail({
  data,
  title,
  reportId,
  initialPromotionRows,
  role,
  sectionInsights,
  titleAction,
}: Props) {
  const canEdit = role === 'admin'
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
        reportId={reportId}
        role={role}
        sectionKey={SHOPEE_SECTION_KEYS.monthly}
        defaultLabel="월간 요약 인사이트"
        initialEntry={sectionInsights[SHOPEE_SECTION_KEYS.monthly]}
      >
        <MonthlyKpi m={data.monthly} />
      </SectionInsightCard>

      {/* 섹션 3: Shopee Ads (ROAS TOP 5) */}
      <SectionInsightCard
        reportId={reportId}
        role={role}
        sectionKey={SHOPEE_SECTION_KEYS.adsRoasTop5}
        defaultLabel="Shopee Ads ROAS TOP 5 인사이트"
        initialEntry={sectionInsights[SHOPEE_SECTION_KEYS.adsRoasTop5]}
      >
        {(addButton) => (
          <ShopeeAdsRoasTop5Section
            rows={data.ads_top5 ?? []}
            total={
              data.ads_top5_total ?? {
                impressions: null,
                clicks: null,
                ctr: null,
                conversions: null,
                conversion_rate: null,
                gmv: null,
                expense: null,
                roas: null,
                gmv_krw: null,
                expense_krw: null,
              }
            }
            currency={data.ads_currency ?? ''}
            fxRateKrw={data.ads_fx_rate_krw ?? null}
            headerAction={addButton}
          />
        )}
      </SectionInsightCard>

      {/* 섹션 4: 주간 차트 */}
      <SectionInsightCard
        reportId={reportId}
        role={role}
        sectionKey={SHOPEE_SECTION_KEYS.weeklyCharts}
        defaultLabel="주간 차트 인사이트"
        initialEntry={sectionInsights[SHOPEE_SECTION_KEYS.weeklyCharts]}
      >
        <WeeklyCharts weekly={data.weekly} />
      </SectionInsightCard>

      {/* 섹션 5: 주간 데이터 */}
      <SectionInsightCard
        reportId={reportId}
        role={role}
        sectionKey={SHOPEE_SECTION_KEYS.weeklyTable}
        defaultLabel="주간 데이터 인사이트"
        initialEntry={sectionInsights[SHOPEE_SECTION_KEYS.weeklyTable]}
      >
        <WeeklyTable weekly={data.weekly} />
      </SectionInsightCard>

      {/* 섹션 6: 프로모션 성과 */}
      <SectionInsightCard
        reportId={reportId}
        role={role}
        sectionKey={SHOPEE_SECTION_KEYS.promotion}
        defaultLabel="프로모션 성과 인사이트"
        initialEntry={sectionInsights[SHOPEE_SECTION_KEYS.promotion]}
      >
        <ShopeePromotionSection
          reportId={reportId}
          initialRows={initialPromotionRows}
          canEdit={canEdit}
        />
      </SectionInsightCard>

      {/* 섹션 7: 바우처 데이터 (Top 3) */}
      <SectionInsightCard
        reportId={reportId}
        role={role}
        sectionKey={SHOPEE_SECTION_KEYS.voucherTop3}
        defaultLabel="바우처 TOP 3 인사이트"
        initialEntry={sectionInsights[SHOPEE_SECTION_KEYS.voucherTop3]}
      >
        <ShopeeVoucherTop3Section rows={data.voucher_top3 ?? []} />
      </SectionInsightCard>

      {/* 섹션 8: 프로덕트 퍼포먼스 (Sales TOP 5) */}
      <SectionInsightCard
        reportId={reportId}
        role={role}
        sectionKey={SHOPEE_SECTION_KEYS.productTop5}
        defaultLabel="프로덕트 성과 TOP 5 인사이트"
        initialEntry={sectionInsights[SHOPEE_SECTION_KEYS.productTop5]}
      >
        <ShopeeProductTop5Section rows={data.product_top5 ?? []} />
      </SectionInsightCard>
    </div>
  )
}
