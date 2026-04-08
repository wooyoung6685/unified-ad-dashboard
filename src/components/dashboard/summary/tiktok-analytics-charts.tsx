'use client'

import { fmtNum, fmtPct } from '@/lib/format'
import type { SummaryDayData } from '@/types/database'
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

// 공통 툴팁
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  const formatValue = (name: string, value: any) => {
    if (value === null || value === undefined) return '-'
    if (name === 'CTR (랜딩)') return `${value.toFixed(2)}%`
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
    impressions: d.impressions,
    video_views: d.video_views,
    views_2s: d.views_2s,
    views_6s: d.views_6s,
    views_25pct: d.views_25pct,
    views_100pct: d.views_100pct,
    ctr: d.ctr,
    clicks: d.clicks,
  }))

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        성과 분석 그래프
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 그래프 1 – 노출 vs 조회수 */}
        <ChartCard
          title="노출 vs 조회수"
          subtitle="노출수 대비 동영상 조회수 추이"
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
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="impressions"
                  name="노출수"
                  fill="#D1D5DB"
                />
                <Line
                  yAxisId="right"
                  dataKey="video_views"
                  name="동영상 조회수"
                  stroke="#6366F1"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 2 – 조회수 vs 2초 vs 6초 */}
        <ChartCard
          title="조회수 vs 2초 vs 6초"
          subtitle="동영상 시청 초기 이탈 구간 분석"
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
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="video_views"
                  name="동영상 조회수"
                  fill="#D1D5DB"
                />
                <Bar
                  yAxisId="left"
                  dataKey="views_2s"
                  name="2초 조회수"
                  fill="#06B6D4"
                />
                <Line
                  yAxisId="left"
                  dataKey="views_6s"
                  name="6초 조회수"
                  stroke="#6366F1"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 3 – 6초 vs 25% vs 100% */}
        <ChartCard
          title="6초 vs 25% vs 100%"
          subtitle="동영상 시청 완료율 퍼널 분석"
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
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="views_6s"
                  name="6초 조회수"
                  fill="#06B6D4"
                />
                <Bar
                  yAxisId="left"
                  dataKey="views_25pct"
                  name="25% 조회수"
                  fill="#10B981"
                />
                <Line
                  yAxisId="left"
                  dataKey="views_100pct"
                  name="100% 조회수"
                  stroke="#6366F1"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 4 – CTR vs 클릭수(랜딩) */}
        <ChartCard
          title="CTR vs 클릭수 (랜딩)"
          subtitle="클릭률과 클릭 볼륨 상관관계"
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
                  tickFormatter={(v) => fmtPct(v)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="clicks"
                  name="클릭수 (랜딩)"
                  fill="#9CA3AF"
                />
                <Line
                  yAxisId="right"
                  dataKey="ctr"
                  name="CTR (랜딩)"
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
