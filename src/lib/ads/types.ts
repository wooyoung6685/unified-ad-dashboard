// 광고 API 수집 결과 전용 타입 (id/date/account_id 제외한 지표 컬럼만)
// src/types/database.ts의 MetaDailyStat(DB 전체 행)과 분리

export type MetaStatsResult = {
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

export type TikTokStatsResult = {
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
