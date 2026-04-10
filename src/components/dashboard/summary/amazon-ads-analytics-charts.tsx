'use client'

import { fmtNum, fmtPct, fmtUSD } from '@/lib/format'
import type { AmazonAdsSummaryDayData } from '@/types/database'
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
  data: AmazonAdsSummaryDayData[]
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
    <div className="flex h-75 items-center justify-center text-sm text-gray-400">
      데이터가 없습니다
    </div>
  )
}

function CostTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
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
      {payload.map((entry: any, index: number) => {
        let formatted = entry.value
        if (entry.name === '광고비' || entry.name === '광고매출') {
          formatted = fmtUSD(entry.value)
        } else if (entry.name === 'ACoS') {
          formatted = fmtPct(entry.value)
        } else if (entry.name === '구매수') {
          formatted = fmtNum(entry.value)
        } else if (entry.name === 'ROAS') {
          formatted = (entry.value as number)?.toFixed(2)
        } else if (entry.name === 'CPC') {
          formatted = fmtUSD(entry.value)
        }
        return (
          <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
            {entry.name}: {formatted}
          </p>
        )
      })}
    </div>
  )
}

export function AmazonAdsAnalyticsCharts({ data }: Props) {
  if (!data.length) return null

  const costData = data.map((d) => ({
    date: d.date.slice(5),
    cost: d.cost,
    sales: d.sales,
    acos: d.acos,
  }))

  const roasData = data.map((d) => ({
    date: d.date.slice(5),
    purchases: d.purchases,
    roas: d.roas,
    cpc: d.cpc,
  }))

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
        광고 성과 분석
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 차트 1: 광고 효율 */}
        <ChartCard
          title="광고 효율"
          subtitle="광고비/광고매출(막대) vs ACoS%(선)"
        >
          {costData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={costData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  width={65}
                  tickFormatter={(v) => fmtUSD(v)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  width={50}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <Tooltip content={<CostTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="cost" name="광고비" fill="#3B82F6" opacity={0.7} />
                <Bar yAxisId="left" dataKey="sales" name="광고매출" fill="#22C55E" opacity={0.7} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="acos"
                  name="ACoS"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 차트 2: ROAS 스케일링 */}
        <ChartCard
          title="ROAS 스케일링"
          subtitle="구매수(막대) vs ROAS & CPC(선)"
        >
          {roasData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={roasData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={45} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  width={55}
                  tickFormatter={(v) => v.toFixed(2)}
                />
                <Tooltip content={<CostTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="purchases" name="구매수" fill="#6366F1" opacity={0.7} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="roas"
                  name="ROAS"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cpc"
                  name="CPC"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
