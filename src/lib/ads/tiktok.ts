import type { TikTokStatsResult } from './types'

const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3'

// TikTok API는 모든 수치를 문자열로 반환. "-" 또는 빈값은 null 처리
function num(v: string | undefined | null): number | null {
  if (v == null || v === '' || v === '-') return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function int(v: string | undefined | null): number | null {
  if (v == null || v === '' || v === '-') return null
  const n = parseInt(v)
  return isNaN(n) ? null : n
}

export async function fetchTikTokStats(
  advertiserId: string,
  date: string,
  accessToken: string,
): Promise<TikTokStatsResult | null> {
  try {
    const metrics = [
      'spend',
      'impressions',
      'reach',
      'clicks',
      'frequency',
      'cpc',
      'ctr',
      'cpm',
      'video_play_actions',   // video_views
      'video_watched_2s',     // views_2s
      'video_watched_6s',     // views_6s
      'video_views_p25',      // views_25pct
      'video_views_p100',     // views_100pct
      'average_video_play',   // avg_play_time (초)
      'follows',              // followers
      'likes',
      'complete_payment',     // purchases
      'total_purchase_value', // revenue
      'complete_payment_roas',// roas
      'add_to_cart',
      'add_to_cart_value',
    ]

    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_ADVERTISER',
      dimensions: JSON.stringify(['stat_time_by_day']),
      metrics: JSON.stringify(metrics),
      start_date: date,
      end_date: date,
    })

    const res = await fetch(`${TIKTOK_API_BASE}/report/integrated/get/?${params}`, {
      headers: { 'Access-Token': accessToken },
    })

    if (!res.ok) {
      console.error(`[tiktok] API HTTP 오류 ${res.status} (advertiser=${advertiserId}):`, await res.text())
      return null
    }

    const json = await res.json()

    // TikTok 비즈니스 에러 코드 체크 (0 = 성공)
    if (json.code !== 0) {
      console.error(`[tiktok] API 비즈니스 오류 (advertiser=${advertiserId}):`, json.code, json.message)
      return null
    }

    // 해당 날짜에 데이터 없음
    const rows = json.data?.list
    if (!rows || rows.length === 0) return null

    const m = rows[0].metrics

    const spend = num(m.spend)
    const purchases = int(m.complete_payment)
    const revenue = num(m.total_purchase_value)

    // roas: API 제공값 우선, 없으면 직접 계산
    let roas = num(m.complete_payment_roas)
    if (roas == null && spend && spend > 0 && revenue != null) {
      roas = revenue / spend
    }

    return {
      spend,
      impressions: int(m.impressions),
      reach: int(m.reach),
      clicks: int(m.clicks),
      frequency: num(m.frequency),
      cpc: num(m.cpc),
      ctr: num(m.ctr),
      cpm: num(m.cpm),
      video_views: int(m.video_play_actions),
      views_2s: int(m.video_watched_2s),
      views_6s: int(m.video_watched_6s),
      views_25pct: int(m.video_views_p25),
      views_100pct: int(m.video_views_p100),
      avg_play_time: num(m.average_video_play),
      followers: int(m.follows),
      likes: int(m.likes),
      purchases,
      revenue,
      roas,
      add_to_cart: int(m.add_to_cart),
      add_to_cart_value: num(m.add_to_cart_value),
    }
  } catch (err) {
    console.error(`[tiktok] fetchTikTokStats 예외 (advertiser=${advertiserId}, date=${date}):`, err)
    return null
  }
}
