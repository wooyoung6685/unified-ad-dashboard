'use client'

import { fmtKRW, fmtNum } from '@/lib/format'
import type { SummaryDayData } from '@/types/database'
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

interface ShopeeInappAnalyticsChartsProps {
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
    if (['지출금액', '매출 GMV'].includes(name))
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

export function ShopeeInappAnalyticsCharts({
  data,
  hasKrw,
  currency,
}: ShopeeInappAnalyticsChartsProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    expense: d.spend,
    revenue: d.revenue,
    impressions: d.impressions,
    clicks: d.clicks,
  }))

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
        {/* 그래프 1 – 지출금액 vs 매출 */}
        <ChartCard
          title="지출금액 vs 매출"
          subtitle="광고비 지출 대비 GMV 매출 추이"
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
                <Bar yAxisId="left" dataKey="expense" name="지출금액" fill="#6366F1" />
                <Line
                  yAxisId="right"
                  dataKey="revenue"
                  name="매출 GMV"
                  stroke="#10B981"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 2 – 노출 vs 클릭 */}
        <ChartCard
          title="노출 vs 클릭"
          subtitle="광고 노출량 대비 클릭 반응 추이"
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
                <Bar yAxisId="left" dataKey="impressions" name="노출" fill="#06B6D4" />
                <Line
                  yAxisId="right"
                  dataKey="clicks"
                  name="클릭"
                  stroke="#8B5CF6"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
