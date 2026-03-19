import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// 임시 디버그용 — TikTok API 원본 JSON 확인
// GET /api/admin/debug/tiktok?advertiser_id=<id>&date=2026-02-01
export async function GET(req: NextRequest) {
  const advertiser_id = req.nextUrl.searchParams.get('advertiser_id')
  const date = req.nextUrl.searchParams.get('date')

  if (!advertiser_id || !date) {
    return NextResponse.json(
      { error: 'advertiser_id, date 파라미터가 필요합니다.' },
      { status: 400 },
    )
  }

  // global_settings에서 tiktok 토큰 조회
  const { data: settings } = await supabaseAdmin
    .from('global_settings')
    .select('access_token')
    .eq('platform', 'tiktok')
    .single()

  const access_token = settings?.access_token
  if (!access_token) {
    return NextResponse.json({ error: 'TikTok 토큰이 없습니다.' }, { status: 400 })
  }

  const dimensions = ['stat_time_day']
  const metrics = [
    'stat_cost',
    'impressions',
    'reach',
    'click_cnt',
    'video_play_actions',
    'video_watched_2s',
    'video_watched_6s',
    'video_views_p25',
    'video_views_p100',
    'average_video_play',
    'follows',
    'likes',
    'total_purchase_value',
    'conversion',
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

  const raw = await res.json()

  // 원본 응답 + 파싱된 metrics 비교를 같이 반환
  return NextResponse.json({ url, raw })
}
