'use client'

import { fmtKRW, fmtNum, fmtPct } from '@/lib/format'
import type { SummaryDayData } from '@/types/database'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
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

// 퍼널 차트 툴팁
function FunnelTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const item = payload[0].payload
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
      <p style={{ fontWeight: 600, marginBottom: 6, color: '#111827' }}>
        {item.name}
      </p>
      <p style={{ margin: '2px 0' }}>수량: {fmtNum(item.actualValue)}</p>
      {item.convRate != null && (
        <p style={{ margin: '2px 0', color: '#6B7280' }}>
          이전 단계 대비: {item.convRate.toFixed(1)}%
        </p>
      )}
      <p style={{ margin: '2px 0', color: '#6B7280' }}>
        전체 대비: {item.totalRate.toFixed(1)}%
      </p>
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

const FUNNEL_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B']

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

  // 시각적 비율 보정: 실제 값 차이가 극단적이므로 단계별 최소 너비 보장
  const funnelData = funnelSteps.map((step, i) => {
    const value = totals[step.key]
    const prevValue = i > 0 ? totals[funnelSteps[i - 1].key] : null
    // 시각적 너비: 100 → 70 → 45 → 25 (고정 비율로 점점 좁아지는 형태)
    const displayValue = [100, 70, 45, 25][i]
    return {
      name: step.label,
      value: displayValue,
      actualValue: value,
      fill: FUNNEL_COLORS[i],
      convRate: prevValue && prevValue > 0 ? (value / prevValue) * 100 : null,
      totalRate:
        totals.impressions > 0 ? (value / totals.impressions) * 100 : 0,
      label: `${fmtNum(value)}${prevValue && prevValue > 0 ? ` (${((value / prevValue) * 100).toFixed(1)}%)` : ''}`,
    }
  })

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
            <>
              <ResponsiveContainer width="100%" height={280}>
                <FunnelChart>
                  <Tooltip content={<FunnelTooltip />} />
                  <Funnel
                    dataKey="value"
                    nameKey="name"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList
                      dataKey="label"
                      position="right"
                      style={{ fill: '#374151', fontSize: 11 }}
                    />
                    {funnelData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              {/* 커스텀 범례 */}
              <div className="mt-2 flex items-center justify-center gap-4">
                {funnelData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="text-xs text-gray-500">{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
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
