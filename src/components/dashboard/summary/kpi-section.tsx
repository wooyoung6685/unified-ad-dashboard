'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { GmvMaxSummaryTotals, SummaryTotals } from '@/types/database'
import {
  Banknote,
  DollarSign,
  MousePointer,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'

type MetricFormat = 'percent' | 'ratio_pct' | 'number2' | 'currency' | 'number'

type MetricDef = {
  key: string
  label: string
  format: MetricFormat
  icon?: React.ElementType
}

// Meta 효율 지표 (5개)
const META_EFFICIENCY: MetricDef[] = [
  { key: 'roas', label: 'ROAS', format: 'ratio_pct', icon: TrendingUp },
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
  { key: 'roas', label: 'ROAS', format: 'ratio_pct', icon: TrendingUp },
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

// GMV Max 효율 지표 (2개)
const GMV_MAX_EFFICIENCY: MetricDef[] = [
  { key: 'roi', label: 'ROI', format: 'ratio_pct', icon: TrendingUp },
  { key: 'cost_per_order', label: '주문당 비용', format: 'currency', icon: ShoppingCart },
]

// GMV Max 원본 지표 (3개)
const GMV_MAX_RAW: MetricDef[] = [
  { key: 'cost', label: '비용', format: 'currency' },
  { key: 'gross_revenue', label: '매출', format: 'currency' },
  { key: 'orders', label: '주문수', format: 'number' },
]

// Shopee 쇼핑몰 효율 지표 (4개)
const SHOPEE_SHOPPING_EFFICIENCY: MetricDef[] = [
  { key: 'roas',  label: 'ROAS',                   format: 'ratio_pct',  icon: TrendingUp },
  { key: 'ctr',   label: '전환율',                  format: 'percent',  icon: TrendingUp },
  { key: 'aov',   label: '객단가 (KRW)',            format: 'currency', icon: Banknote },
  { key: 'cpc',   label: '클릭당 비용 CPC (KRW)',  format: 'currency', icon: MousePointer },
]

// Shopee 쇼핑몰 원본 지표 (5개)
const SHOPEE_SHOPPING_RAW: MetricDef[] = [
  { key: 'spend',       label: '지출금액 (KRW)', format: 'currency' },
  { key: 'revenue',     label: '매출 (KRW)',     format: 'currency' },
  { key: 'purchases',   label: '결제 건수',      format: 'number' },
  { key: 'impressions', label: '방문자수',        format: 'number' },
  { key: 'clicks',      label: '페이지뷰',        format: 'number' },
]

// Shopee 인앱 효율 지표
const SHOPEE_INAPP_EFFICIENCY: MetricDef[] = [
  { key: 'roas', label: 'ROAS', format: 'ratio_pct', icon: TrendingUp },
  { key: 'ctr', label: '클릭률 CTR (%)', format: 'percent', icon: MousePointer },
  { key: 'conversion_rate', label: '전환율 (%)', format: 'percent', icon: RefreshCw },
  { key: 'cpa', label: '구매(전환)당 비용 CPA (KRW)', format: 'currency', icon: ShoppingCart },
]

// Shopee 인앱 원본 지표
const SHOPEE_INAPP_RAW: MetricDef[] = [
  { key: 'spend', label: '지출 (KRW)', format: 'currency' },
  { key: 'revenue', label: '매출 GMV (KRW)', format: 'currency' },
  { key: 'impressions', label: '노출수', format: 'number' },
  { key: 'clicks', label: '클릭수', format: 'number' },
  { key: 'purchases', label: '구매(전환)수', format: 'number' },
]

// currency 형식 지표 중 환율 미설정 시 현지통화 표시 대상
const SHOPEE_SHOPPING_CURRENCY_KEYS = new Set(['spend', 'revenue', 'aov', 'cpc'])
const SHOPEE_INAPP_CURRENCY_KEYS = new Set(['spend', 'revenue', 'cpa'])

function formatValue(
  v: number | null,
  fmt: MetricFormat,
  opts?: { hasKrw?: boolean; currency?: string | null }
): string {
  if (v === null) return '-'
  switch (fmt) {
    case 'percent':
      return `${v.toFixed(2)}%`
    case 'ratio_pct':
      return `${(v * 100).toFixed(2)}%`
    case 'number2':
      return v.toFixed(2)
    case 'currency':
      if (opts?.hasKrw === false && opts.currency) {
        return `${opts.currency} ${Math.round(v).toLocaleString('ko-KR')}`
      }
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
  note?: string
}

function KpiBox({
  label,
  value,
  icon: Icon,
  selected,
  onClick,
  disabled,
  isLoading,
  note,
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
        <>
          <span
            className={cn(
              'text-lg font-semibold tabular-nums',
              selected ? 'text-zinc-800 dark:text-zinc-200' : 'text-foreground'
            )}
          >
            {value}
          </span>
          {note && (
            <span className="text-muted-foreground text-[10px]">{note}</span>
          )}
        </>
      )}
    </button>
  )
}

interface KpiSectionProps {
  totals: SummaryTotals | GmvMaxSummaryTotals | null
  accountType: 'meta' | 'tiktok' | 'shopee_shopping' | 'shopee_inapp'
  selectedMetrics: string[]
  onSelect: (key: string) => void
  isLoading: boolean
  shopeeExtra?: { currency: string | null; hasKrw: boolean }
  isGmvMax?: boolean
}

export function KpiSection({
  totals,
  accountType,
  selectedMetrics,
  onSelect,
  isLoading,
  shopeeExtra,
  isGmvMax,
}: KpiSectionProps) {
  const efficiencyMetrics = isGmvMax
    ? GMV_MAX_EFFICIENCY
    : accountType === 'meta'
      ? META_EFFICIENCY
      : accountType === 'tiktok'
        ? TIKTOK_EFFICIENCY
        : accountType === 'shopee_shopping'
          ? SHOPEE_SHOPPING_EFFICIENCY
          : SHOPEE_INAPP_EFFICIENCY
  const rawMetrics = isGmvMax
    ? GMV_MAX_RAW
    : accountType === 'meta'
      ? META_RAW
      : accountType === 'tiktok'
        ? TIKTOK_RAW
        : accountType === 'shopee_shopping'
          ? SHOPEE_SHOPPING_RAW
          : SHOPEE_INAPP_RAW

  // shopee 계열: 환율 미설정 시 현지통화 포맷 옵션
  const isShopee = accountType === 'shopee_shopping' || accountType === 'shopee_inapp'
  const fmtOpts =
    isShopee && shopeeExtra
      ? { hasKrw: shopeeExtra.hasKrw, currency: shopeeExtra.currency }
      : undefined

  const getNote = (key: string, format: MetricFormat) => {
    if (!shopeeExtra || shopeeExtra.hasKrw) return undefined
    if (
      accountType === 'shopee_shopping' &&
      format === 'currency' &&
      SHOPEE_SHOPPING_CURRENCY_KEYS.has(key)
    ) {
      return '환율 미설정'
    }
    if (
      accountType === 'shopee_inapp' &&
      format === 'currency' &&
      SHOPEE_INAPP_CURRENCY_KEYS.has(key)
    ) {
      return '환율 미설정'
    }
    return undefined
  }

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
              value={formatValue(totals ? ((totals as Record<string, number | null>)[key] ?? null) : null, format, fmtOpts)}
              icon={icon}
              selected={selectedMetrics.includes(key)}
              onClick={() => onSelect(key)}
              isLoading={isLoading}
              note={getNote(key, format)}
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
              value={formatValue(totals ? ((totals as Record<string, number | null>)[key] ?? null) : null, format, fmtOpts)}
              selected={selectedMetrics.includes(key)}
              onClick={() => onSelect(key)}
              isLoading={isLoading}
              note={getNote(key, format)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
