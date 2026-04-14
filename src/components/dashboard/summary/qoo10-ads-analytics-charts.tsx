'use client'

import { fmtNum, fmtPct } from '@/lib/format'
import type { Qoo10AdsSummaryDayData } from '@/types/database'
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
  data: Qoo10AdsSummaryDayData[]
}

const fmtJPY = (v: number) => `¥${Math.round(v).toLocaleString('ko-KR')}`

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
    <div className="flex h-60 items-center justify-center text-sm text-gray-400">
      데이터가 없습니다
    </div>
  )
}

// 광고 퍼널: 노출 → 클릭 → 카트 → 구매
const FUNNEL_GRADIENTS = [
  { from: '#FB923C', to: '#F97316' },
  { from: '#FBBF24', to: '#F59E0B' },
  { from: '#60A5FA', to: '#3B82F6' },
  { from: '#34D399', to: '#10B981' },
]

function AdFunnel({
  impressions,
  clicks,
  carts,
  purchases,
}: {
  impressions: number
  clicks: number
  carts: number
  purchases: number
}) {
  const steps = [
    { label: '노출수', value: impressions },
    { label: '클릭수', value: clicks },
    { label: '카트수', value: carts },
    { label: '구매수', value: purchases },
  ]
  const widths = [100, 72, 50, 32]

  return (
    <div className="flex flex-col items-center gap-0 py-2">
      {steps.map((step, i) => {
        const prevValue = i > 0 ? steps[i - 1].value : null
        const convRate = prevValue && prevValue > 0 ? (step.value / prevValue) * 100 : null
        const totalRate = impressions > 0 ? (step.value / impressions) * 100 : 0
        return (
          <div key={step.label} className="flex w-full flex-col items-center">
            <div className="group relative" style={{ width: `${widths[i]}%`, minWidth: 100 }}>
              <div
                className="flex h-11 cursor-default items-center justify-between rounded-xl px-4 shadow-sm transition-all duration-200 group-hover:brightness-105"
                style={{
                  background: `linear-gradient(135deg, ${FUNNEL_GRADIENTS[i].from}, ${FUNNEL_GRADIENTS[i].to})`,
                }}
              >
                <span className="text-[12px] font-semibold text-white/90">{step.label}</span>
                <span className="text-[12px] font-bold text-white">{fmtNum(step.value)}</span>
              </div>
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
                    이전 단계 대비: <span className="font-medium">{convRate.toFixed(2)}%</span>
                  </p>
                )}
                <p className="text-[11px] text-gray-500">
                  노출 대비: <span className="font-medium">{totalRate.toFixed(2)}%</span>
                </p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex flex-col items-center py-0.5">
                <ChevronDown className="h-4 w-4 text-gray-300" />
                {steps[i + 1] && steps[i + 1].value > 0 && (
                  <span className="text-[10px] font-semibold text-gray-400">
                    {step.value > 0 ? ((steps[i + 1].value / step.value) * 100).toFixed(2) : '0.00'}%
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

function AdsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white px-3.5 py-2.5 text-xs shadow-lg">
      {label && <p className="mb-1.5 font-semibold text-gray-900">{label}</p>}
      {payload.map((entry: any, i: number) => {
        let formatted = entry.value
        if (entry.name === '광고비' || entry.name === '광고매출') formatted = fmtJPY(entry.value)
        else if (['CTR', '카트전환율', '구매전환율'].includes(entry.name)) formatted = fmtPct(entry.value)
        else if (entry.name === 'ROAS') formatted = `${(entry.value as number).toFixed(2)}x`
        else formatted = fmtNum(entry.value)
        return (
          <p key={i} style={{ color: entry.color, margin: '2px 0' }}>
            {entry.name}: {formatted}
          </p>
        )
      })}
    </div>
  )
}

export function Qoo10AdsAnalyticsCharts({ data }: Props) {
  if (!data.length) return null

  // 퍼널용 합산
  const totals = data.reduce(
    (acc, d) => ({
      impressions: acc.impressions + (d.impressions ?? 0),
      clicks: acc.clicks + (d.clicks ?? 0),
      carts: acc.carts + (d.carts ?? 0),
      purchases: acc.purchases + (d.purchases ?? 0),
    }),
    { impressions: 0, clicks: 0, carts: 0, purchases: 0 }
  )

  // 비용 & ROAS 추이
  const costData = data.map((d) => ({
    date: d.date.slice(5),
    cost: d.cost,
    sales: d.sales,
    roas: d.roas,
  }))

  // CTR & 전환율 추이
  const convData = data.map((d) => ({
    date: d.date.slice(5),
    purchases: d.purchases,
    ctr: d.ctr,
    purchase_conv: d.purchase_conversion_rate,
    cart_conv: d.cart_conversion_rate,
  }))

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        광고 성과 분석
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 차트 1: 광고 퍼널 */}
        <ChartCard title="광고 퍼널" subtitle="노출 → 클릭 → 카트 → 구매 단계별 전환">
          {totals.impressions === 0 ? (
            <EmptyState />
          ) : (
            <AdFunnel
              impressions={totals.impressions}
              clicks={totals.clicks}
              carts={totals.carts}
              purchases={totals.purchases}
            />
          )}
        </ChartCard>

        {/* 차트 2: 광고비 & ROAS 추이 */}
        <ChartCard title="광고비 & ROAS 추이" subtitle="일별 광고비(막대) / 광고매출 & ROAS(선)">
          {costData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={costData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} width={55} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(1)}x`} tick={{ fontSize: 10 }} width={40} />
                <Tooltip content={<AdsTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="cost" name="광고비" fill="#F97316" opacity={0.7} />
                <Line yAxisId="left" type="monotone" dataKey="sales" name="광고매출" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#6366F1" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 차트 3: CTR & 전환율 추이 */}
        <ChartCard title="CTR & 전환율 추이" subtitle="구매수(막대) / CTR & 구매전환율(선)">
          {convData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={convData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={35} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  width={55}
                  tickFormatter={(v) => `${v.toFixed(2)}%`}
                />
                <Tooltip content={<AdsTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="purchases" name="구매수" fill="#F97316" opacity={0.7} />
                <Line yAxisId="right" type="monotone" dataKey="ctr" name="CTR" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="purchase_conv" name="구매전환율" stroke="#10B981" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
