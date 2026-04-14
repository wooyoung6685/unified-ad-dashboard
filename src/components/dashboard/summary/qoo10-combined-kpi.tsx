'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { fmtKRW, fmtNum, fmtPct } from '@/lib/format'
import type { Qoo10CombinedTotals } from '@/types/database'
import { Info } from 'lucide-react'

const fmtJPY = (v: number | null) =>
  v == null ? '-' : `¥${Math.round(v).toLocaleString('ko-KR')}`

interface Props {
  totals: Qoo10CombinedTotals | null
  extra?: { hasKrw: boolean; appliedRate: number | null }
  isLoading?: boolean
}

function KpiItem({
  label,
  value,
  sub,
  tooltip,
  isLoading,
}: {
  label: string
  value: string
  sub?: string
  tooltip?: string
  isLoading?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/60 p-3">
      <span className="flex items-center gap-1 text-xs font-medium text-orange-700">
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3 shrink-0 cursor-help text-orange-400" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-60 text-xs leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      {isLoading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <>
          <span className="text-base font-bold tabular-nums text-orange-900">{value}</span>
          {sub && <span className="text-xs text-orange-600 tabular-nums">{sub}</span>}
        </>
      )}
    </div>
  )
}

export function Qoo10CombinedKpi({ totals, extra, isLoading }: Props) {
  const hasKrw = extra?.hasKrw ?? false
  const appliedRate = extra?.appliedRate

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-orange-600">
            통합 핵심 지표 (Qoo10 Combined)
          </h3>
          {appliedRate && (
            <span className="text-xs text-orange-400">
              적용 환율: 1 JPY ≈ {appliedRate.toFixed(2)} KRW
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <KpiItem
            label="총 매출 (JPY)"
            value={fmtJPY(totals?.total_sales_jpy ?? null)}
            sub={hasKrw ? fmtKRW(totals?.total_sales_krw ?? null) : undefined}
            isLoading={isLoading}
          />
          <KpiItem
            label="총 거래수량"
            value={fmtNum(totals?.total_quantity ?? null)}
            isLoading={isLoading}
          />
          <KpiItem
            label="총 유입자수"
            value={fmtNum(totals?.total_visitors ?? null)}
            isLoading={isLoading}
          />
          <KpiItem
            label="전체 전환율"
            value={fmtPct(totals?.overall_conversion_rate ?? null)}
            tooltip="거래수량 ÷ 유입자수 × 100. 방문자 중 실제로 구매한 비율입니다."
            isLoading={isLoading}
          />
          <KpiItem
            label="광고비 (JPY)"
            value={fmtJPY(totals?.ad_cost_jpy ?? null)}
            sub={hasKrw ? fmtKRW(totals?.ad_cost_krw ?? null) : undefined}
            isLoading={isLoading}
          />
          <KpiItem
            label="전체 ROAS"
            value={totals?.overall_roas != null ? `${totals.overall_roas.toFixed(2)}x` : '-'}
            tooltip="총 오가닉 매출 ÷ 총 광고비. 광고 1엔당 벌어들인 매출을 나타냅니다. 높을수록 좋습니다."
            isLoading={isLoading}
          />
          <KpiItem
            label="TACoS"
            value={fmtPct(totals?.tacos ?? null)}
            tooltip="Total ACoS = 총 광고비 ÷ 총 매출 × 100. 전체 매출에서 광고비가 차지하는 비율로, 낮을수록 광고 의존도가 낮습니다."
            isLoading={isLoading}
          />
          <KpiItem
            label="광고매출 비중"
            value={fmtPct(totals?.ad_sales_ratio ?? null)}
            tooltip="광고 매출 ÷ 전체 매출 × 100. 전체 매출 중 광고가 직접 기여한 비율입니다."
            isLoading={isLoading}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
