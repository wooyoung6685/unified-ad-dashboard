import { getTokenForCurrentUser } from '@/lib/tokens'
import { NextRequest, NextResponse } from 'next/server'

// 임시 디버그용 — TikTok API 원본 JSON 확인
// GET /api/admin/debug/tiktok?advertiser_id=<id>&date=2026-02-01
// GET /api/admin/debug/tiktok?type=campaign&advertiser_id=<id>&start_date=2026-02-01&end_date=2026-02-28
// GET /api/admin/debug/tiktok?type=ad&advertiser_id=<id>&start_date=2026-02-01&end_date=2026-02-28
// GET /api/admin/debug/tiktok?type=creative&advertiser_id=<id>
// GET /api/admin/debug/tiktok?type=campaign_list&advertiser_id=<id>  ← GMV Max campaign_type 확인
// GET /api/admin/debug/tiktok?type=video_info&advertiser_id=<id>&video_ids=vid1,vid2  ← 썸네일 poster_url 확인
// GET /api/admin/debug/tiktok?type=gmv_max_store&advertiser_id=<id>  ← GMV Max Store 목록 원본 응답 확인
// GET /api/admin/debug/tiktok?type=gmv_max_report&advertiser_id=<id>&store_ids=["id1"]&start_date=...&end_date=...  ← GMV Max 리포트 원본
// GET /api/admin/debug/tiktok?type=gmv_max_campaign&advertiser_id=<id>  ← GMV Max 캠페인명 조회 테스트
// GET /api/admin/debug/tiktok?type=gmv_max_campaign_report&advertiser_id=<id>&store_ids=["id1"]&start_date=2026-03-01&end_date=2026-03-31  ← GMV Max 캠페인별 광고지표
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  const advertiser_id = searchParams.get('advertiser_id')

  if (!advertiser_id) {
    return NextResponse.json({ error: 'advertiser_id 파라미터가 필요합니다.' }, { status: 400 })
  }

  // 현재 로그인한 어드민의 tiktok 토큰 조회
  const access_token = await getTokenForCurrentUser('tiktok')
  if (!access_token) {
    return NextResponse.json({ error: 'TikTok 토큰이 없습니다.' }, { status: 400 })
  }

  // type=gmv_max_campaign: GMV Max 캠페인명 조회 테스트
  if (type === 'gmv_max_campaign') {
    const results: Record<string, unknown>[] = []
    const params = new URLSearchParams({
      advertiser_id,
      filtering: JSON.stringify({ gmv_max_promotion_types: ['LIVE_GMV_MAX', 'PRODUCT_GMV_MAX'] }),
      page: '1',
      page_size: '100',
    })
    const url = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/campaign/get/?${params.toString()}`
    const res = await fetch(url, { headers: { 'Access-Token': access_token } })
    const raw = await res.json()
    results.push({ code: raw.code, message: raw.message, data: raw.data })
    return NextResponse.json({ results })
  }

  // type=gmv_max_campaign_report: GMV Max 캠페인별 광고지표
  if (type === 'gmv_max_campaign_report') {
    const store_ids = searchParams.get('store_ids')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    if (!store_ids || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'store_ids, start_date, end_date 파라미터가 필요합니다.' },
        { status: 400 },
      )
    }
    const params = new URLSearchParams({
      advertiser_id,
      store_ids,
      dimensions: JSON.stringify(['campaign_id']),
      metrics: JSON.stringify(['cost', 'gross_revenue', 'roi', 'orders', 'cost_per_order']),
      start_date,
      end_date,
      page: '1',
      page_size: '100',
    })
    const url = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?${params.toString()}`
    const res = await fetch(url, { headers: { 'Access-Token': access_token } })
    const raw = await res.json()
    return NextResponse.json({ url, raw })
  }

  // type=gmv_max_store: GMV Max Store 목록 원본 응답 확인
  if (type === 'gmv_max_store') {
    const url = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/store/list/?advertiser_id=${advertiser_id}`
    const res = await fetch(url, { headers: { 'Access-Token': access_token } })
    const raw = await res.json()
    return NextResponse.json({ url, raw })
  }

  // type=gmv_max_report: GMV Max 리포트 원본 응답 확인
  if (type === 'gmv_max_report') {
    const store_ids = searchParams.get('store_ids')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    if (!store_ids || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'store_ids, start_date, end_date 파라미터가 필요합니다.' },
        { status: 400 },
      )
    }
    const params = new URLSearchParams({
      advertiser_id,
      store_ids,
      dimensions: JSON.stringify(['campaign_id', 'stat_time_day']),
      metrics: JSON.stringify(['cost', 'gross_revenue', 'roi', 'orders', 'impressions', 'clicks']),
      start_date,
      end_date,
      page: '1',
      page_size: '10',
    })
    const url = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?${params.toString()}`
    const res = await fetch(url, { headers: { 'Access-Token': access_token } })
    const raw = await res.json()
    return NextResponse.json({ url, raw })
  }

  // type=campaign: 캠페인 레벨 리포트
  if (type === 'campaign') {
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'start_date, end_date 파라미터가 필요합니다.' },
        { status: 400 },
      )
    }

    const params = new URLSearchParams({
      advertiser_id,
      report_type: 'BASIC',
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: JSON.stringify(['campaign_id']),
      metrics: JSON.stringify([
        'campaign_name',
        'objective_type',
        'spend',
        'impressions',
        'reach',
        'clicks',
        'ctr',
        'cpc',
        'cpm',
        'conversion',
        'total_purchase_value',
        'video_play_actions',
      ]),
      start_date,
      end_date,
      page: '1',
      page_size: '50',
    })

    const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`
    const res = await fetch(url, { headers: { 'Access-Token': access_token } })
    const raw = await res.json()
    return NextResponse.json({ url, raw })
  }

  // type=ad: 소재 레벨 리포트
  if (type === 'ad') {
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'start_date, end_date 파라미터가 필요합니다.' },
        { status: 400 },
      )
    }

    const params = new URLSearchParams({
      advertiser_id,
      report_type: 'BASIC',
      data_level: 'AUCTION_AD',
      dimensions: JSON.stringify(['ad_id']),
      metrics: JSON.stringify([
        'ad_name',
        'adgroup_name',
        'campaign_name',
        'spend',
        'impressions',
        'reach',
        'clicks',
        'ctr',
        'cpc',
        'cpm',
        'conversion',
        'total_purchase_value',
        'video_play_actions',
        'profile_visits',
        'follows',
        'likes',
        'comments',
        'shares',
      ]),
      start_date,
      end_date,
      page: '1',
      page_size: '5',
    })

    const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`
    const res = await fetch(url, { headers: { 'Access-Token': access_token } })
    const raw = await res.json()
    return NextResponse.json({ url, raw })
  }

  // type=campaign_list: 캠페인 관리 API — campaign_type으로 GMV Max 확인
  if (type === 'campaign_list') {
    const params = new URLSearchParams({
      advertiser_id,
      fields: JSON.stringify([
        'campaign_id',
        'campaign_name',
        'campaign_type',
        'objective_type',
        'budget_mode',
        'budget',
        'operation_status',
        'secondary_status',
      ]),
      page: '1',
      page_size: '50',
    })

    const url = `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?${params.toString()}`
    const res = await fetch(url, { headers: { 'Access-Token': access_token } })
    const raw = await res.json()
    return NextResponse.json({ url, raw })
  }

  // type=video_info: 일반 광고 동영상 썸네일 poster_url 확인
  if (type === 'video_info') {
    const videoIdsParam = searchParams.get('video_ids')
    if (!videoIdsParam) {
      return NextResponse.json({ error: 'video_ids 파라미터가 필요합니다. (쉼표로 구분)' }, { status: 400 })
    }
    const videoIds = videoIdsParam.split(',').map((id) => id.trim()).filter(Boolean)

    const params = new URLSearchParams({
      advertiser_id,
      video_ids: JSON.stringify(videoIds),
    })

    const url = `https://business-api.tiktok.com/open_api/v1.3/file/video/ad/info/?${params.toString()}`
    const res = await fetch(url, { headers: { 'Access-Token': access_token } })
    const raw = await res.json()
    return NextResponse.json({ url, raw })
  }

  // type=spark_oembed: TikTok oEmbed API로 Spark Ads 썸네일 확인 (인증 불필요)
  // GET /api/admin/debug/tiktok?type=spark_oembed&advertiser_id=<id>&item_id=7610618929743924511
  if (type === 'spark_oembed') {
    const itemId = searchParams.get('item_id')
    if (!itemId) {
      return NextResponse.json({ error: 'item_id 파라미터가 필요합니다.' }, { status: 400 })
    }

    const oembedUrl = `https://www.tiktok.com/oembed?url=https://www.tiktok.com/video/${itemId}`
    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const raw = await res.json()
    return NextResponse.json({ url: oembedUrl, status: res.status, raw })
  }

  // type=creative: 소재 크리에이티브 정보 (Spark Ads 포함)
  if (type === 'creative') {
    const params = new URLSearchParams({
      advertiser_id,
      fields: JSON.stringify([
        'ad_id',
        'ad_name',
        'video_id',
        'image_ids',
        'call_to_action',
        'ad_format',
        'tiktok_item_id',   // Spark Ads 오리지널 포스트 ID
        'item_duet_status', // Spark Ads 여부
        'creative_type',    // 크리에이티브 유형
      ]),
      page: '1',
      page_size: '5',
    })

    const url = `https://business-api.tiktok.com/open_api/v1.3/ad/get/?${params.toString()}`
    const res = await fetch(url, { headers: { 'Access-Token': access_token } })
    const raw = await res.json()
    return NextResponse.json({ url, raw })
  }

  // 기본 동작 (하위호환): 기존 어드버타이저 레벨 일별 리포트
  const date = searchParams.get('date')
  if (!date) {
    return NextResponse.json(
      { error: 'type 없이 사용 시 date 파라미터가 필요합니다.' },
      { status: 400 },
    )
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

  const params = new URLSearchParams({
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

  const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`
  const res = await fetch(url, { headers: { 'Access-Token': access_token } })
  const raw = await res.json()

  return NextResponse.json({ url, raw })
}
