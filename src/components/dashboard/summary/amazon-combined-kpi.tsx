'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { fmtNum, fmtPct, fmtUSD } from '@/lib/format'
import type { AmazonCombinedTotals } from '@/types/database'
import { Info } from 'lucide-react'

interface AmazonCombinedKpiProps {
  totals: AmazonCombinedTotals | null
  isLoading?: boolean
}

function KpiItem({
  label,
  value,
  tooltip,
  isLoading,
}: {
  label: string
  value: string
  tooltip?: string
  isLoading?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/60 p-3">
      <span className="flex items-center gap-1 text-xs font-medium text-blue-700">
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3 shrink-0 cursor-help text-blue-400" />
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
        <span className="text-base font-bold tabular-nums text-blue-900">{value}</span>
      )}
    </div>
  )
}

export function AmazonCombinedKpi({ totals, isLoading }: AmazonCombinedKpiProps) {
  const tacos = totals?.tacos != null ? fmtPct(totals.tacos) : '-'
  const organicSales = fmtUSD(totals?.organic_sales ?? null)
  const adCost = fmtUSD(totals?.ad_cost ?? null)
  const adSales = fmtUSD(totals?.ad_sales ?? null)
  const adSalesRatio = totals?.ad_sales_ratio != null ? fmtPct(totals.ad_sales_ratio) : '-'
  const totalOrders = fmtNum(totals?.total_orders ?? null)
  const totalSessions = fmtNum(totals?.total_sessions ?? null)

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600">
          통합 핵심 지표 (Combined)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <KpiItem
            label="TACoS"
            value={tacos}
            tooltip="Total ACoS = 총 광고비 ÷ 오가닉 총 매출 × 100. 광고비가 전체 매출에 미치는 영향을 나타내며, 낮을수록 좋습니다."
            isLoading={isLoading}
          />
          <KpiItem label="오가닉 매출" value={organicSales} isLoading={isLoading} />
          <KpiItem label="총 광고비" value={adCost} isLoading={isLoading} />
          <KpiItem label="광고 매출" value={adSales} isLoading={isLoading} />
          <KpiItem
            label="광고매출 비중"
            value={adSalesRatio}
            tooltip="광고 매출 ÷ 전체 매출 × 100. 전체 매출 중 광고가 기여한 비율입니다."
            isLoading={isLoading}
          />
          <KpiItem label="총 주문수" value={totalOrders} isLoading={isLoading} />
          <KpiItem
            label="총 세션수"
            value={totalSessions}
            tooltip="아마존 상품 페이지에 방문한 고유 세션 수. 아마존에서 트래픽의 기본 단위입니다."
            isLoading={isLoading}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
