import type { CreativeWidgetConfig, CreativeWidgetFilterCondition, FilterOperator } from '@/types/database'

// 플랫폼별 지표 옵션 타입
export type PlatformMetricOption = {
  value: string
  label: string
  defaultSort: 'asc' | 'desc'
}

// Meta 정렬/필터 지표
export const META_RANK_OPTIONS: PlatformMetricOption[] = [
  { value: 'revenue', label: '구매전환값 (Sales)', defaultSort: 'desc' },
  { value: 'roas', label: 'ROAS', defaultSort: 'desc' },
  { value: 'spend', label: '지출금액 (Spend)', defaultSort: 'desc' },
  { value: 'cpc', label: 'CPC (낮은순)', defaultSort: 'asc' },
  { value: 'ctr', label: 'CTR', defaultSort: 'desc' },
  { value: 'clicks', label: '클릭수', defaultSort: 'desc' },
  { value: 'purchases', label: '구매수', defaultSort: 'desc' },
]

export const META_FILTER_OPTIONS: PlatformMetricOption[] = [
  { value: 'spend', label: '지출금액', defaultSort: 'desc' },
  { value: 'roas', label: 'ROAS', defaultSort: 'desc' },
  { value: 'cpc', label: '클릭당 비용 (CPC)', defaultSort: 'asc' },
  { value: 'ctr', label: '클릭률 (CTR)', defaultSort: 'desc' },
  { value: 'revenue', label: '매출', defaultSort: 'desc' },
  { value: 'clicks', label: '클릭수', defaultSort: 'desc' },
  { value: 'purchases', label: '구매수', defaultSort: 'desc' },
]

// TikTok 정렬/필터 지표
export const TIKTOK_RANK_OPTIONS: PlatformMetricOption[] = [
  { value: 'revenue', label: '구매전환값 (Sales)', defaultSort: 'desc' },
  { value: 'roas', label: 'ROAS', defaultSort: 'desc' },
  { value: 'spend', label: '지출금액 (Spend)', defaultSort: 'desc' },
  { value: 'cpc', label: 'CPC (낮은순)', defaultSort: 'asc' },
  { value: 'ctr', label: 'CTR', defaultSort: 'desc' },
  { value: 'clicks', label: '클릭수', defaultSort: 'desc' },
  { value: 'impressions', label: '노출수', defaultSort: 'desc' },
]

export const TIKTOK_FILTER_OPTIONS: PlatformMetricOption[] = [
  { value: 'spend', label: '지출금액', defaultSort: 'desc' },
  { value: 'roas', label: 'ROAS', defaultSort: 'desc' },
  { value: 'cpc', label: '클릭당 비용 (CPC)', defaultSort: 'asc' },
  { value: 'ctr', label: '클릭률 (CTR)', defaultSort: 'desc' },
  { value: 'revenue', label: '매출', defaultSort: 'desc' },
  { value: 'impressions', label: '노출수', defaultSort: 'desc' },
]

// GMV Max 정렬/필터 지표
export const GMVMAX_RANK_OPTIONS: PlatformMetricOption[] = [
  { value: 'gross_revenue', label: '매출', defaultSort: 'desc' },
  { value: 'roi', label: 'ROI', defaultSort: 'desc' },
  { value: 'cost', label: '비용', defaultSort: 'desc' },
  { value: 'cost_per_order', label: '주문당 비용 (낮은순)', defaultSort: 'asc' },
  { value: 'orders', label: '주문수', defaultSort: 'desc' },
]

export const GMVMAX_FILTER_OPTIONS: PlatformMetricOption[] = [
  { value: 'cost', label: '비용', defaultSort: 'desc' },
  { value: 'roi', label: 'ROI', defaultSort: 'desc' },
  { value: 'cost_per_order', label: '주문당 비용', defaultSort: 'asc' },
  { value: 'gross_revenue', label: '매출', defaultSort: 'desc' },
  { value: 'orders', label: '주문수', defaultSort: 'desc' },
]

// 필터 연산자 옵션
export const OPERATOR_OPTIONS: { value: FilterOperator; label: string }[] = [
  { value: 'gte', label: '이상 (>=)' },
  { value: 'lte', label: '이하 (<=)' },
]

// 플랫폼별 기본 위젯
export const DEFAULT_META_WIDGETS: CreativeWidgetConfig[] = [
  {
    id: 'default-meta-revenue',
    title: '구매전환값 Best 3',
    rankBy: 'revenue',
    sortDirection: 'desc',
    topN: 3,
    filters: [],
  },
  {
    id: 'default-meta-roas',
    title: 'ROAS Best 3',
    rankBy: 'roas',
    sortDirection: 'desc',
    topN: 3,
    filters: [],
  },
]

export const DEFAULT_TIKTOK_WIDGETS: CreativeWidgetConfig[] = [
  {
    id: 'default-tiktok-revenue',
    title: '매출 Best 3',
    rankBy: 'revenue',
    sortDirection: 'desc',
    topN: 3,
    filters: [],
  },
  {
    id: 'default-tiktok-roas',
    title: 'ROAS Best 3',
    rankBy: 'roas',
    sortDirection: 'desc',
    topN: 3,
    filters: [],
  },
]

export const DEFAULT_GMVMAX_WIDGETS: CreativeWidgetConfig[] = [
  {
    id: 'default-gmvmax-revenue',
    title: '매출 Best 3',
    rankBy: 'gross_revenue',
    sortDirection: 'desc',
    topN: 3,
    filters: [],
  },
  {
    id: 'default-gmvmax-roi',
    title: 'ROI Best 3',
    rankBy: 'roi',
    sortDirection: 'desc',
    topN: 3,
    filters: [],
  },
]

// 위젯 설정을 적용하여 아이템 목록을 필터+정렬+슬라이스
export function applyWidgetConfig<T extends Record<string, unknown>>(
  items: T[],
  config: CreativeWidgetConfig,
  metricAccessor: (item: T, metric: string) => number,
): T[] {
  let filtered = [...items]

  // AND 필터 조건 적용
  for (const f of config.filters) {
    filtered = filtered.filter((item) => {
      const val = metricAccessor(item, f.metric)
      if (f.operator === 'gte') return val >= f.value
      if (f.operator === 'lte') return val <= f.value
      return val === f.value
    })
  }

  // 정렬
  filtered.sort((a, b) => {
    const aVal = metricAccessor(a, config.rankBy)
    const bVal = metricAccessor(b, config.rankBy)
    return config.sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  return filtered.slice(0, config.topN)
}

// 위젯 제목 자동 생성 (title이 없을 때)
export function getWidgetAutoTitle(
  config: CreativeWidgetConfig,
  rankByOptions: PlatformMetricOption[],
): string {
  const option = rankByOptions.find((o) => o.value === config.rankBy)
  const metricLabel = option?.label ?? config.rankBy
  const suffix = config.filters.length > 0 ? ' (필터 적용)' : ' (전체 대상)'
  return `${metricLabel} Best ${config.topN}${suffix}`
}

// 필터 조건 요약 텍스트 (위젯 제목 옆 괄호 표시용)
export function getWidgetSubtitle(
  config: CreativeWidgetConfig,
): string {
  if (config.filters.length === 0) return '전체 대상'
  return `필터 ${config.filters.length}개 적용`
}

// 새 위젯용 기본 설정
export function createDefaultWidgetConfig(
  rankBy: string,
  rankByOptions: PlatformMetricOption[],
): Omit<CreativeWidgetConfig, 'id'> {
  const option = rankByOptions.find((o) => o.value === rankBy)
  return {
    rankBy,
    sortDirection: option?.defaultSort ?? 'desc',
    topN: 3,
    filters: [],
  }
}

// 빈 필터 조건 생성
export function createEmptyFilterCondition(
  filterOptions: PlatformMetricOption[],
): CreativeWidgetFilterCondition {
  return {
    metric: filterOptions[0]?.value ?? '',
    operator: 'gte',
    value: 0,
  }
}
