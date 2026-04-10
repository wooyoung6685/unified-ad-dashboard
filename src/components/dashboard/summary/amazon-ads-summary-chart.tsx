'use client'

import { fmtNum, fmtPct, fmtUSD } from '@/lib/format'
import type { AmazonAdsSummaryDayData } from '@/types/database'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const METRIC_META: Record<string, { label: string; format: string }> = {
  cost: { label: '광고비', format: 'currency' },
  sales: { label: '광고매출', format: 'currency' },
  acos: { label: 'ACoS', format: 'percent' },
  roas: { label: 'ROAS', format: 'ratio_pct' },
  cpc: { label: 'CPC', format: 'currency' },
  ctr: { label: 'CTR', format: 'percent' },
  purchases: { label: '구매수', format: 'number' },
  purchases_new_to_brand: { label: '신규고객 구매', format: 'number' },
  impressions: { label: '노출수', format: 'number' },
  clicks: { label: '클릭수', format: 'number' },
  cost_per_purchase: { label: '구매당 비용', format: 'currency' },
}

function formatTick(value: number, key: string): string {
  switch (METRIC_META[key]?.format) {
    case 'percent':
      return fmtPct(value)
    case 'ratio_pct':
      return fmtPct(value * 100)
    case 'currency':
      return fmtUSD(value)
    default:
      return fmtNum(value)
  }
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string; dataKey: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {METRIC_META[entry.dataKey]?.label ?? entry.dataKey}:
          </span>
          <span className="font-semibold tabular-nums">
            {formatTick(entry.value, entry.dataKey)}
          </span>
        </div>
      ))}
    </div>
  )
}

const COLORS = ['#3b82f6', '#22c55e', '#F59E0B', '#6366F1']

interface AmazonAdsSummaryChartProps {
  data: AmazonAdsSummaryDayData[]
  selectedMetrics: string[]
}

export function AmazonAdsSummaryChart({ data, selectedMetrics }: AmazonAdsSummaryChartProps) {
  if (!data.length || !selectedMetrics.length) {
    return (
      <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
        KPI 지표를 선택하면 차트가 표시됩니다
      </div>
    )
  }

  const leftFormat = METRIC_META[selectedMetrics[0]]?.format
  const leftMetrics: string[] = []
  const rightMetrics: string[] = []

  selectedMetrics.forEach((m) => {
    const fmt = METRIC_META[m]?.format
    if (fmt === leftFormat) {
      leftMetrics.push(m)
    } else {
      rightMetrics.push(m)
    }
  })

  const hasRight = rightMetrics.length > 0

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart
        data={data}
        margin={{ top: 8, right: hasRight ? 16 : 8, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          yAxisId="left"
          tickFormatter={(v: number) => formatTick(v, leftMetrics[0])}
          tick={{ fontSize: 11 }}
          width={80}
          className="text-muted-foreground"
        />
        {hasRight && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v: number) => formatTick(v, rightMetrics[0])}
            tick={{ fontSize: 11 }}
            width={80}
            className="text-muted-foreground"
          />
        )}
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => METRIC_META[value]?.label ?? value}
        />
        {leftMetrics.map((m, i) => (
          <Line
            key={m}
            yAxisId="left"
            type="monotone"
            dataKey={m}
            stroke={COLORS[i]}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS[i] }}
            activeDot={{ r: 5 }}
            name={m}
          />
        ))}
        {rightMetrics.map((m, i) => (
          <Line
            key={m}
            yAxisId="right"
            type="monotone"
            dataKey={m}
            stroke={COLORS[leftMetrics.length + i]}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS[leftMetrics.length + i] }}
            activeDot={{ r: 5 }}
            name={m}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
