'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { AmazonAdsSummaryTotals, GmvMaxSummaryTotals, SummaryTotals } from '@/types/database'
import {
  Banknote,
  DollarSign,
  Info,
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
  tooltip?: string
}

// Meta 효율 지표 (8개)
const META_EFFICIENCY: MetricDef[] = [
  { key: 'roas', label: 'ROAS', format: 'ratio_pct', icon: TrendingUp },
  { key: 'cpa', label: '구매당 비용', format: 'currency', icon: ShoppingCart },
  { key: 'purchase_rate', label: '구매율', format: 'percent', icon: RefreshCw },
  { key: 'aov', label: '객단가', format: 'currency', icon: Banknote },
  { key: 'cpc', label: 'CPC (클릭당 비용)', format: 'currency', icon: DollarSign },
  { key: 'ctr', label: 'CTR (클릭률)', format: 'percent', icon: MousePointer },
  { key: 'cpm', label: 'CPM', format: 'currency', icon: DollarSign },
  { key: 'frequency', label: '빈도', format: 'number2', icon: RefreshCw },
]

// Meta 원본 지표 (8개)
const META_RAW: MetricDef[] = [
  { key: 'spend', label: '지출금액', format: 'currency' },
  { key: 'revenue', label: '매출', format: 'currency' },
  { key: 'purchases', label: '구매전환수', format: 'number' },
  { key: 'add_to_cart', label: '장바구니 담기', format: 'number' },
  { key: 'impressions', label: '노출수', format: 'number' },
  { key: 'reach', label: '도달수', format: 'number' },
  { key: 'outbound_clicks', label: '아웃바운드 클릭', format: 'number' },
  { key: 'clicks', label: '전체 클릭 (참고)', format: 'number' },
  { key: 'content_views', label: '조회수', format: 'number' },
]

// TikTok 효율 지표 (4개)
const TIKTOK_EFFICIENCY: MetricDef[] = [
  { key: 'frequency', label: '빈도', format: 'number2', icon: RefreshCw },
  { key: 'cpc', label: 'CPC', format: 'currency', icon: DollarSign },
  { key: 'ctr', label: 'CTR', format: 'percent', icon: MousePointer },
  { key: 'cpm', label: 'CPM', format: 'currency', icon: DollarSign },
]

// TikTok 원본 지표 (9개)
const TIKTOK_RAW: MetricDef[] = [
  { key: 'spend', label: '지출금액', format: 'currency' },
  { key: 'impressions', label: '노출수', format: 'number' },
  { key: 'reach', label: '도달수', format: 'number' },
  { key: 'clicks', label: '클릭수 (랜딩)', format: 'number' },
  { key: 'video_views', label: '동영상 조회수', format: 'number' },
  { key: 'views_2s', label: '2초 동영상 조회수', format: 'number' },
  { key: 'views_6s', label: '6초 동영상 조회수', format: 'number' },
  { key: 'views_25pct', label: '25% 동영상 조회수', format: 'number' },
  { key: 'views_100pct', label: '100% 동영상 조회수', format: 'number' },
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

// Shopee 쇼핑몰 효율 지표 (3개)
const SHOPEE_SHOPPING_EFFICIENCY: MetricDef[] = [
  { key: 'aov',                   label: '객단가',      format: 'currency', icon: Banknote },
  { key: 'order_conversion_rate', label: '구매 전환율', format: 'percent',  icon: RefreshCw },
  { key: 'repeat_purchase_rate',  label: '재구매율',    format: 'percent',  icon: RefreshCw },
]

// Shopee 쇼핑몰 원본 지표 (12개)
const SHOPEE_SHOPPING_RAW: MetricDef[] = [
  { key: 'spend',            label: '지출금액',         format: 'currency' },
  { key: 'revenue',          label: '매출',             format: 'currency' },
  { key: 'purchases',        label: '주문건',           format: 'number' },
  { key: 'clicks',           label: '상품 클릭 수',     format: 'number' },
  { key: 'buyers',           label: '구매자 수',        format: 'number' },
  { key: 'new_buyers',       label: '신규 구매자 수',   format: 'number' },
  { key: 'existing_buyers',  label: '기존 구매자 수',   format: 'number' },
  { key: 'impressions',      label: '방문자 수',        format: 'number' },
  { key: 'cancelled_orders', label: '취소 주문건',      format: 'number' },
  { key: 'cancelled_sales',  label: '취소 금액',        format: 'currency' },
  { key: 'refunded_orders',  label: '반품/환불 주문건', format: 'number' },
  { key: 'refunded_sales',   label: '반품/환불 금액',   format: 'currency' },
]

// Shopee 인앱 효율 지표 (3개)
const SHOPEE_INAPP_EFFICIENCY: MetricDef[] = [
  { key: 'roas', label: 'ROAS', format: 'ratio_pct', icon: TrendingUp },
  { key: 'cpc',  label: 'CPC',  format: 'currency',  icon: DollarSign },
  { key: 'ctr',  label: 'CTR',  format: 'percent',   icon: MousePointer },
]

// Shopee 인앱 원본 지표 (4개)
const SHOPEE_INAPP_RAW: MetricDef[] = [
  { key: 'spend',       label: '지출금액',   format: 'currency' },
  { key: 'revenue',     label: '매출 (GMV)', format: 'currency' },
  { key: 'impressions', label: '노출',       format: 'number' },
  { key: 'clicks',      label: '클릭',       format: 'number' },
]

// Amazon 오가닉 효율 지표 (3개)
const AMAZON_ORGANIC_EFFICIENCY: MetricDef[] = [
  { key: 'order_conversion_rate', label: '전환율', format: 'percent', icon: RefreshCw, tooltip: '주문수 ÷ 세션수 × 100. 방문자 중 실제 구매로 이어진 비율입니다. 아마존은 구매 의도가 높아 보통 10~15%대입니다.' },
  { key: 'aov', label: 'AOV (객단가)', format: 'currency', icon: Banknote, tooltip: 'Average Order Value = 매출 ÷ 주문수. 주문 1건당 평균 구매 금액입니다.' },
  { key: 'buy_box_percentage', label: '바이박스 비율', format: 'percent', icon: TrendingUp, tooltip: '아마존 상품 페이지 우측의 "장바구니 담기" 버튼을 차지한 비율. 아마존 전체 판매의 80% 이상이 바이박스를 통해 발생하므로, 낮으면 매출이 급감할 수 있습니다.' },
]

// Amazon 오가닉 원본 지표 (5개)
const AMAZON_ORGANIC_RAW: MetricDef[] = [
  { key: 'revenue', label: '매출', format: 'currency' },
  { key: 'purchases', label: '주문수', format: 'number' },
  { key: 'impressions', label: '세션수', format: 'number', tooltip: '아마존에서 트래픽의 기본 단위. 동일 방문자가 하루에 여러 번 방문해도 1세션으로 집계됩니다.' },
  { key: 'clicks', label: '페이지뷰', format: 'number', tooltip: '상품 상세 페이지가 조회된 총 횟수. 세션 내에서 여러 번 클릭하면 복수로 집계됩니다.' },
  { key: 'unit_session_percentage', label: '상품세션비율', format: 'percent', tooltip: '판매된 상품 수 ÷ 세션수 × 100. 세션당 평균 구매 상품 수를 나타냅니다.' },
]

// currency 형식 지표 중 환율 미설정 시 현지통화 표시 대상
const SHOPEE_SHOPPING_CURRENCY_KEYS = new Set(['spend', 'revenue', 'aov', 'cpc', 'cancelled_sales', 'refunded_sales'])
const SHOPEE_INAPP_CURRENCY_KEYS = new Set(['spend', 'revenue', 'cpa', 'cpc'])
const AMAZON_ORGANIC_CURRENCY_KEYS = new Set(['revenue', 'aov'])

function formatValue(
  v: number | null,
  fmt: MetricFormat,
  opts?: { hasKrw?: boolean; currency?: string | null; isAmazon?: boolean }
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
      if (opts?.isAmazon) {
        return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
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
  tooltip?: string
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
  tooltip,
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
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Info className={cn('size-3 shrink-0 cursor-help', selected ? 'text-zinc-500' : 'text-muted-foreground/60')} />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
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
  totals: SummaryTotals | GmvMaxSummaryTotals | AmazonAdsSummaryTotals | null
  accountType: 'meta' | 'tiktok' | 'shopee_shopping' | 'shopee_inapp' | 'amazon_organic'
  selectedMetrics: string[]
  onSelect: (key: string) => void
  isLoading: boolean
  shopeeExtra?: { currency: string | null; hasKrw: boolean }
  amazonExtra?: { currency: string | null }
  isGmvMax?: boolean
}

export function KpiSection({
  totals,
  accountType,
  selectedMetrics,
  onSelect,
  isLoading,
  shopeeExtra,
  amazonExtra,
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
          : accountType === 'amazon_organic'
            ? AMAZON_ORGANIC_EFFICIENCY
            : SHOPEE_INAPP_EFFICIENCY
  const rawMetrics = isGmvMax
    ? GMV_MAX_RAW
    : accountType === 'meta'
      ? META_RAW
      : accountType === 'tiktok'
        ? TIKTOK_RAW
        : accountType === 'shopee_shopping'
          ? SHOPEE_SHOPPING_RAW
          : accountType === 'amazon_organic'
            ? AMAZON_ORGANIC_RAW
            : SHOPEE_INAPP_RAW

  const isAmazon = accountType === 'amazon_organic'
  // shopee 계열: 환율 미설정 시 현지통화 포맷 옵션
  const isShopee = accountType === 'shopee_shopping' || accountType === 'shopee_inapp'
  const fmtOpts: { hasKrw?: boolean; currency?: string | null; isAmazon?: boolean } | undefined =
    isAmazon
      ? { isAmazon: true }
      : isShopee && shopeeExtra
        ? { hasKrw: shopeeExtra.hasKrw, currency: shopeeExtra.currency }
        : undefined

  const getNote = (key: string, format: MetricFormat) => {
    if (isAmazon && format === 'currency' && AMAZON_ORGANIC_CURRENCY_KEYS.has(key)) {
      return amazonExtra?.currency ?? 'USD'
    }
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
    <TooltipProvider>
      <div className="space-y-6">
        {/* 효율 지표 */}
        <div className="space-y-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            효율 지표 (Calculated)
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {efficiencyMetrics.map(({ key, label, format, icon, tooltip }) => (
              <KpiBox
                key={key}
                label={label}
                value={formatValue(totals ? ((totals as Record<string, number | null>)[key] ?? null) : null, format, fmtOpts)}
                icon={icon}
                selected={selectedMetrics.includes(key)}
                onClick={() => onSelect(key)}
                isLoading={isLoading}
                note={getNote(key, format)}
                tooltip={tooltip}
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
            {rawMetrics.map(({ key, label, format, tooltip }) => (
              <KpiBox
                key={key}
                label={label}
                value={formatValue(totals ? ((totals as Record<string, number | null>)[key] ?? null) : null, format, fmtOpts)}
                selected={selectedMetrics.includes(key)}
                onClick={() => onSelect(key)}
                isLoading={isLoading}
                note={getNote(key, format)}
                tooltip={tooltip}
              />
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
