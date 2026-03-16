// TikTok Business API Report 엔드포인트 호출 → tiktok_daily_stats 컬럼과 1:1 매핑

export type TiktokStatPayload = {
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
}

// 값이 null/undefined/"" 이면 null, 아니면 반올림 정수
function roundOrNull(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : Math.round(parsed)
}

// 소수점 유지 파싱 (spend, revenue, avg_play_time 등)
function floatOrNull(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

export async function fetchStats(params: {
  advertiser_id: string
  access_token: string
  date: string
}): Promise<TiktokStatPayload | null> {
  const { advertiser_id, access_token, date } = params

  const dimensions = ['stat_time_day']
  const metrics = [
    'stat_cost',        // spend
    'impression',       // impressions
    'reach',            // reach
    'click_cnt',        // clicks
    'video_play_actions',  // video_views
    'video_watched_2s',    // views_2s
    'video_watched_6s',    // views_6s
    'video_views_p25',     // views_25pct
    'video_views_p100',    // views_100pct
    'average_play_time',   // avg_play_time
    'follows',             // followers
    'likes',               // likes
    'total_purchase_value',  // revenue
    'conversion',            // purchases
  ]

  const searchParams = new URLSearchParams({
    advertiser_id,
    report_type: 'BASIC',
    data_level: 'AUCTION_ADVERTISER',
    dimensions: JSON.stringify(dimensions),
    metrics: JSON.stringify(metrics),
    start_date: date,
    end_date: date,
    page: '1',
    page_size: '1',
  })

  const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${searchParams.toString()}`

  const res = await fetch(url, {
    headers: { 'Access-Token': access_token },
  })

  if (!res.ok) {
    throw new Error(`TikTok API 오류: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as {
    code?: number
    message?: string
    data?: {
      list?: Array<{
        dimensions?: { stat_time_day?: string }
        metrics?: Record<string, string>
      }>
    }
  }

  if (data.code !== 0) {
    throw new Error(`TikTok API 응답 오류: ${data.message ?? data.code}`)
  }

  const row = data.data?.list?.[0]
  if (!row) return null

  const m = row.metrics ?? {}

  // 기본 지표 파싱
  const spend = floatOrNull(m['stat_cost'])
  const impressions = roundOrNull(m['impression'])
  const reach = roundOrNull(m['reach'])
  const clicks = roundOrNull(m['click_cnt'])
  const video_views = roundOrNull(m['video_play_actions'])
  const views_2s = roundOrNull(m['video_watched_2s'])
  const views_6s = roundOrNull(m['video_watched_6s'])
  const views_25pct = roundOrNull(m['video_views_p25'])
  const views_100pct = roundOrNull(m['video_views_p100'])
  const avg_play_time = floatOrNull(m['average_play_time'])
  const followers = roundOrNull(m['follows'])
  const likes = roundOrNull(m['likes'])
  const purchases = roundOrNull(m['conversion'])
  const revenue = floatOrNull(m['total_purchase_value'])

  // 계산 지표 (분모 0 체크)
  const frequency =
    reach !== null && reach > 0 && impressions !== null
      ? impressions / reach
      : null

  const cpc =
    clicks !== null && clicks > 0 && spend !== null ? spend / clicks : null

  const ctr =
    impressions !== null && impressions > 0 && clicks !== null
      ? (clicks / impressions) * 100
      : null

  const cpm =
    impressions !== null && impressions > 0 && spend !== null
      ? (spend / impressions) * 1000
      : null

  const roas =
    spend !== null && spend > 0 && revenue !== null ? revenue / spend : null

  return {
    spend,
    impressions,
    reach,
    clicks,
    frequency,
    cpc,
    ctr,
    cpm,
    video_views,
    views_2s,
    views_6s,
    views_25pct,
    views_100pct,
    avg_play_time,
    followers,
    likes,
    purchases,
    revenue,
    roas,
  }
}
