'use client'

import { fmtKRW, fmtNum } from '@/lib/format'
import type { GmvMaxSummaryDayData } from '@/types/database'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface GmvMaxAnalyticsChartsProps {
  data: GmvMaxSummaryDayData[]
}

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

function EmptyState() {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
      데이터가 없습니다
    </div>
  )
}

function ScatterCustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload
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
      <p style={{ fontWeight: 600, marginBottom: 6, color: '#111827' }}>{d?.date}</p>
      <p style={{ color: '#6366F1', margin: '2px 0' }}>비용: ₩{Math.round(d?.x).toLocaleString()}</p>
      <p style={{ color: '#6366F1', margin: '2px 0' }}>매출: ₩{Math.round(d?.y).toLocaleString()}</p>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const formatValue = (name: string, value: any) => {
    if (value === null || value === undefined) return '-'
    if (['주문당 비용'].includes(name)) return `₩${Math.round(value).toLocaleString()}`
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
      {label && <p style={{ fontWeight: 600, marginBottom: 6, color: '#111827' }}>{label}</p>}
      {payload.map((entry: any, index: number) => (
        <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name}: {formatValue(entry.name, entry.value)}
        </p>
      ))}
    </div>
  )
}

export function GmvMaxAnalyticsCharts({ data }: GmvMaxAnalyticsChartsProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    cost: d.cost,
    gross_revenue: d.gross_revenue,
    roi: d.roi,
    orders: d.orders,
    cost_per_order: d.cost_per_order,
  }))

  const scatterData = data
    .filter((d) => d.cost != null && d.gross_revenue != null)
    .map((d) => ({ x: d.cost!, y: d.gross_revenue!, date: d.date }))

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        성과 분석 그래프
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 차트 1 – 매출 스케일링 (Scatter) */}
        <ChartCard
          title="매출 스케일링"
          subtitle="비용 대비 매출 산점도 – 선형 증가 여부 확인"
        >
          {scatterData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="x"
                  type="number"
                  name="비용"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => fmtKRW(v)}
                  label={{ value: '비용 (Cost)', position: 'insideBottom', offset: -15, fontSize: 11 }}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name="매출"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => fmtKRW(v)}
                  width={80}
                  label={{ value: '매출 (Revenue)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip content={<ScatterCustomTooltip />} />
                <Scatter data={scatterData} fill="#6366F1" r={6} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 차트 2 – 주문 효율 (주문수 Bar + 주문당 비용 Line) */}
        <ChartCard
          title="주문 효율"
          subtitle="주문수 vs 주문당 비용 – 볼륨 증가 시 단가 변화 진단"
        >
          {data.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
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
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="orders" name="주문수" fill="#06B6D4" />
                <Line
                  yAxisId="right"
                  dataKey="cost_per_order"
                  name="주문당 비용"
                  stroke="#EF4444"
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
