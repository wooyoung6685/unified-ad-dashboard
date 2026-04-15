'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { fmtKRW, fmtNum, fmtPct } from '@/lib/format'
import type { Qoo10OrganicSummaryTotals } from '@/types/database'
import { Info } from 'lucide-react'

const fmtJPY = (v: number | null) =>
  v == null ? '-' : `¥${Math.round(v).toLocaleString('ko-KR')}`

interface Props {
  totals: Qoo10OrganicSummaryTotals | null
  extra?: { hasKrw: boolean; appliedRate: number | null }
  isLoading?: boolean
}

type MetricDef = {
  key: keyof Qoo10OrganicSummaryTotals
  label: string
  tooltip?: string
  format: 'jpy' | 'krw' | 'num' | 'pct'
}

const METRICS: MetricDef[] = [
  { key: 'visitors', label: '유입자수', format: 'num', tooltip: '기간 내 큐텐 상점 방문자(세션) 수' },
  { key: 'add_to_cart', label: '장바구니', format: 'num', tooltip: '장바구니에 담은 횟수' },
  { key: 'transaction_amount_jpy', label: '거래금액 (JPY)', format: 'jpy' },
  { key: 'transaction_quantity', label: '거래수량', format: 'num' },
  { key: 'aov_jpy', label: 'AOV (JPY)', format: 'jpy', tooltip: '객단가 = 거래금액 ÷ 거래수량. 1건당 평균 구매금액입니다.' },
  { key: 'conversion_rate', label: '전환율', format: 'pct', tooltip: '거래수량 ÷ 유입자수 × 100' },
  { key: 'cart_to_purchase_rate', label: '장바구니→구매율', format: 'pct', tooltip: '거래수량 ÷ 장바구니 수 × 100. 장바구니 담기 후 구매로 이어진 비율입니다.' },
]

function formatVal(key: keyof Qoo10OrganicSummaryTotals, totals: Qoo10OrganicSummaryTotals | null, fmt: string, hasKrw: boolean): { main: string; sub?: string } {
  const v = totals ? totals[key] : null
  if (fmt === 'jpy') {
    const main = fmtJPY(v as number | null)
    if (hasKrw) {
      const krwKey = key === 'transaction_amount_jpy' ? 'transaction_amount_krw' : null
      const krwVal = krwKey && totals ? totals[krwKey] : null
      return { main, sub: krwVal != null ? fmtKRW(krwVal as number) : undefined }
    }
    return { main }
  }
  if (fmt === 'pct') return { main: fmtPct(v as number | null) }
  return { main: fmtNum(v as number | null) }
}

function KpiBox({
  label,
  main,
  sub,
  tooltip,
  isLoading,
}: {
  label: string
  main: string
  sub?: string
  tooltip?: string
  isLoading: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-lg border bg-card p-4')}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3 shrink-0 cursor-help text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-60 text-xs leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-6 w-20" />
      ) : (
        <>
          <span className="text-lg font-semibold tabular-nums text-foreground">{main}</span>
          {sub && <span className="text-xs text-muted-foreground tabular-nums">{sub}</span>}
        </>
      )}
    </div>
  )
}

export function Qoo10OrganicKpiSection({ totals, extra, isLoading }: Props) {
  const hasKrw = extra?.hasKrw ?? false

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          오가닉 성과 지표
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {METRICS.map(({ key, label, format, tooltip }) => {
            const { main, sub } = formatVal(key, totals, format, hasKrw)
            return (
              <KpiBox
                key={key}
                label={label}
                main={main}
                sub={sub}
                tooltip={tooltip}
                isLoading={isLoading ?? false}
              />
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
