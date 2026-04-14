'use client'

import { fmtNum, fmtPct } from '@/lib/format'
import type { Qoo10OrganicSummaryDayData } from '@/types/database'
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

const fmtJPY = (v: number) => `¥${Math.round(v).toLocaleString('ko-KR')}`

interface Props {
  data: Qoo10OrganicSummaryDayData[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((entry: any) => {
        let formatted = entry.value
        if (entry.name === '거래금액(JPY)') formatted = fmtJPY(entry.value)
        else if (entry.name === '유입자수' || entry.name === '거래수량') formatted = fmtNum(entry.value)
        else if (entry.name === '전환율') formatted = fmtPct(entry.value)
        return (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold tabular-nums">{formatted}</span>
          </div>
        )
      })}
    </div>
  )
}

export function Qoo10OrganicSummaryChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
        데이터가 없습니다
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    amount_jpy: d.transaction_amount_jpy,
    visitors: d.visitors,
    conversion_rate: d.conversion_rate,
  }))

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 60, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <YAxis
          yAxisId="left"
          tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}K`}
          tick={{ fontSize: 11 }}
          width={70}
          className="text-muted-foreground"
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v) => fmtNum(v)}
          tick={{ fontSize: 11 }}
          width={60}
          className="text-muted-foreground"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar
          yAxisId="left"
          dataKey="amount_jpy"
          name="거래금액(JPY)"
          fill="#f97316"
          opacity={0.75}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="visitors"
          name="유입자수"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3, fill: '#6366f1' }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="conversion_rate"
          name="전환율"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 3, fill: '#22c55e' }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
