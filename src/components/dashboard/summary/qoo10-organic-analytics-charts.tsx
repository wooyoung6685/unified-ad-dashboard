'use client'

import { fmtNum, fmtPct } from '@/lib/format'
import type { Qoo10OrganicSummaryDayData } from '@/types/database'
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
  data: Qoo10OrganicSummaryDayData[]
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

// 유입 퍼널 시각화 (유입자 → 장바구니 → 거래)
const FUNNEL_GRADIENTS = [
  { from: '#FB923C', to: '#F97316' },
  { from: '#FBBF24', to: '#F59E0B' },
  { from: '#34D399', to: '#10B981' },
]

function OrganicFunnel({
  visitors,
  carts,
  purchases,
}: {
  visitors: number
  carts: number
  purchases: number
}) {
  const steps = [
    { label: '유입자수', value: visitors },
    { label: '장바구니', value: carts },
    { label: '거래수량', value: purchases },
  ]
  const widths = [100, 70, 45]

  return (
    <div className="flex flex-col items-center gap-0 py-2">
      {steps.map((step, i) => {
        const prevValue = i > 0 ? steps[i - 1].value : null
        const convRate = prevValue && prevValue > 0 ? (step.value / prevValue) * 100 : null
        const totalRate = visitors > 0 ? (step.value / visitors) * 100 : 0
        return (
          <div key={step.label} className="flex w-full flex-col items-center">
            <div className="group relative" style={{ width: `${widths[i]}%`, minWidth: 100 }}>
              <div
                className="flex h-13 cursor-default items-center justify-between rounded-xl px-4 shadow-sm transition-all duration-200 group-hover:brightness-105"
                style={{
                  background: `linear-gradient(135deg, ${FUNNEL_GRADIENTS[i].from}, ${FUNNEL_GRADIENTS[i].to})`,
                }}
              >
                <span className="text-[13px] font-semibold text-white/90">{step.label}</span>
                <span className="text-[13px] font-bold text-white">{fmtNum(step.value)}</span>
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
    <div className="rounded-lg border bg-white px-3.5 py-2.5 text-xs shadow-lg">
      {label && <p className="mb-1.5 font-semibold text-gray-900">{label}</p>}
      {payload.map((entry: any, i: number) => {
        let formatted = entry.value
        if (entry.name === '거래수량') formatted = fmtNum(entry.value)
        else if (entry.name === '전환율' || entry.name === '장바구니→구매율') formatted = fmtPct(entry.value)
        else if (entry.name === 'AOV(JPY)') formatted = fmtJPY(entry.value)
        return (
          <p key={i} style={{ color: entry.color, margin: '2px 0' }}>
            {entry.name}: {formatted}
          </p>
        )
      })}
    </div>
  )
}

export function Qoo10OrganicAnalyticsCharts({ data }: Props) {
  if (!data.length) return null

  // 퍼널용 합산
  const totals = data.reduce(
    (acc, d) => ({
      visitors: acc.visitors + (d.visitors ?? 0),
      carts: acc.carts + (d.add_to_cart ?? 0),
      purchases: acc.purchases + (d.transaction_quantity ?? 0),
    }),
    { visitors: 0, carts: 0, purchases: 0 }
  )

  // 전환율 & AOV 추이
  const convData = data.map((d) => ({
    date: d.date.slice(5),
    qty: d.transaction_quantity,
    conversion_rate: d.conversion_rate,
    cart_to_purchase: d.cart_to_purchase_rate,
    aov: d.aov_jpy,
  }))

  // 유입자 추이
  const visitorData = data.map((d) => ({
    date: d.date.slice(5),
    visitors: d.visitors,
    cart: d.add_to_cart,
  }))

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        오가닉 성과 분석
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 차트 1: 유입 퍼널 */}
        <ChartCard title="유입 퍼널" subtitle="유입자 → 장바구니 → 거래 단계별 전환">
          {totals.visitors === 0 ? (
            <EmptyState />
          ) : (
            <OrganicFunnel
              visitors={totals.visitors}
              carts={totals.carts}
              purchases={totals.purchases}
            />
          )}
        </ChartCard>

        {/* 차트 2: 유입자 & 장바구니 추이 */}
        <ChartCard title="유입자 & 장바구니 추이" subtitle="일별 유입자수(막대) / 장바구니(선)">
          {visitorData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={visitorData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} width={45} />
                <Tooltip content={<ConversionTooltip />} />
                <Legend />
                <Bar dataKey="visitors" name="유입자수" fill="#F97316" opacity={0.7} />
                <Line
                  type="monotone"
                  dataKey="cart"
                  name="장바구니"
                  stroke="#FBBF24"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 차트 3: 전환율 & AOV 추이 */}
        <ChartCard title="전환율 & AOV 추이" subtitle="거래수량(막대) / 전환율 & 객단가(선)">
          {convData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={convData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={40} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  width={55}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <Tooltip content={<ConversionTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="qty" name="거래수량" fill="#10B981" opacity={0.7} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversion_rate"
                  name="전환율"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cart_to_purchase"
                  name="장바구니→구매율"
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
