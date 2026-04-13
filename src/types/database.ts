// DB 테이블 타입
export type UserProfile = {
  id: string
  brand_id: string | null
  role: 'admin' | 'viewer'
  created_by: string | null
  created_at: string
}

export type Brand = {
  id: string
  name: string
  slug: string
  manager: string | null
  created_at: string
  owner_user_id: string | null
}

export type GlobalSetting = {
  id: string
  platform: 'meta' | 'tiktok'
  access_token: string | null
  app_id: string | null
  secret: string | null
  updated_at: string
}

export type AdminPlatformToken = {
  id: string
  user_id: string
  platform: 'meta' | 'tiktok'
  access_token: string | null
  app_id: string | null
  secret: string | null
  created_at: string
  updated_at: string
}

export type MetaAccount = {
  id: string
  brand_id: string
  account_id: string
  sub_brand: string | null
  note: string | null
  country: string | null
  is_active: boolean
  owner_user_id: string | null
}

export type TiktokAccount = {
  id: string
  brand_id: string
  advertiser_id: string
  sub_brand: string | null
  note: string | null
  country: string | null
  is_active: boolean
  store_id: string | null  // GMV Max 리포트 API용 TikTok Shop Store ID
  owner_user_id: string | null
}

export type MetaDailyStat = {
  id: string
  meta_account_id: string
  brand_id: string
  date: string
  spend: number | null
  purchases: number | null
  revenue: number | null
  roas: number | null
  cpa: number | null
  conversion_rate: number | null
  avg_order_value: number | null
  reach: number | null
  impressions: number | null
  frequency: number | null
  cpm: number | null
  clicks: number | null
  cpc: number | null
  ctr: number | null
  content_views: number | null
  cost_per_content_view: number | null
  add_to_cart: number | null
  cost_per_add_to_cart: number | null
  add_to_cart_value: number | null
  outbound_clicks: number | null
  cost_per_outbound_click: number | null
}

export type TiktokDailyStat = {
  id: string
  tiktok_account_id: string
  brand_id: string
  date: string
  spend: number | null
  impressions: number | null
  reach: number | null
  clicks: number | null
  frequency: number | null
  cpc: number | null
  ctr: number | null
  cpm: number | null
  video_views: number | null
  views_2s: number | null
  views_6s: number | null
  views_25pct: number | null
  views_100pct: number | null
  avg_play_time: number | null
  followers: number | null
  likes: number | null
  purchases: number | null
  revenue: number | null
  roas: number | null
  add_to_cart: number | null
  add_to_cart_value: number | null
}

export type ShopeeAccount = {
  id: string
  brand_id: string
  account_id: string
  account_name: string
  account_type: 'shopping' | 'inapp'
  country: string | null
  sub_brand: string | null
  is_active: boolean
  created_at: string
}

export type ShopeeShoppingStat = {
  id: string
  shopee_account_id: string
  brand_id: string
  date: string
  currency: string | null
  sales: number | null
  sales_krw: number | null
  sales_without_rebate: number | null
  sales_without_rebate_krw: number | null
  orders: number | null
  sales_per_order: number | null
  sales_per_order_krw: number | null
  product_clicks: number | null
  visitors: number | null
  order_conversion_rate: number | null
  cancelled_orders: number | null
  cancelled_sales: number | null
  cancelled_sales_krw: number | null
  refunded_orders: number | null
  refunded_sales: number | null
  refunded_sales_krw: number | null
  buyers: number | null
  new_buyers: number | null
  existing_buyers: number | null
  potential_buyers: number | null
  repeat_purchase_rate: number | null
  created_at: string
  // API에서 계산 (메타 spend + 인앱 expense_krw 합산)
  spend_krw?: number | null
}

export type ShopeeInappStat = {
  id: string
  shopee_account_id: string
  brand_id: string
  date: string
  ads_type: 'product_ad' | 'shop_ad' | 'other'
  currency: string | null
  impressions: number | null
  clicks: number | null
  ctr: number | null
  conversions: number | null
  direct_conversions: number | null
  conversion_rate: number | null
  direct_conversion_rate: number | null
  cost_per_conversion: number | null
  cost_per_conversion_krw: number | null
  cost_per_direct_conversion: number | null
  cost_per_direct_conversion_krw: number | null
  items_sold: number | null
  direct_items_sold: number | null
  gmv: number | null
  gmv_krw: number | null
  direct_gmv: number | null
  direct_gmv_krw: number | null
  expense: number | null
  expense_krw: number | null
  roas: number | null
  direct_roas: number | null
  acos: number | null
  direct_acos: number | null
  created_at: string
}

// 인앱: 날짜별 합산 결과 (ads_type 3개 합산)
export type ShopeeInappDayRow = {
  date: string
  currency: string | null
  impressions: number
  clicks: number
  ctr: number | null
  conversions: number
  direct_conversions: number
  conversion_rate: number | null
  direct_conversion_rate: number | null
  cost_per_conversion: number | null
  cost_per_conversion_krw: number | null
  cost_per_direct_conversion: number | null
  cost_per_direct_conversion_krw: number | null
  items_sold: number
  direct_items_sold: number
  gmv: number
  gmv_krw: number | null
  direct_gmv: number
  direct_gmv_krw: number | null
  expense: number
  expense_krw: number | null
  roas: number | null
  direct_roas: number | null
  acos: number | null
  direct_acos: number | null
}

// UI 집계 타입
export type DailyStatRow = {
  date: string
  totalSpend: number
  metaSpend: number
  tiktokSpend: number
  totalRevenue: number
  metaRevenue: number
  tiktokRevenue: number
  roas: number
  purchases: number
}

export type KpiSummary = {
  totalSpend: number
  totalRevenue: number
  roas: number
  totalPurchases: number
}

// MetaDailyStat / TiktokDailyStat이 전체 컬럼을 포함하므로 alias로 유지 (하위 호환)
export type MetaDailyStatFull = MetaDailyStat
export type TiktokDailyStatFull = TiktokDailyStat

// ── Amazon ──────────────────────────────────

export type AmazonAccount = {
  id: string
  brand_id: string
  account_id: string
  account_name: string
  account_type: 'organic' | 'ads' | 'asin'
  country: string | null
  is_active: boolean
  created_at: string
}

export type AmazonOrganicStat = {
  id: string
  amazon_account_id: string
  brand_id: string
  date: string
  currency: string | null
  ordered_product_sales: number | null
  ordered_product_sales_b2b: number | null
  orders: number | null
  orders_b2b: number | null
  total_order_items: number | null
  total_order_items_b2b: number | null
  page_views: number | null
  page_views_b2b: number | null
  sessions: number | null
  sessions_b2b: number | null
  buy_box_percentage: number | null
  buy_box_percentage_b2b: number | null
  unit_session_percentage: number | null
  unit_session_percentage_b2b: number | null
  average_offer_count: number | null
  average_parent_items: number | null
  created_at: string
}

export type AmazonAdsStat = {
  id: string
  amazon_account_id: string
  brand_id: string
  date: string
  currency: string | null
  impressions: number | null
  viewable_impressions: number | null
  clicks: number | null
  cost: number | null
  purchases: number | null
  purchases_new_to_brand: number | null
  sales: number | null
  long_term_sales: number | null
  ctr: number | null
  cpc: number | null
  roas: number | null
  long_term_roas: number | null
  cost_per_purchase: number | null
  created_at: string
}

export type AmazonAsinStat = {
  id: string
  amazon_account_id: string
  brand_id: string
  date: string
  currency: string | null
  parent_asin: string | null
  child_asin: string | null
  title: string | null
  sessions: number | null
  sessions_b2b: number | null
  session_percentage: number | null
  session_percentage_b2b: number | null
  page_views: number | null
  page_views_b2b: number | null
  page_views_percentage: number | null
  page_views_percentage_b2b: number | null
  buy_box_percentage: number | null
  buy_box_percentage_b2b: number | null
  orders: number | null
  orders_b2b: number | null
  unit_session_percentage: number | null
  unit_session_percentage_b2b: number | null
  ordered_product_sales: number | null
  ordered_product_sales_b2b: number | null
  total_order_items: number | null
  total_order_items_b2b: number | null
  created_at: string
}

// 일별 페이지 필터
export type DailyFilters = {
  brandId: string
  accountId: string
  accountType: 'meta' | 'tiktok' | 'shopee_shopping' | 'shopee_inapp' | 'amazon_organic' | 'amazon_ads' | 'amazon_asin'
  startDate: string
  endDate: string
}

export type SummaryFilters = {
  brandId: string
  accountId: string
  accountType: 'meta' | 'tiktok' | 'shopee_shopping' | 'shopee_inapp' | 'amazon_organic' | 'amazon_ads' | 'amazon_asin'
  startDate: string
  endDate: string
}

export type SummaryDayData = {
  date: string
  spend: number | null
  revenue: number | null
  impressions: number | null
  reach: number | null
  clicks: number | null
  purchases: number | null
  add_to_cart: number | null
  video_views: number | null
  views_2s: number | null
  views_6s: number | null
  views_25pct: number | null
  views_100pct: number | null
  // Meta 전용 원본 지표
  content_views: number | null
  outbound_clicks: number | null
  // 계산 지표
  roas: number | null
  frequency: number | null
  ctr: number | null
  cpc: number | null
  cpa: number | null
  cpm: number | null  // CPM = spend / (impressions / 1000), Meta 전용
  aov: number | null  // 객단가 (Average Order Value = revenue / purchases)
  purchase_rate: number | null  // 구매율 = purchases / content_views, Meta 전용
  conversion_rate?: number | null  // 전환율 (conversions / clicks * 100), shopee_inapp 전용
  // Shopee Shopping 전용 필드
  buyers?: number | null
  new_buyers?: number | null
  existing_buyers?: number | null
  order_conversion_rate?: number | null
  repeat_purchase_rate?: number | null
  cancelled_orders?: number | null
  cancelled_sales?: number | null
  refunded_orders?: number | null
  refunded_sales?: number | null
  // Amazon 오가닉 전용 필드
  buy_box_percentage?: number | null
  unit_session_percentage?: number | null
}

export type SummaryTotals = Omit<SummaryDayData, 'date'>

// GMV Max 요약용 일별 데이터 (SummaryDayData와 구조가 다름)
export type GmvMaxSummaryDayData = {
  date: string
  cost: number | null
  gross_revenue: number | null
  roi: number | null
  orders: number | null
  cost_per_order: number | null
}

export type GmvMaxSummaryTotals = Omit<GmvMaxSummaryDayData, 'date'>

// ── Amazon Dashboard ──────────────────────────

// 광고 요약 일별 데이터
export type AmazonAdsSummaryDayData = {
  date: string
  cost: number | null
  sales: number | null
  impressions: number | null
  clicks: number | null
  purchases: number | null
  purchases_new_to_brand: number | null
  acos: number | null
  roas: number | null
  cpc: number | null
  ctr: number | null
  cost_per_purchase: number | null
}

export type AmazonAdsSummaryTotals = Omit<AmazonAdsSummaryDayData, 'date'>

// 통합 핵심 지표 (오가닉 + 광고 합산)
export type AmazonCombinedTotals = {
  total_sales: number | null
  organic_sales: number | null
  ad_sales: number | null
  ad_cost: number | null
  tacos: number | null           // TACoS = ad_cost / organic_sales * 100
  ad_sales_ratio: number | null  // ad_sales / total_sales * 100
  total_orders: number | null
  total_sessions: number | null
}

export type SummaryResponse = {
  platform: 'meta' | 'tiktok' | 'shopee_shopping' | 'shopee_inapp' | 'amazon'
  dailyData: SummaryDayData[]
  totals: SummaryTotals
  shopeeExtra?: {
    currency: string | null  // 현지통화 코드 (예: 'SGD', 'VND')
    hasKrw: boolean          // KRW 환산 가능 여부
  }
  // Shopee 쇼핑몰/인앱 분리 데이터
  shoppingDailyData?: SummaryDayData[]
  shoppingTotals?: SummaryTotals
  inappDailyData?: SummaryDayData[]
  inappTotals?: SummaryTotals
  // TikTok GMV Max 데이터 (데이터 존재 시에만 포함)
  gmvMaxDailyData?: GmvMaxSummaryDayData[]
  gmvMaxTotals?: GmvMaxSummaryTotals
  // Amazon 오가닉/광고 분리 데이터
  organicDailyData?: SummaryDayData[]
  organicTotals?: SummaryTotals
  adsDailyData?: AmazonAdsSummaryDayData[]
  adsTotals?: AmazonAdsSummaryTotals
  combinedTotals?: AmazonCombinedTotals
  amazonExtra?: { currency: string | null }
}

export type ExchangeRate = {
  id: string
  year_month: string
  country: string
  currency: string
  rate: number
  created_at: string
  updated_at: string
  owner_user_id: string | null
}

// 필터 타입
export type Platform = 'all' | 'meta' | 'tiktok'
export type DateRange = '1d' | '7d' | '30d' | 'custom'

export type DashboardFilters = {
  platform: Platform
  range: DateRange
  from?: string
  to?: string
  accountId: string
}

// ── Reports ───────────────────────────────────

// 소재 랭킹 위젯 필터 연산자
export type FilterOperator = 'gte' | 'lte' | 'eq'

// 소재 랭킹 위젯 단일 필터 조건
export type CreativeWidgetFilterCondition = {
  metric: string
  operator: FilterOperator
  value: number
}

// 소재 랭킹 위젯 설정
export type CreativeWidgetConfig = {
  id: string
  title?: string
  rankBy: string
  sortDirection: 'desc' | 'asc'
  topN: number
  filters: CreativeWidgetFilterCondition[]
}

// admin이 설정하는 캠페인/세트 노출 필터
// null 또는 키 부재 = 전체 표시, string[] = 선택된 ID만 표시
export type ReportFilters = {
  meta_campaign_ids?: string[] | null
  meta_adset_ids?: string[] | null
  tiktok_campaign_ids?: string[] | null
  tiktok_adgroup_ids?: string[] | null
  tiktok_gmvmax_campaign_ids?: string[] | null
  // 소재 랭킹 위젯 설정 (없으면 플랫폼별 기본값 사용)
  meta_creative_widgets?: CreativeWidgetConfig[] | null
  tiktok_creative_widgets?: CreativeWidgetConfig[] | null
  gmvmax_creative_widgets?: CreativeWidgetConfig[] | null
}

export type Report = {
  id: string
  brand_id: string
  title: string
  platform: 'meta' | 'shopee_inapp' | 'tiktok' | 'amazon'
  country: string | null
  internal_account_id: string | null
  year: number
  month: number
  status: 'published'
  snapshot: ReportSnapshot | null
  insight_memo: string | null
  insight_memo_gmv_max: string | null
  insight_memo_title: string | null
  insight_memo_gmv_max_title: string | null
  filters: ReportFilters | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ReportListItem = Omit<Report, 'snapshot'> & {
  brand_name: string
}

export type ReportSnapshot =
  | { platform: 'meta'; data: MetaReportData }
  | { platform: 'shopee_inapp'; data: ShopeeReportData }
  | { platform: 'tiktok'; data: TiktokReportData }
  | { platform: 'amazon'; data: AmazonReportData }

// ── Meta ──────────────────────────────────────

export type MetaReportData = {
  monthly: MetaMonthlyData
  weekly: MetaWeeklyData[]
  campaigns: MetaCampaignData[]
  adsets?: MetaAdsetData[]
  creatives: MetaCreativeData[]
}

export type MetaMonthlyData = {
  spend: number | null
  revenue: number | null
  roas: number | null
  purchases: number | null
  impressions: number | null
  reach: number | null
  frequency: number | null
  cpm: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  add_to_cart: number | null
  cost_per_add_to_cart: number | null
  // 전월
  prev_spend: number | null
  prev_revenue: number | null
  prev_roas: number | null
  prev_purchases: number | null
  prev_impressions: number | null
  prev_reach: number | null
  prev_frequency: number | null
  prev_cpm: number | null
  prev_clicks: number | null
  prev_ctr: number | null
  prev_cpc: number | null
  prev_add_to_cart: number | null
  prev_cost_per_add_to_cart: number | null
}

export type MetaWeeklyData = {
  week: number
  date_range: string
  spend: number | null
  revenue: number | null
  roas: number | null
  purchases: number | null
  impressions: number | null
  reach: number | null
  frequency: number | null
  cpm: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  add_to_cart: number | null
  add_to_cart_value: number | null
}

export type MetaCampaignData = {
  campaign_id: string
  campaign_name: string
  spend: number | null
  revenue: number | null
  roas: number | null
  purchases: number | null
  impressions: number | null
  reach: number | null
  frequency: number | null
  cpm: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  add_to_cart: number | null
  cost_per_add_to_cart: number | null
  add_to_cart_value: number | null
  prev_spend: number | null
  prev_revenue: number | null
  prev_roas: number | null
  prev_purchases: number | null
  prev_impressions: number | null
  prev_reach: number | null
  prev_frequency: number | null
  prev_cpm: number | null
  prev_clicks: number | null
  prev_ctr: number | null
  prev_cpc: number | null
  prev_add_to_cart: number | null
  prev_cost_per_add_to_cart: number | null
}

export type MetaAdsetData = {
  adset_id: string
  adset_name: string
  campaign_name: string
  spend: number | null
  revenue: number | null
  roas: number | null
  purchases: number | null
  impressions: number | null
  reach: number | null
  frequency: number | null
  cpm: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  add_to_cart: number | null
  cost_per_add_to_cart: number | null
  add_to_cart_value: number | null
  prev_spend: number | null
  prev_revenue: number | null
  prev_roas: number | null
  prev_purchases: number | null
  prev_impressions: number | null
  prev_reach: number | null
  prev_frequency: number | null
  prev_cpm: number | null
  prev_clicks: number | null
  prev_ctr: number | null
  prev_cpc: number | null
  prev_add_to_cart: number | null
  prev_cost_per_add_to_cart: number | null
}

export type MetaCreativeData = {
  ad_id: string
  ad_name: string
  campaign_name: string
  adset_name: string
  thumbnail_url: string | null
  is_fb_ads_image?: boolean
  spend: number | null
  revenue: number | null
  roas: number | null
  purchases: number | null
  add_to_cart: number | null
  add_to_cart_value: number | null
  impressions: number | null
  ctr: number | null
  cpc: number | null
  clicks: number | null
}

// ── Shopee Inapp ──────────────────────────────

export type ShopeeReportData = {
  monthly: ShopeeMonthlyData
  weekly: ShopeeWeeklyData[]
  ads_breakdown: ShopeeAdsBreakdownData[] // Shop Ads / Product Ads 구분
}

export type ShopeeMonthlyData = {
  sales_krw: number | null // shopee_shopping_stats.sales_krw 합산
  orders: number | null // shopee_shopping_stats.orders 합산
  product_clicks: number | null // shopee_shopping_stats.product_clicks 합산
  visitors: number | null // shopee_shopping_stats.visitors 합산
  cvr: number | null // orders / visitors * 100
  units_sold: number | null // shopee_inapp_stats.items_sold 합산
  sales_per_buyer: number | null // sales_krw / buyers
  new_buyers: number | null // shopee_shopping_stats.new_buyers 합산
  existing_buyers: number | null // shopee_shopping_stats.existing_buyers 합산
  ad_spend_inapp_krw: number | null // shopee_inapp_stats.expense_krw 합산
  ad_spend_meta: number | null // meta_daily_stats.spend 합산 (같은 brand+country)
  // 전월
  prev_sales_krw: number | null
  prev_orders: number | null
  prev_product_clicks: number | null
  prev_visitors: number | null
  prev_cvr: number | null
  prev_units_sold: number | null
  prev_sales_per_buyer: number | null
  prev_new_buyers: number | null
  prev_existing_buyers: number | null
  prev_ad_spend_inapp_krw: number | null
  prev_ad_spend_meta: number | null
}

export type ShopeeWeeklyData = {
  week: number
  date_range: string
  impressions: number | null
  clicks: number | null
  cpc_krw: number | null
  ctr: number | null
  spend_krw: number | null
  purchases: number | null
  revenue_krw: number | null
  roas: number | null
  conversion_rate: number | null
}

export type ShopeeAdsBreakdownData = {
  ads_type: 'shop_ad' | 'product_ad' // ads_type 원본값
  label: string // 'Shop Ads' | 'Product Ads'
  impressions: number | null
  clicks: number | null
  cpc_krw: number | null
  ctr: number | null
  spend_krw: number | null
  purchases: number | null
  revenue_krw: number | null
  roas: number | null
  conversion_rate: number | null
  // 전월
  prev_impressions: number | null
  prev_clicks: number | null
  prev_cpc_krw: number | null
  prev_ctr: number | null
  prev_spend_krw: number | null
  prev_purchases: number | null
  prev_revenue_krw: number | null
  prev_roas: number | null
  prev_conversion_rate: number | null
}

// ── TikTok ────────────────────────────────────

export type TiktokReportData = {
  monthly: TiktokMonthlyData
  weekly: TiktokWeeklyData[]
  campaigns: TiktokCampaignRow[]
  adgroups?: TiktokAdgroupRow[]
  ads: TiktokAdRow[]
  hasGmvMax: boolean
  gmvMaxMonthly?: GmvMaxMonthlyData
  gmvMaxWeekly?: GmvMaxWeeklyData[]
  gmvMaxCampaigns?: GmvMaxCampaignRow[]
  gmvMaxItems?: GmvMaxItemRow[]
}

export type TiktokMonthlyData = {
  spend: number | null
  revenue: number | null
  roas: number | null
  purchases: number | null
  impressions: number | null
  reach: number | null
  frequency: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  cpm: number | null
  video_views: number | null
  views_2s: number | null
  views_6s: number | null
  views_25pct: number | null
  views_100pct: number | null
  // 전월
  prev_spend: number | null
  prev_revenue: number | null
  prev_roas: number | null
  prev_purchases: number | null
  prev_impressions: number | null
  prev_reach: number | null
  prev_frequency: number | null
  prev_clicks: number | null
  prev_ctr: number | null
  prev_cpc: number | null
  prev_cpm: number | null
  prev_video_views: number | null
  prev_views_2s: number | null
  prev_views_6s: number | null
  prev_views_25pct: number | null
  prev_views_100pct: number | null
}

export type TiktokWeeklyData = {
  week: number
  date_range: string
  spend: number | null
  revenue: number | null
  roas: number | null
  purchases: number | null
  add_to_cart: number | null
  add_to_cart_value: number | null
  impressions: number | null
  reach: number | null
  frequency: number | null
  cpm: number | null
  clicks: number | null
  cpc: number | null
  ctr: number | null
  video_views: number | null
  views_2s: number | null
  views_6s: number | null
  views_25pct: number | null
  views_100pct: number | null
}

export type TiktokCampaignRow = {
  campaign_id: string
  campaign_name: string
  objective_type: string
  spend: number | null
  impressions: number | null
  reach: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  cpm: number | null
  conversions: number | null
  purchases: number | null
  revenue: number | null
  roas: number | null
  video_views: number | null
  isGmvMax: boolean
}

export type TiktokAdgroupRow = {
  adgroup_id: string
  adgroup_name: string
  campaign_name: string
  spend: number | null
  impressions: number | null
  reach: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  cpm: number | null
  conversions: number | null
  purchases: number | null
  revenue: number | null
  roas: number | null
  video_views: number | null
}

export type TiktokAdRow = {
  ad_id: string
  ad_name: string
  adgroup_name: string
  campaign_name: string
  thumbnail_url: string | null
  spend: number | null
  impressions: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  cpm: number | null
  conversions: number | null
  purchases: number | null
  revenue: number | null
  roas: number | null
  video_views: number | null
}

// GMV Max 전용 타입 (/gmv_max/report/get/ API 응답)
// 일반 TikTok API와 필드명이 다름: cost / gross_revenue / roi

export type GmvMaxDailyRow = {
  date: string
  campaign_id: string | null
  campaign_name: string | null
  cost: number | null        // 일반 API의 spend에 해당
  gross_revenue: number | null  // 일반 API의 total_purchase_value에 해당
  roi: number | null         // 일반 API의 roas에 해당
  orders: number | null      // 주문(전환)수
  cost_per_order: number | null
}

export type GmvMaxCampaignRow = {
  campaign_id: string
  campaign_name: string | null
  cost: number | null
  gross_revenue: number | null
  roi: number | null
  orders: number | null
  cost_per_order: number | null
}

// gmv_max_daily_stats 테이블 row 타입
export type GmvMaxDailyStatRow = {
  tiktok_account_id: string
  brand_id: string | null
  date: string
  cost: number | null
  gross_revenue: number | null
  roi: number | null
  orders: number | null
}

// GMV Max 리포트 전용 타입 (리포트 스냅샷용)

export type GmvMaxMonthlyData = {
  cost: number | null
  gross_revenue: number | null
  roi: number | null
  orders: number | null
  cost_per_order: number | null
  // 전월
  prev_cost: number | null
  prev_gross_revenue: number | null
  prev_roi: number | null
  prev_orders: number | null
  prev_cost_per_order: number | null
}

export type GmvMaxWeeklyData = {
  week: number
  date_range: string
  cost: number | null
  gross_revenue: number | null
  roi: number | null
  orders: number | null
  cost_per_order: number | null
}

export type GmvMaxItemRow = {
  item_id: string
  item_group_id: string
  campaign_id: string
  title: string | null
  cost: number | null
  gross_revenue: number | null
  roi: number | null
  orders: number | null
  cost_per_order: number | null
  thumbnail_url: string | null
}

// ── Amazon Report ──────────────────────────────

export type AmazonReportData = {
  monthly: AmazonMonthlyData
  weekly: AmazonWeeklyData[]
  keywords: AmazonKeywordData[]
  daily: AmazonDailyData[]
  products: AmazonProductData[]
}

export type AmazonMonthlyData = {
  // 오가닉 (Organic)
  organic_sales: number | null
  orders: number | null
  sessions: number | null
  conversion_rate: number | null
  aov: number | null
  // 내부광고 (Ads)
  ad_cost: number | null
  ad_sales: number | null
  ad_roas: number | null
  ad_impressions: number | null
  ad_clicks: number | null
  ad_cpc: number | null
  ad_ctr: number | null
  // 전월 (Prev)
  prev_organic_sales: number | null
  prev_orders: number | null
  prev_sessions: number | null
  prev_conversion_rate: number | null
  prev_aov: number | null
  prev_ad_cost: number | null
  prev_ad_sales: number | null
  prev_ad_roas: number | null
  prev_ad_impressions: number | null
  prev_ad_clicks: number | null
  prev_ad_cpc: number | null
  prev_ad_ctr: number | null
}

export type AmazonWeeklyData = {
  week: number
  date_range: string
  organic_sales: number | null
  orders: number | null
  sessions: number | null
  conversion_rate: number | null
  aov: number | null
  ad_cost: number | null
  ad_sales: number | null
  ad_roas: number | null
  ad_impressions: number | null
  ad_clicks: number | null
  ad_cpc: number | null
  ad_ctr: number | null
}

export type AmazonKeywordData = {
  keyword: string
  impressions: number
}

export type AmazonDailyData = {
  date: string
  organic_sales: number | null
  orders: number | null
  sessions: number | null
  conversion_rate: number | null
}

export type AmazonProductData = {
  title: string
  parent_asin: string | null
  child_asin: string | null
  sales: number | null
  quantity: number | null
}
