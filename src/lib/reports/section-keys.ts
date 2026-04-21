// 리포트 섹션별 인사이트 저장에 사용하는 키 상수
// reports.section_insights jsonb의 key로 사용되며, 서버에서는
// ALL_SECTION_KEYS 화이트리스트로 엄격 검증한다.

export const META_SECTION_KEYS = {
  monthly: 'meta.monthly',
  weeklyCharts: 'meta.weekly_charts',
  weeklyTable: 'meta.weekly_table',
  campaigns: 'meta.campaigns',
  adsets: 'meta.adsets',
  creatives: 'meta.creatives',
} as const

export const TIKTOK_SECTION_KEYS = {
  monthly: 'tiktok.monthly',
  weeklyCharts: 'tiktok.weekly_charts',
  weeklyTable: 'tiktok.weekly_table',
  campaigns: 'tiktok.campaigns',
  adgroups: 'tiktok.adgroups',
  creatives: 'tiktok.creatives',
} as const

export const TIKTOK_GMVMAX_SECTION_KEYS = {
  monthly: 'tiktok.gmvmax.monthly',
  weeklyCharts: 'tiktok.gmvmax.weekly_charts',
  weeklyTable: 'tiktok.gmvmax.weekly_table',
  campaigns: 'tiktok.gmvmax.campaigns',
  creatives: 'tiktok.gmvmax.creatives',
} as const

export const SHOPEE_SECTION_KEYS = {
  monthly: 'shopee.monthly',
  adsRoasTop5: 'shopee.ads_roas_top5',
  weeklyCharts: 'shopee.weekly_charts',
  weeklyTable: 'shopee.weekly_table',
  promotion: 'shopee.promotion',
  voucherTop3: 'shopee.voucher_top3',
  productTop5: 'shopee.product_top5',
} as const

export const AMAZON_SECTION_KEYS = {
  monthly: 'amazon.monthly',
  weeklyTable: 'amazon.weekly_table',
  weeklyCharts: 'amazon.weekly_charts',
  keywords: 'amazon.keywords',
  daily: 'amazon.daily',
  products: 'amazon.products',
} as const

export const QOO10_SECTION_KEYS = {
  monthly: 'qoo10.monthly',
  weeklyTable: 'qoo10.weekly_table',
  weeklyCharts: 'qoo10.weekly_charts',
  daily: 'qoo10.daily',
  products: 'qoo10.products',
} as const

export const ALL_SECTION_KEYS: ReadonlySet<string> = new Set([
  ...Object.values(META_SECTION_KEYS),
  ...Object.values(TIKTOK_SECTION_KEYS),
  ...Object.values(TIKTOK_GMVMAX_SECTION_KEYS),
  ...Object.values(SHOPEE_SECTION_KEYS),
  ...Object.values(AMAZON_SECTION_KEYS),
  ...Object.values(QOO10_SECTION_KEYS),
])

export function isValidSectionKey(k: unknown): k is string {
  return typeof k === 'string' && ALL_SECTION_KEYS.has(k)
}
