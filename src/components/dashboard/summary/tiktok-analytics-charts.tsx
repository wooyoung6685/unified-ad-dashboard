'use client'

import { fmtKRW, fmtNum } from '@/lib/format'
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

interface TiktokAnalyticsChartsProps {
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
    <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
      데이터가 없습니다
    </div>
  )
}

// ScatterChart 전용 툴팁
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

// ComposedChart 공통 툴팁 (TikTok 전용 포맷)
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  const formatValue = (name: string, value: any) => {
    if (value === null || value === undefined) return '-'
    if (['CPC', 'CPA'].includes(name))
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

export function TiktokAnalyticsCharts({ data }: TiktokAnalyticsChartsProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    spend: d.spend,
    revenue: d.revenue,
    views_2s: d.views_2s,
    views_6s: d.views_6s,
    views_100pct: d.views_100pct,
    cpc: d.cpc,
    cpa: d.cpa,
    video_views: d.video_views,
    clicks: d.clicks,
  }))

  const scatterData = data
    .filter((d) => d.spend != null && d.revenue != null)
    .map((d) => ({ x: d.spend!, y: d.revenue!, date: d.date }))

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        성과 분석 그래프
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 그래프 1 – 매출 스케일링 (Scatter) */}
        <ChartCard
          title="매출 스케일링"
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

        {/* 그래프 2 – 동영상 조회 퍼널 */}
        <ChartCard
          title="동영상 조회 퍼널"
          subtitle="2초 / 6초 / 100% 조회수 – 시청 완료율 진단"
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
                  tickFormatter={(v) => fmtNum(v)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar
                  dataKey="views_2s"
                  name="2초조회수"
                  fill="#D1D5DB"
                  yAxisId="left"
                />
                <Bar
                  dataKey="views_6s"
                  name="6초조회수"
                  fill="#06B6D4"
                  yAxisId="left"
                />
                <Line
                  dataKey="views_100pct"
                  name="100%조회수"
                  stroke="#6366F1"
                  yAxisId="left"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 3 – 랜딩 효율 (CPC Bar + CPA Line) */}
        <ChartCard
          title="랜딩 효율"
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
                <Bar
                  yAxisId="left"
                  dataKey="cpc"
                  name="CPC"
                  fill="#EF4444"
                />
                <Line
                  yAxisId="right"
                  dataKey="cpa"
                  name="CPA"
                  stroke="#10B981"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 4 – 반응성 (영상조회수 Bar + 클릭수 Line) */}
        <ChartCard
          title="반응성"
          subtitle="영상조회수 vs 클릭수 – 소재 흡입력과 랜딩 전환 상관관계"
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
                  tickFormatter={(v) => fmtNum(v)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmtNum(v)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="video_views"
                  name="영상조회수"
                  fill="#9CA3AF"
                />
                <Line
                  yAxisId="right"
                  dataKey="clicks"
                  name="클릭수"
                  stroke="#6366F1"
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
