'use client'

import type { DailyStatRow } from '@/types/database'
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface RechartsChartProps {
  data: DailyStatRow[]
}

export default function RechartsChart({ data }: RechartsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)} // MM-DD 형식
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(v: number) => `₩${(v / 1000).toFixed(0)}K`}
          tick={{ fontSize: 12 }}
          width={70}
        />
        <Tooltip
          formatter={(v: unknown) =>
            `₩${Number(v).toLocaleString('ko-KR')}`
          }
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="totalSpend"
          stroke="#3b82f6"
          name="지출"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="totalRevenue"
          stroke="#22c55e"
          name="매출"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
