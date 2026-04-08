'use client'

import { fmtKRW, fmtNum } from '@/lib/format'
import type { SummaryDayData } from '@/types/database'
import { ChevronDown } from 'lucide-react'
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

interface AnalysisChartsProps {
  data: SummaryDayData[]
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

// 비용 효율 툴팁
function CostTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  const fmt = (name: string, value: any) => {
    if (value === null || value === undefined) return '-'
    return `₩${Math.round(value).toLocaleString()}`
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
          {entry.name}: {fmt(entry.name, entry.value)}
        </p>
      ))}
    </div>
  )
}

const FUNNEL_GRADIENTS = [
  { id: 'funnel-0', from: '#818CF8', to: '#6366F1', text: '#EEF2FF' },
  { id: 'funnel-1', from: '#60A5FA', to: '#3B82F6', text: '#EFF6FF' },
  { id: 'funnel-2', from: '#34D399', to: '#10B981', text: '#ECFDF5' },
  { id: 'funnel-3', from: '#FBBF24', to: '#F59E0B', text: '#FFFBEB' },
]

// 커스텀 퍼널 차트 컴포넌트 (수평 바 기반)
function CustomFunnel({ data }: { data: ReturnType<typeof buildFunnelData> }) {
  const widths = [100, 70, 45, 25]
  return (
    <div className="flex flex-col items-center gap-0 py-2">
      {data.map((step, i) => (
        <div key={step.name} className="flex w-full flex-col items-center">
          {/* 퍼널 바 */}
          <div
            className="group relative"
            style={{ width: `${widths[i]}%`, minWidth: 100 }}
          >
            <div
              className="flex h-[52px] cursor-default items-center justify-between rounded-xl px-4 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:brightness-105"
              style={{
                background: `linear-gradient(135deg, ${FUNNEL_GRADIENTS[i].from}, ${FUNNEL_GRADIENTS[i].to})`,
              }}
            >
              <span className="text-[13px] font-semibold text-white/90">
                {step.name}
              </span>
              <span className="text-[13px] font-bold text-white">
                {fmtNum(step.actualValue)}
              </span>
            </div>
            {/* hover 툴팁: 마지막 항목은 위쪽으로 표시 */}
            <div
              className={`invisible absolute left-1/2 z-20 min-w-[180px] -translate-x-1/2 rounded-lg border border-gray-100 bg-white px-3.5 py-2.5 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100 ${
                i === data.length - 1
                  ? 'bottom-full mb-2'
                  : 'top-full mt-2'
              }`}
            >
              <p className="mb-1.5 text-[12px] font-semibold text-gray-900">
                {step.name}
              </p>
              <p className="text-[11px] text-gray-600">
                수량:{' '}
                <span className="font-medium text-gray-900">
                  {fmtNum(step.actualValue)}
                </span>
              </p>
              {step.convRate != null && (
                <p className="text-[11px] text-gray-500">
                  이전 단계 대비:{' '}
                  <span className="font-medium">{step.convRate.toFixed(1)}%</span>
                </p>
              )}
              <p className="text-[11px] text-gray-500">
                전체 대비:{' '}
                <span className="font-medium">{step.totalRate.toFixed(1)}%</span>
              </p>
            </div>
          </div>
          {/* 단계 간 커넥터 */}
          {i < data.length - 1 && (
            <div className="flex flex-col items-center py-0.5">
              <ChevronDown className="h-4 w-4 text-gray-300" />
              {data[i + 1].convRate != null && (
                <span className="text-[10px] font-semibold text-gray-400">
                  {data[i + 1].convRate!.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// funnelData 생성 로직 분리 (CustomFunnel 타입 참조용)
function buildFunnelData(
  totals: {
    impressions: number
    outbound_clicks: number
    content_views: number
    purchases: number
  },
  funnelSteps: { key: keyof typeof totals; label: string }[],
) {
  return funnelSteps.map((step, i) => {
    const value = totals[step.key]
    const prevValue = i > 0 ? totals[funnelSteps[i - 1].key] : null
    return {
      name: step.label,
      actualValue: value,
      convRate: prevValue && prevValue > 0 ? (value / prevValue) * 100 : null,
      totalRate:
        totals.impressions > 0 ? (value / totals.impressions) * 100 : 0,
    }
  })
}

export { AnalysisCharts as MetaAnalyticsCharts }

export function AnalysisCharts({ data }: AnalysisChartsProps) {
  // 전체 기간 합산 (퍼널 차트용)
  const totals = data.reduce(
    (acc, d) => ({
      impressions: acc.impressions + (d.impressions ?? 0),
      outbound_clicks: acc.outbound_clicks + (d.outbound_clicks ?? 0),
      content_views: acc.content_views + (d.content_views ?? 0),
      purchases: acc.purchases + (d.purchases ?? 0),
    }),
    { impressions: 0, outbound_clicks: 0, content_views: 0, purchases: 0 },
  )

  const funnelSteps = [
    { key: 'impressions' as const, label: '노출' },
    { key: 'outbound_clicks' as const, label: '클릭' },
    { key: 'content_views' as const, label: '조회' },
    { key: 'purchases' as const, label: '구매' },
  ]

  const funnelData = buildFunnelData(totals, funnelSteps)

  // 일별 비용 효율 데이터 (비용 효율 차트용)
  const costData = data.map((d) => ({
    date: d.date.slice(5),
    cpc: d.cpc,
    cpm:
      d.cpm ??
      (d.spend != null && d.impressions != null && d.impressions > 0
        ? (d.spend / d.impressions) * 1000
        : null),
    cpa: d.cpa,
  }))

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        성과 분석 그래프
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 그래프 1 – 퍼널 구조 */}
        <ChartCard
          title="퍼널 구조"
          subtitle="노출 → 클릭 → 조회 → 구매 전환 흐름 및 각 단계 전환율"
        >
          {data.length === 0 || totals.impressions === 0 ? (
            <EmptyState />
          ) : (
            <CustomFunnel data={funnelData} />
          )}
        </ChartCard>

        {/* 그래프 2 – 비용 효율 */}
        <ChartCard
          title="비용 효율"
          subtitle="CPC · CPM · 구매당 비용(CPA) 일별 추이"
        >
          {data.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={costData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmtKRW(v)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmtKRW(v)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CostTooltip />} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="cpc" name="CPC" fill="#3B82F6" />
                <Bar yAxisId="left" dataKey="cpm" name="CPM" fill="#10B981" />
                <Line
                  yAxisId="right"
                  dataKey="cpa"
                  name="CPA"
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
