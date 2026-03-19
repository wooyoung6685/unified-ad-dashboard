'use client'

import { fmtDec, fmtKRW, fmtNum, fmtPct } from '@/lib/format'
import type { SummaryDayData } from '@/types/database'
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

// 지표 메타 (라벨 + 포맷)
const METRIC_META: Record<string, { label: string; format: string }> = {
  roas: { label: 'ROAS', format: 'percent' },
  frequency: { label: '빈도', format: 'decimal' },
  ctr: { label: 'CTR', format: 'percent' },
  cpc: { label: 'CPC', format: 'currency' },
  cpa: { label: 'CPA', format: 'currency' },
  spend: { label: '지출금액', format: 'currency' },
  revenue: { label: '매출', format: 'currency' },
  impressions: { label: '노출수', format: 'number' },
  reach: { label: '도달수', format: 'number' },
  clicks: { label: '클릭수', format: 'number' },
  purchases: { label: '구매(전환)수', format: 'number' },
  add_to_cart: { label: '장바구니 담기', format: 'number' },
}

function formatTick(value: number, key: string): string {
  switch (METRIC_META[key]?.format) {
    case 'percent':
      return fmtPct(value)
    case 'decimal':
      return fmtDec(value)
    case 'currency':
      return fmtKRW(value)
    default:
      return fmtNum(value)
  }
}

// 커스텀 툴팁
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
      {payload.map((entry) => {
        const meta = METRIC_META[entry.dataKey]
        const formatted = formatTick(entry.value, entry.dataKey)
        return (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {meta?.label ?? entry.dataKey}:
            </span>
            <span className="font-semibold tabular-nums">{formatted}</span>
          </div>
        )
      })}
    </div>
  )
}

interface SummaryChartProps {
  data: SummaryDayData[]
  selectedMetrics: string[]
  platform: 'meta' | 'tiktok' | null
}

const COLORS = ['#F59E0B', '#6366F1']

export function SummaryChart({ data, selectedMetrics }: SummaryChartProps) {
  if (!data.length || !selectedMetrics.length) {
    return (
      <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
        KPI 지표를 선택하면 차트가 표시됩니다
      </div>
    )
  }

  const metric0 = selectedMetrics[0]
  const metric1 = selectedMetrics[1]

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />

        {/* 첫 번째 Y축 (왼쪽) */}
        <YAxis
          yAxisId="left"
          tickFormatter={(v: number) => formatTick(v, metric0)}
          tick={{ fontSize: 11 }}
          width={80}
          className="text-muted-foreground"
        />

        {/* 두 번째 Y축 (오른쪽, 2개 선택 시만) */}
        {metric1 && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v: number) => formatTick(v, metric1)}
            tick={{ fontSize: 11 }}
            width={80}
            className="text-muted-foreground"
          />
        )}

        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) =>
            METRIC_META[value]?.label ?? value
          }
        />

        {/* 첫 번째 라인 */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey={metric0}
          stroke={COLORS[0]}
          strokeWidth={2}
          dot={{ r: 3, fill: COLORS[0] }}
          activeDot={{ r: 5 }}
          name={metric0}
        />

        {/* 두 번째 라인 */}
        {metric1 && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={metric1}
            stroke={COLORS[1]}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS[1] }}
            activeDot={{ r: 5 }}
            name={metric1}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
