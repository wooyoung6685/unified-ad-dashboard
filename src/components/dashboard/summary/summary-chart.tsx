'use client'

import { fmtDec, fmtKRW, fmtNum, fmtPct } from '@/lib/format'
import type { GmvMaxSummaryDayData, SummaryDayData } from '@/types/database'
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
  roas: { label: 'ROAS', format: 'ratio_pct' },
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
  video_views: { label: '영상조회수', format: 'number' },
  aov: { label: '객단가 (KRW)', format: 'currency' },
  // GMV Max 전용 지표
  cost: { label: '비용', format: 'currency' },
  gross_revenue: { label: '매출', format: 'currency' },
  roi: { label: 'ROI', format: 'ratio_pct' },
  orders: { label: '주문수', format: 'number' },
  cost_per_order: { label: '주문당 비용', format: 'currency' },
}

// 플랫폼별 라벨 오버라이드
const PLATFORM_LABEL_OVERRIDES: Record<string, Record<string, string>> = {
  shopee_shopping: {
    ctr: '전환율',
    impressions: '방문자수',
    clicks: '페이지뷰',
    purchases: '결제건수',
    spend: '지출금액 (KRW)',
    revenue: '매출 (KRW)',
    aov: '객단가 (KRW)',
  },
  shopee_inapp: {
    spend: '지출 (KRW)',
    revenue: '매출 GMV (KRW)',
    purchases: '구매(전환)수',
  },
}

function formatTick(value: number, key: string): string {
  switch (METRIC_META[key]?.format) {
    case 'percent':
      return fmtPct(value)
    case 'ratio_pct':
      return fmtPct(value * 100)
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
  data: SummaryDayData[] | GmvMaxSummaryDayData[]
  selectedMetrics: string[]
  platform: 'meta' | 'tiktok' | 'shopee_shopping' | 'shopee_inapp' | null
}

const COLORS = ['#3b82f6', '#22c55e', '#F59E0B', '#6366F1']

export function SummaryChart({ data, selectedMetrics, platform }: SummaryChartProps) {
  if (!data.length || !selectedMetrics.length) {
    return (
      <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
        KPI 지표를 선택하면 차트가 표시됩니다
      </div>
    )
  }

  // 포맷별로 Y축 그룹 분류: 같은 포맷의 지표는 같은 Y축 공유
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

        {/* 좌측 Y축 */}
        <YAxis
          yAxisId="left"
          tickFormatter={(v: number) => formatTick(v, leftMetrics[0])}
          tick={{ fontSize: 11 }}
          width={80}
          className="text-muted-foreground"
        />

        {/* 우측 Y축 (다른 포맷의 지표가 있을 때만) */}
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
          formatter={(value: string) => {
            const overrides = platform ? PLATFORM_LABEL_OVERRIDES[platform] : undefined
            return overrides?.[value] ?? METRIC_META[value]?.label ?? value
          }}
        />

        {/* 좌측 Y축 라인들 */}
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

        {/* 우측 Y축 라인들 */}
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
