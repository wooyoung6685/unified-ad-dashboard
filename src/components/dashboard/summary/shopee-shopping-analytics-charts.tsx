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

interface ShopeeShoppingAnalyticsChartsProps {
  data: SummaryDayData[]
  hasKrw: boolean
  currency: string | null
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

// ComposedChart 공통 툴팁
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  const formatValue = (name: string, value: any) => {
    if (value === null || value === undefined) return '-'
    if (['ROAS', '전환율'].includes(name)) return `${Number(value).toFixed(2)}%`
    if (['GMV', '매출', '지출금액', '광고비', '객단가', 'CPC'].includes(name))
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
      <p style={{ color: '#10B981', margin: '2px 0' }}>
        광고비: ₩{Math.round(d?.x ?? 0).toLocaleString()}
      </p>
      <p style={{ color: '#10B981', margin: '2px 0' }}>
        GMV: ₩{Math.round(d?.y ?? 0).toLocaleString()}
      </p>
    </div>
  )
}

export function ShopeeShoppingAnalyticsCharts({
  data,
  hasKrw,
  currency,
}: ShopeeShoppingAnalyticsChartsProps) {
  // Composed 차트용 데이터 (MM-DD 날짜 포맷)
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    fullDate: d.date,
    spend: d.spend,
    revenue: d.revenue,
    purchases: d.purchases,
    impressions: d.impressions,
    clicks: d.clicks,
    aov: d.aov,
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
      {!hasKrw && currency && (
        <p className="text-muted-foreground text-xs">
          * 환율 미설정 - 현지통화({currency}) 기준
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 그래프 1 – 투자 성과 (Scatter) */}
        <ChartCard
          title="투자 성과 (Spend vs GMV)"
          subtitle="광고비 대비 거래액(GMV) 분포"
        >
          {data.length === 0 || scatterData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="x"
                  type="number"
                  name="광고비"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => fmtKRW(v)}
                  label={{
                    value: '광고비',
                    position: 'insideBottom',
                    offset: -15,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name="GMV"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => fmtKRW(v)}
                  width={80}
                  label={{
                    value: 'GMV',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<ScatterCustomTooltip />} />
                <Scatter data={scatterData} fill="#10B981" r={6} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 2 – 매출 분석 (결제수 Bar + GMV Line) */}
        <ChartCard
          title="매출 분석 (결제수 vs GMV)"
          subtitle="결제 건수와 총 매출의 추이"
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
                  tickFormatter={(v) => fmtKRW(v)}
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="purchases" name="결제건수" fill="#6366F1" />
                <Line
                  yAxisId="right"
                  dataKey="revenue"
                  name="GMV"
                  stroke="#10B981"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 3 – 객단가 분석 (주문수 Bar + AOV Line) */}
        <ChartCard
          title="객단가 분석 (주문수 vs AOV)"
          subtitle="주문수 증가에 따른 객단가 변화"
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
                  tickFormatter={(v) => fmtKRW(v)}
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="purchases" name="주문수" fill="#6B7280" />
                <Line
                  yAxisId="right"
                  dataKey="aov"
                  name="객단가"
                  stroke="#EF4444"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 그래프 4 – 트래픽 품질 (방문자 vs PV) */}
        <ChartCard
          title="트래픽 품질 (방문자 vs PV)"
          subtitle="방문자당 페이지뷰(Depth) 확인"
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
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="clicks" name="페이지뷰" fill="#D1D5DB" />
                <Line
                  yAxisId="right"
                  dataKey="impressions"
                  name="방문자수"
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
