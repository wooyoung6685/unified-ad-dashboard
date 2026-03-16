// 광고 API 수집 결과 전용 타입 (id/date/account_id 제외한 지표 컬럼만)
// src/types/database.ts의 MetaDailyStat(DB 전체 행)과 분리

export type MetaStatsResult = {
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

export type TikTokStatsResult = {
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
