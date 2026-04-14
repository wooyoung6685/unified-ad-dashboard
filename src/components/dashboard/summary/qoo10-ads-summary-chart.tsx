'use client'

import { fmtNum, fmtPct } from '@/lib/format'
import type { Qoo10AdsSummaryDayData } from '@/types/database'
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

const fmtJPY = (v: number) => `¥${Math.round(v).toLocaleString('ko-KR')}`

type MetricMeta = { label: string; format: 'jpy' | 'pct' | 'number' | 'ratio' }

const METRIC_META: Record<string, MetricMeta> = {
  cost: { label: '광고비', format: 'jpy' },
  sales: { label: '광고매출', format: 'jpy' },
  roas: { label: 'ROAS', format: 'ratio' },
  ctr: { label: 'CTR', format: 'pct' },
  cart_conversion_rate: { label: '카트전환율', format: 'pct' },
  purchase_conversion_rate: { label: '구매전환율', format: 'pct' },
  impressions: { label: '노출수', format: 'number' },
  clicks: { label: '클릭수', format: 'number' },
  carts: { label: '카트수', format: 'number' },
  purchases: { label: '구매수', format: 'number' },
  cpc: { label: 'CPC', format: 'jpy' },
}

function formatTick(value: number, key: string): string {
  const fmt = METRIC_META[key]?.format
  if (fmt === 'jpy') return fmtJPY(value)
  if (fmt === 'pct') return fmtPct(value)
  if (fmt === 'ratio') return `${value.toFixed(2)}x`
  return fmtNum(value)
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{METRIC_META[entry.dataKey]?.label ?? entry.dataKey}:</span>
          <span className="font-semibold tabular-nums">{formatTick(entry.value, entry.dataKey)}</span>
        </div>
      ))}
    </div>
  )
}

const COLORS = ['#f97316', '#22c55e', '#6366f1', '#F59E0B']

interface Props {
  data: Qoo10AdsSummaryDayData[]
  selectedMetrics: string[]
}

export function Qoo10AdsSummaryChart({ data, selectedMetrics }: Props) {
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
      <LineChart data={data} margin={{ top: 8, right: hasRight ? 16 : 8, left: 8, bottom: 4 }}>
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
        <Legend formatter={(value: string) => METRIC_META[value]?.label ?? value} />
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
