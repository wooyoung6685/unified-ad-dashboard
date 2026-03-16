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
