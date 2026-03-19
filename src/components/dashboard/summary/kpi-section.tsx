'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { SummaryTotals } from '@/types/database'
import {
  DollarSign,
  MousePointer,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'

type MetricFormat = 'percent' | 'number2' | 'currency' | 'number'

type MetricDef = {
  key: string
  label: string
  format: MetricFormat
  icon?: React.ElementType
}

// Meta 효율 지표 (5개)
const META_EFFICIENCY: MetricDef[] = [
  { key: 'roas', label: 'ROAS', format: 'percent', icon: TrendingUp },
  { key: 'frequency', label: '빈도', format: 'number2', icon: RefreshCw },
  { key: 'ctr', label: '클릭률 (CTR)', format: 'percent', icon: MousePointer },
  { key: 'cpc', label: '클릭당 비용 (CPC)', format: 'currency', icon: DollarSign },
  { key: 'cpa', label: '구매(전환)당 비용 (CPA)', format: 'currency', icon: ShoppingCart },
]

// Meta 원본 지표 (7개)
const META_RAW: MetricDef[] = [
  { key: 'spend', label: '지출금액', format: 'currency' },
  { key: 'revenue', label: '매출', format: 'currency' },
  { key: 'impressions', label: '노출수', format: 'number' },
  { key: 'reach', label: '도달수', format: 'number' },
  { key: 'clicks', label: '클릭수', format: 'number' },
  { key: 'purchases', label: '구매(전환)수', format: 'number' },
  { key: 'add_to_cart', label: '장바구니 담기', format: 'number' },
]

// TikTok 효율 지표 (4개)
const TIKTOK_EFFICIENCY: MetricDef[] = [
  { key: 'roas', label: 'ROAS', format: 'percent', icon: TrendingUp },
  { key: 'ctr', label: '클릭률 (CTR)', format: 'percent', icon: MousePointer },
  { key: 'cpc', label: '클릭당 비용 (CPC)', format: 'currency', icon: DollarSign },
  { key: 'cpa', label: '구매(전환)당 비용 (CPA)', format: 'currency', icon: ShoppingCart },
]

// TikTok 원본 지표 (6개)
const TIKTOK_RAW: MetricDef[] = [
  { key: 'spend', label: '지출금액', format: 'currency' },
  { key: 'revenue', label: '매출', format: 'currency' },
  { key: 'impressions', label: '노출수', format: 'number' },
  { key: 'clicks', label: '클릭수', format: 'number' },
  { key: 'purchases', label: '구매(전환)수', format: 'number' },
  { key: 'video_views', label: '영상조회수', format: 'number' },
]

function formatValue(v: number | null, fmt: MetricFormat): string {
  if (v === null) return '-'
  switch (fmt) {
    case 'percent':
      return `${v.toFixed(2)}%`
    case 'number2':
      return v.toFixed(2)
    case 'currency':
      return `₩${Math.round(v).toLocaleString('ko-KR')}`
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
  disabled?: boolean
  isLoading: boolean
}

function KpiBox({
  label,
  value,
  icon: Icon,
  selected,
  onClick,
  disabled,
  isLoading,
}: KpiBoxProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border p-4 text-left transition-all',
        'hover:border-zinc-400 hover:shadow-sm',
        selected
          ? 'border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30'
          : 'bg-card',
        disabled && 'cursor-default opacity-50'
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

interface KpiSectionProps {
  totals: SummaryTotals | null
  accountType: 'meta' | 'tiktok'
  selectedMetrics: string[]
  onSelect: (key: string) => void
  isLoading: boolean
}

export function KpiSection({
  totals,
  accountType,
  selectedMetrics,
  onSelect,
  isLoading,
}: KpiSectionProps) {
  const efficiencyMetrics = accountType === 'meta' ? META_EFFICIENCY : TIKTOK_EFFICIENCY
  const rawMetrics = accountType === 'meta' ? META_RAW : TIKTOK_RAW

  return (
    <div className="space-y-6">
      {/* 효율 지표 */}
      <div className="space-y-2">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          효율 지표 (Calculated)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {efficiencyMetrics.map(({ key, label, format, icon }) => (
            <KpiBox
              key={key}
              label={label}
              value={formatValue(totals ? (totals[key as keyof SummaryTotals] ?? null) : null, format)}
              icon={icon}
              selected={selectedMetrics.includes(key)}
              onClick={() => onSelect(key)}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>

      {/* 원본 데이터 */}
      <div className="space-y-2">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          원본 데이터 (Raw Data)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {rawMetrics.map(({ key, label, format }) => (
            <KpiBox
              key={key}
              label={label}
              value={formatValue(totals ? (totals[key as keyof SummaryTotals] ?? null) : null, format)}
              selected={selectedMetrics.includes(key)}
              onClick={() => onSelect(key)}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
