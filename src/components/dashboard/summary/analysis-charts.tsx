'use client'

import { fmtDec, fmtKRW, fmtPct } from '@/lib/format'
import type { SummaryDayData } from '@/types/database'
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

// ComposedChart 3개 공통 툴팁
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  const formatValue = (name: string, value: any) => {
    if (value === null || value === undefined) return '-'
    if (['ROAS', 'CTR'].includes(name)) return `${Number(value).toFixed(2)}%`
    if (['빈도', '평균재생시간'].includes(name)) return Number(value).toFixed(2)
    if (['지출', '매출', 'CPC', 'CPA', 'CPM'].includes(name))
      return `₩${Math.round(value).toLocaleString()}`
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
      {label && (
        <p style={{ fontWeight: 600, marginBottom: 6, color: '#111827' }}>
          {label}
        </p>
      )}
      {payload.map((entry: any, index: number) => (
        <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name}: {formatValue(entry.name, entry.value)}
        </p>
      ))}
    </div>
  )
}

// ScatterChart 전용 툴팁
// scatterData 구조가 { x, y, date } 이므로 spend→x, revenue→y 사용
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
      <p style={{ fontWeight: 600, marginBottom: 6, color: '#111827' }}>
        {d?.date}
      </p>
      <p style={{ color: '#6366F1', margin: '2px 0' }}>
        지출: ₩{Math.round(d?.x).toLocaleString()}
      </p>
      <p style={{ color: '#6366F1', margin: '2px 0' }}>
        매출: ₩{Math.round(d?.y).toLocaleString()}
      </p>
    </div>
  )
}

export { AnalysisCharts as MetaAnalyticsCharts }

export function AnalysisCharts({ data }: AnalysisChartsProps) {
  // Composed 차트용 데이터 변환
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    fullDate: d.date,
    spend: d.spend,
    revenue: d.revenue,
    cpm:
      d.spend != null && d.impressions != null && d.impressions > 0
        ? (d.spend / d.impressions) * 1000
        : null,
    ctr: d.ctr,
    cpc: d.cpc,
    cpa: d.cpa,
    frequency: d.frequency,
    roas: d.roas,
  }))

  // Scatter 차트용 데이터 (spend/revenue 모두 있는 날짜만)
  const scatterData = data
    .filter((d) => d.spend != null && d.revenue != null)
    .map((d) => ({ x: d.spend!, y: d.revenue!, date: d.date }))

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        성과 분석 그래프
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 그래프 1 – 스케일링 진단 (Scatter) */}
        <ChartCard
          title="스케일링 진단"
          subtitle="지출 대비 매출 산점도 – 선형 증가 여부 확인"
        >
          {data.length === 0 || scatterData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart
                margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="x"
                  type="number"
                  name="지출"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => fmtKRW(v)}
                  label={{
                    value: '지출 (Spend)',
                    position: 'insideBottom',
                    offset: -15,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name="매출"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => fmtKRW(v)}
                  width={80}
                  label={{
                    value: '매출 (Sales)',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<ScatterCustomTooltip />} />
                <Scatter data={scatterData} fill="#6366F1" r={6} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 2 – 경쟁/단가 진단 (CPM Bar + CTR Line) */}
        <ChartCard
          title="경쟁 / 단가 진단"
          subtitle="CPM(노출단가) vs CTR(클릭률) – 경쟁 강도 vs 소재 흡입력"
        >
          {data.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={chartData}
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
                  tickFormatter={(v) => fmtPct(v)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar yAxisId="left" dataKey="cpm" name="CPM" fill="#9CA3AF" />
                <Line
                  yAxisId="right"
                  dataKey="ctr"
                  name="CTR"
                  stroke="#10B981"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 3 – 퍼널 비용 비교 (CPC Bar + CPA Line) */}
        <ChartCard
          title="퍼널 비용 비교"
          subtitle="CPC(클릭당 비용) vs CPA(전환당 비용) – 퍼널 효율 진단"
        >
          {data.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={chartData}
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
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar yAxisId="left" dataKey="cpc" name="CPC" fill="#06B6D4" />
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

        {/* 그래프 4 – 피로도 분석 (빈도 Bar + ROAS Line) */}
        <ChartCard
          title="피로도 분석"
          subtitle="빈도(Frequency) vs ROAS – 광고 피로도와 수익성 상관관계"
        >
          {data.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmtDec(v)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="frequency"
                  name="빈도"
                  fill="#A78BFA"
                />
                <Line
                  yAxisId="right"
                  dataKey="roas"
                  name="ROAS"
                  stroke="#F59E0B"
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
