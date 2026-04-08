'use client'

import { fmtKRW, fmtNum } from '@/lib/format'
import type { SummaryDayData } from '@/types/database'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface ShopeeShoppingAnalyticsChartsProps {
  data: SummaryDayData[]
  hasKrw: boolean
  currency: string | null
}

// 차트 카드 공통 레이아웃
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[#0e0e0f]">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

// 데이터 없음 표시
function EmptyState() {
  return (
    <div className="flex h-75 items-center justify-center text-sm text-gray-400">
      데이터가 없습니다
    </div>
  )
}

// ComposedChart 공통 툴팁
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  const formatValue = (name: string, value: any) => {
    if (value === null || value === undefined) return '-'
    if (['매출', '지출금액', '광고비'].includes(name))
      return `₩${Math.round(value).toLocaleString()}`
    return Math.round(value).toLocaleString()
  }

  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        fontSize: '12px',
        color: '#374151',
      }}
    >
      {label && (
        <p style={{ fontWeight: 600, marginBottom: 6, color: '#111827' }}>
          {label}
        </p>
      )}
      {payload.map((entry: any, index: number) => (
        <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name}: {formatValue(entry.name, entry.value)}
        </p>
      ))}
    </div>
  )
}

// PieChart 커스텀 라벨
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (percent < 0.05) return null
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

const PIE_COLORS = ['#10B981', '#F59E0B']

export function ShopeeShoppingAnalyticsCharts({
  data,
  hasKrw,
  currency,
}: ShopeeShoppingAnalyticsChartsProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    spend: d.spend,
    revenue: d.revenue,
    purchases: d.purchases,
    impressions: d.impressions,
    new_buyers: d.new_buyers ?? null,
    existing_buyers: d.existing_buyers ?? null,
  }))

  // 신규/기존 구매자 합계 (PieChart용)
  const totalNewBuyers = data.reduce((sum, d) => sum + (d.new_buyers ?? 0), 0)
  const totalExistingBuyers = data.reduce((sum, d) => sum + (d.existing_buyers ?? 0), 0)
  const hasBuyerData = totalNewBuyers + totalExistingBuyers > 0
  const pieData = [
    { name: '신규 구매자', value: totalNewBuyers },
    { name: '기존 구매자', value: totalExistingBuyers },
  ]

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        성과 분석 그래프
      </h3>
      {!hasKrw && currency && (
        <p className="text-muted-foreground text-xs">
          * 환율 미설정 - 현지통화({currency}) 기준
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 그래프 1 – 일별 객단가 분석 (주문수 vs 매출) */}
        <ChartCard
          title="일별 객단가 분석 (주문수 vs 매출)"
          subtitle="일별 주문 건수와 총 매출 추이"
        >
          {data.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmtNum(v)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmtKRW(v)}
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="purchases" name="주문수" fill="#6366F1" />
                <Line
                  yAxisId="right"
                  dataKey="revenue"
                  name="매출"
                  stroke="#10B981"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 2 – 일별 광고 성과 (Spend vs GMV) */}
        <ChartCard
          title="일별 광고 성과 (Spend vs GMV)"
          subtitle="광고비 지출과 거래액(GMV) 추이"
        >
          {data.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmtKRW(v)}
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmtKRW(v)}
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="spend" name="지출금액" fill="#6366F1" />
                <Line
                  yAxisId="right"
                  dataKey="revenue"
                  name="매출"
                  stroke="#10B981"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 3 – 일별 구매 전환 흐름 (방문자 수 vs 주문 수) */}
        <ChartCard
          title="일별 구매 전환 흐름 (방문자 수 vs 주문 수)"
          subtitle="방문자 유입 대비 실제 주문 전환 추이"
        >
          {data.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmtNum(v)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmtNum(v)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="impressions" name="방문자 수" fill="#06B6D4" />
                <Line
                  yAxisId="right"
                  dataKey="purchases"
                  name="주문 수"
                  stroke="#8B5CF6"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 4 – 신규/기존 구매자 비율 (PieChart) */}
        <ChartCard
          title="신규 구매자 / 기존 구매자 비율"
          subtitle="기간 내 신규 vs 기존 구매자 구성"
        >
          {!hasBuyerData ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (value === undefined || value === null) return ['-', name ?? '']
                      const total = totalNewBuyers + totalExistingBuyers
                      return [
                        `${Number(value).toLocaleString()}명 (${total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0}%)`,
                        name ?? '',
                      ]
                    }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-1 flex gap-6 text-xs text-gray-500">
                <span>신규: <strong className="text-gray-700">{totalNewBuyers.toLocaleString()}명</strong></span>
                <span>기존: <strong className="text-gray-700">{totalExistingBuyers.toLocaleString()}명</strong></span>
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
