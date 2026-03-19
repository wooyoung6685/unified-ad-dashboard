// DB 테이블 타입
export type UserProfile = {
  id: string
  brand_id: string | null
  role: 'admin' | 'viewer'
  created_at: string
}

export type Brand = {
  id: string
  name: string
  slug: string
  manager: string | null
  created_at: string
}

export type GlobalSetting = {
  id: string
  platform: 'meta' | 'tiktok'
  access_token: string | null
  app_id: string | null
  secret: string | null
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
}

export type TiktokAccount = {
  id: string
  brand_id: string
  advertiser_id: string
  sub_brand: string | null
  note: string | null
  country: string | null
  is_active: boolean
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
  impressions: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  cpp: number | null
}

export type TiktokDailyStat = {
  id: string
  tiktok_account_id: string
  brand_id: string
  date: string
  spend: number | null
  purchases: number | null
  revenue: number | null
  roas: number | null
  impressions: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  cpp: number | null
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

// 일별 데이터 페이지 전용 확장 타입
export type MetaDailyStatFull = MetaDailyStat & {
  cpa: number | null
  conversion_rate: number | null
  avg_order_value: number | null
  reach: number | null
  frequency: number | null
  cpm: number | null
  content_views: number | null
  cost_per_content_view: number | null
  add_to_cart: number | null
  cost_per_add_to_cart: number | null
  add_to_cart_value: number | null
  outbound_clicks: number | null
  cost_per_outbound_click: number | null
}

export type TiktokDailyStatFull = TiktokDailyStat & {
  reach: number | null
  frequency: number | null
  cpm: number | null
  video_views: number | null
  views_2s: number | null
  views_6s: number | null
  views_25pct: number | null
  views_100pct: number | null
  avg_play_time: number | null
  followers: number | null
  likes: number | null
}

// 일별 페이지 필터
export type DailyFilters = {
  brandId: string
  accountId: string
  accountType: 'meta' | 'tiktok'
  startDate: string
  endDate: string
}

// Summary 페이지 타입
export type SummaryFilters = DailyFilters

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
  views_100pct: number | null
  // 계산 지표
  roas: number | null
  frequency: number | null
  ctr: number | null
  cpc: number | null
  cpa: number | null
}

export type SummaryTotals = Omit<SummaryDayData, 'date'>

export type SummaryResponse = {
  platform: 'meta' | 'tiktok'
  dailyData: SummaryDayData[]
  totals: SummaryTotals
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
