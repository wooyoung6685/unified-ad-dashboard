'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { AmazonAdsSummaryTotals } from '@/types/database'
import {
  DollarSign,
  Info,
  MousePointer,
  TrendingUp,
} from 'lucide-react'

type MetricFormat = 'percent' | 'ratio_pct' | 'number2' | 'currency' | 'number'

type MetricDef = {
  key: string
  label: string
  format: MetricFormat
  icon?: React.ElementType
  tooltip?: string
}

// 광고 효율 지표 (4개)
const ADS_EFFICIENCY: MetricDef[] = [
  { key: 'acos', label: 'ACoS', format: 'percent', icon: TrendingUp, tooltip: 'Advertising Cost of Sales = 광고비 ÷ 광고매출 × 100. 낮을수록 광고 효율이 좋습니다.' },
  { key: 'roas', label: 'ROAS', format: 'ratio_pct', icon: TrendingUp, tooltip: 'Return on Ad Spend = 광고매출 ÷ 광고비. ACoS의 역수 개념으로, 높을수록 좋습니다.' },
  { key: 'cpc', label: 'CPC', format: 'currency', icon: DollarSign, tooltip: 'Cost Per Click = 광고비 ÷ 클릭수. 클릭 1회당 평균 비용입니다.' },
  { key: 'ctr', label: 'CTR', format: 'percent', icon: MousePointer, tooltip: 'Click Through Rate = 클릭수 ÷ 노출수 × 100. 광고를 본 사람 중 클릭한 비율입니다.' },
]

// 광고 원본 지표 (6개)
const ADS_RAW: MetricDef[] = [
  { key: 'cost', label: '광고비', format: 'currency' },
  { key: 'sales', label: '광고매출', format: 'currency' },
  { key: 'purchases', label: '구매수', format: 'number' },
  { key: 'purchases_new_to_brand', label: '신규고객 구매', format: 'number', tooltip: 'New-to-Brand 구매수. 최근 1년간 해당 브랜드를 구매한 적 없는 고객의 구매 수로, 브랜드 성장성 판단에 중요합니다.' },
  { key: 'impressions', label: '노출수', format: 'number' },
  { key: 'clicks', label: '클릭수', format: 'number' },
]

function formatValue(v: number | null, fmt: MetricFormat): string {
  if (v === null) return '-'
  switch (fmt) {
    case 'percent':
      return `${v.toFixed(2)}%`
    case 'ratio_pct':
      return `${(v * 100).toFixed(2)}%`
    case 'number2':
      return v.toFixed(2)
    case 'currency':
      return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case 'number':
      return Math.round(v).toLocaleString('ko-KR')
  }
}

interface KpiBoxProps {
  label: string
  value: string
  icon?: React.ElementType
  selected: boolean
  onClick: () => void
  isLoading: boolean
  tooltip?: string
}

function KpiBox({ label, value, icon: Icon, selected, onClick, isLoading, tooltip }: KpiBoxProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border p-4 text-left transition-all',
        'hover:border-zinc-400 hover:shadow-sm',
        selected
          ? 'border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30'
          : 'bg-card',
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            className={cn(
              'size-3.5',
              selected ? 'text-zinc-700' : 'text-muted-foreground'
            )}
          />
        )}
        <span
          className={cn(
            'text-xs font-medium',
            selected ? 'text-zinc-800 dark:text-zinc-200' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Info className={cn('size-3 shrink-0 cursor-help', selected ? 'text-zinc-500' : 'text-muted-foreground/60')} />
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
        <span
          className={cn(
            'text-lg font-semibold tabular-nums',
            selected ? 'text-zinc-800 dark:text-zinc-200' : 'text-foreground'
          )}
        >
          {value}
        </span>
      )}
    </button>
  )
}

interface AmazonAdsKpiSectionProps {
  totals: AmazonAdsSummaryTotals | null
  selectedMetrics: string[]
  onSelect: (key: string) => void
  isLoading: boolean
}

export function AmazonAdsKpiSection({
  totals,
  selectedMetrics,
  onSelect,
  isLoading,
}: AmazonAdsKpiSectionProps) {
  const getValue = (key: string, fmt: MetricFormat) =>
    formatValue(totals ? ((totals as Record<string, number | null>)[key] ?? null) : null, fmt)

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* 효율 지표 */}
        <div className="space-y-2">
          <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
            효율 지표 (Calculated)
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {ADS_EFFICIENCY.map(({ key, label, format, icon, tooltip }) => (
              <KpiBox
                key={key}
                label={label}
                value={getValue(key, format)}
                icon={icon}
                selected={selectedMetrics.includes(key)}
                onClick={() => onSelect(key)}
                isLoading={isLoading}
                tooltip={tooltip}
              />
            ))}
          </div>
        </div>

        {/* 원본 데이터 */}
        <div className="space-y-2">
          <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
            원본 데이터 (Raw Data)
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {ADS_RAW.map(({ key, label, format, tooltip }) => (
              <KpiBox
                key={key}
                label={label}
                value={getValue(key, format)}
                selected={selectedMetrics.includes(key)}
                onClick={() => onSelect(key)}
                isLoading={isLoading}
                tooltip={tooltip}
              />
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
