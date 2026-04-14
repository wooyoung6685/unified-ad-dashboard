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
import type { Qoo10AdsSummaryTotals } from '@/types/database'
import { DollarSign, Info, MousePointer, ShoppingCart, TrendingUp } from 'lucide-react'

const fmtJPY = (v: number | null) =>
  v == null ? '-' : `¥${Math.round(v).toLocaleString('ko-KR')}`

type MetricFormat = 'jpy' | 'jpy_krw' | 'pct' | 'number' | 'pct_roas'

type MetricDef = {
  key: keyof Qoo10AdsSummaryTotals
  label: string
  format: MetricFormat
  icon?: React.ElementType
  tooltip?: string
}

// 효율 지표
const ADS_EFFICIENCY: MetricDef[] = [
  { key: 'roas', label: 'ROAS', format: 'pct_roas', icon: TrendingUp, tooltip: 'Return on Ad Spend = 광고매출 ÷ 광고비 × 100%. 높을수록 좋습니다.' },
  { key: 'ctr', label: 'CTR', format: 'pct', icon: MousePointer, tooltip: 'Click Through Rate = 클릭수 ÷ 노출수 × 100' },
  { key: 'cart_conversion_rate', label: '카트전환율', format: 'pct', icon: ShoppingCart, tooltip: '카트수 ÷ 클릭수 × 100. 클릭 후 장바구니에 담은 비율입니다.' },
  { key: 'purchase_conversion_rate', label: '구매전환율', format: 'pct', icon: TrendingUp, tooltip: '구매수 ÷ 클릭수 × 100. 클릭 후 실제 구매로 이어진 비율입니다.' },
  { key: 'cpc', label: 'CPC (JPY)', format: 'jpy', icon: DollarSign, tooltip: 'Cost Per Click = 광고비 ÷ 클릭수. 클릭 1회당 평균 비용입니다.' },
]

// 원본 지표
const ADS_RAW: MetricDef[] = [
  { key: 'cost', label: '광고비 (JPY)', format: 'jpy_krw' },
  { key: 'sales', label: '광고매출 (JPY)', format: 'jpy_krw' },
  { key: 'impressions', label: '노출수', format: 'number' },
  { key: 'clicks', label: '클릭수', format: 'number' },
  { key: 'carts', label: '카트수', format: 'number' },
  { key: 'purchases', label: '구매수', format: 'number' },
]

function formatValue(
  key: keyof Qoo10AdsSummaryTotals,
  totals: Qoo10AdsSummaryTotals | null,
  fmt: MetricFormat,
  hasKrw: boolean
): { main: string; sub?: string } {
  const v = totals ? (totals[key] as number | null) : null
  switch (fmt) {
    case 'jpy_krw': {
      const main = fmtJPY(v)
      const krwKey = key === 'cost' ? 'cost_krw' : key === 'sales' ? 'sales_krw' : null
      const krwVal = krwKey && totals ? (totals[krwKey] as number | null) : null
      return { main, sub: hasKrw && krwVal != null ? fmtKRW(krwVal) : undefined }
    }
    case 'jpy':
      return { main: fmtJPY(v) }
    case 'pct':
      return { main: fmtPct(v) }
    case 'pct_roas':
      return { main: v != null ? `${(v * 100).toFixed(0)}%` : '-' }
    default:
      return { main: fmtNum(v) }
  }
}

interface KpiBoxProps {
  label: string
  main: string
  sub?: string
  icon?: React.ElementType
  selected: boolean
  onClick: () => void
  isLoading: boolean
  tooltip?: string
}

function KpiBox({ label, main, sub, icon: Icon, selected, onClick, isLoading, tooltip }: KpiBoxProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border p-4 text-left transition-all',
        'hover:border-orange-400 hover:shadow-sm',
        selected
          ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20'
          : 'bg-card',
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            className={cn(
              'size-3.5',
              selected ? 'text-orange-600' : 'text-muted-foreground'
            )}
          />
        )}
        <span
          className={cn(
            'text-xs font-medium',
            selected ? 'text-orange-700 dark:text-orange-300' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Info className={cn('size-3 shrink-0 cursor-help', selected ? 'text-orange-400' : 'text-muted-foreground/60')} />
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
          <span
            className={cn(
              'text-lg font-semibold tabular-nums',
              selected ? 'text-orange-800 dark:text-orange-200' : 'text-foreground'
            )}
          >
            {main}
          </span>
          {sub && <span className="text-xs text-muted-foreground tabular-nums">{sub}</span>}
        </>
      )}
    </button>
  )
}

interface Props {
  totals: Qoo10AdsSummaryTotals | null
  selectedMetrics: string[]
  onSelect: (key: string) => void
  isLoading: boolean
  extra?: { hasKrw: boolean }
}

export function Qoo10AdsKpiSection({ totals, selectedMetrics, onSelect, isLoading, extra }: Props) {
  const hasKrw = extra?.hasKrw ?? false

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* 효율 지표 */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            효율 지표 (Calculated)
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {ADS_EFFICIENCY.map(({ key, label, format, icon, tooltip }) => {
              const { main, sub } = formatValue(key, totals, format, hasKrw)
              return (
                <KpiBox
                  key={key}
                  label={label}
                  main={main}
                  sub={sub}
                  icon={icon}
                  selected={selectedMetrics.includes(key)}
                  onClick={() => onSelect(key)}
                  isLoading={isLoading}
                  tooltip={tooltip}
                />
              )
            })}
          </div>
        </div>

        {/* 원본 데이터 */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            원본 데이터 (Raw Data)
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ADS_RAW.map(({ key, label, format, tooltip }) => {
              const { main, sub } = formatValue(key, totals, format, hasKrw)
              return (
                <KpiBox
                  key={key}
                  label={label}
                  main={main}
                  sub={sub}
                  selected={selectedMetrics.includes(key)}
                  onClick={() => onSelect(key)}
                  isLoading={isLoading}
                  tooltip={tooltip}
                />
              )
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
