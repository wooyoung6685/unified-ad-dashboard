'use client'

import { fmtNum, fmtPct, fmtUSD } from '@/lib/format'
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

interface Props {
  data: SummaryDayData[]
}

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

function EmptyState() {
  return (
    <div className="flex h-75 items-center justify-center text-sm text-gray-400">
      데이터가 없습니다
    </div>
  )
}

// 세션 퍼널 그라디언트 색상
const FUNNEL_GRADIENTS = [
  { from: '#818CF8', to: '#6366F1' },
  { from: '#60A5FA', to: '#3B82F6' },
  { from: '#34D399', to: '#10B981' },
]

function SessionFunnel({
  sessions,
  pageViews,
  orders,
}: {
  sessions: number
  pageViews: number
  orders: number
}) {
  const steps = [
    { label: '세션 (Sessions)', value: sessions },
    { label: '페이지뷰 (Page Views)', value: pageViews },
    { label: '주문 (Orders)', value: orders },
  ]
  const widths = [100, 70, 45]

  return (
    <div className="flex flex-col items-center gap-0 py-2">
      {steps.map((step, i) => {
        const prevValue = i > 0 ? steps[i - 1].value : null
        const convRate = prevValue && prevValue > 0 ? (step.value / prevValue) * 100 : null
        const totalRate = sessions > 0 ? (step.value / sessions) * 100 : 0

        return (
          <div key={step.label} className="flex w-full flex-col items-center">
            <div
              className="group relative"
              style={{ width: `${widths[i]}%`, minWidth: 100 }}
            >
              <div
                className="flex h-13 cursor-default items-center justify-between rounded-xl px-4 shadow-sm transition-all duration-200 group-hover:brightness-105"
                style={{
                  background: `linear-gradient(135deg, ${FUNNEL_GRADIENTS[i].from}, ${FUNNEL_GRADIENTS[i].to})`,
                }}
              >
                <span className="text-[13px] font-semibold text-white/90">{step.label}</span>
                <span className="text-[13px] font-bold text-white">{fmtNum(step.value)}</span>
              </div>
              {/* hover 툴팁 */}
              <div
                className={`invisible absolute left-1/2 z-20 min-w-45 -translate-x-1/2 rounded-lg border border-gray-100 bg-white px-3.5 py-2.5 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100 ${
                  i === steps.length - 1 ? 'bottom-full mb-2' : 'top-full mt-2'
                }`}
              >
                <p className="mb-1.5 text-[12px] font-semibold text-gray-900">{step.label}</p>
                <p className="text-[11px] text-gray-600">
                  수량: <span className="font-medium text-gray-900">{fmtNum(step.value)}</span>
                </p>
                {convRate != null && (
                  <p className="text-[11px] text-gray-500">
                    이전 단계 대비: <span className="font-medium">{convRate.toFixed(1)}%</span>
                  </p>
                )}
                <p className="text-[11px] text-gray-500">
                  전체 대비: <span className="font-medium">{totalRate.toFixed(1)}%</span>
                </p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex flex-col items-center py-0.5">
                <ChevronDown className="h-4 w-4 text-gray-300" />
                {steps[i + 1] && steps[i + 1].value > 0 && (
                  <span className="text-[10px] font-semibold text-gray-400">
                    {step.value > 0 ? ((steps[i + 1].value / step.value) * 100).toFixed(1) : '0.0'}%
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ConversionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
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
      {label && <p style={{ fontWeight: 600, marginBottom: 6, color: '#111827' }}>{label}</p>}
      {payload.map((entry: any, index: number) => {
        let formatted = entry.value
        if (entry.name === '주문수') formatted = fmtNum(entry.value)
        else if (entry.name === '전환율') formatted = fmtPct(entry.value)
        else if (entry.name === 'AOV') formatted = fmtUSD(entry.value)
        return (
          <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
            {entry.name}: {formatted}
          </p>
        )
      })}
    </div>
  )
}

export function AmazonOrganicAnalyticsCharts({ data }: Props) {
  if (!data.length) return null

  // 전체 합산 (퍼널용)
  const totals = data.reduce(
    (acc, d) => ({
      sessions: acc.sessions + (d.impressions ?? 0),
      page_views: acc.page_views + (d.clicks ?? 0),
      orders: acc.orders + (d.purchases ?? 0),
    }),
    { sessions: 0, page_views: 0, orders: 0 }
  )

  // 전환율 & AOV 추이용 데이터
  const conversionData = data.map((d) => ({
    date: d.date.slice(5),
    orders: d.purchases,
    conversion_rate: d.order_conversion_rate ?? null,
    aov: d.aov ?? null,
  }))

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
        성과 분석
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 차트 1: 세션 퍼널 */}
        <ChartCard
          title="세션 퍼널"
          subtitle="Sessions → Page Views → Orders 단계별 전환"
        >
          {totals.sessions === 0 ? (
            <EmptyState />
          ) : (
            <SessionFunnel
              sessions={totals.sessions}
              pageViews={totals.page_views}
              orders={totals.orders}
            />
          )}
        </ChartCard>

        {/* 차트 2: 전환율 & AOV 추이 */}
        <ChartCard
          title="전환율 & AOV 추이"
          subtitle="일별 주문수(막대) / 전환율 & 객단가(선)"
        >
          {conversionData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={conversionData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={45} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  width={55}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <Tooltip content={<ConversionTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" name="주문수" fill="#6366F1" opacity={0.7} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversion_rate"
                  name="전환율"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="aov"
                  name="AOV"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
