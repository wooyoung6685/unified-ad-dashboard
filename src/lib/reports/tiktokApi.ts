import type { TiktokCampaignRow, TiktokAdRow } from '@/types/database'
import { floatOrNull, roundOrNull } from '@/lib/tiktok/utils'

const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3'

// ── 공통 fetch 헬퍼 ────────────────────────────────────────────────────────

async function tiktokGet(
  path: string,
  accessToken: string,
  params: Record<string, string>,
): Promise<unknown> {
  const url = new URL(`${TIKTOK_API_BASE}${path}`)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), {
    headers: { 'Access-Token': accessToken },
  })
  if (!res.ok) throw new Error(`TikTok API ${path} 오류: ${res.status}`)
  const json = (await res.json()) as { code: number; message: string; data: unknown }
  if (json.code !== 0) throw new Error(`TikTok API ${path} 실패: ${json.message}`)
  return json.data
}

// ── 캠페인 관리 API — campaign_type으로 GMV Max 식별 ─────────────────────
// /campaign/get/은 모든 캠페인을 반환하며 campaign_type 필드를 포함함
// GMV Max 캠페인의 campaign_type 값: 'GMV_MAX_CAMPAIGN' (또는 유사 값)

async function fetchCampaignTypes(
  advertiserId: string,
  accessToken: string,
): Promise<Map<string, string>> {
  const campaignTypeMap = new Map<string, string>()

  let page = 1
  while (true) {
    const data = (await tiktokGet('/campaign/get/', accessToken, {
      advertiser_id: advertiserId,
      fields: JSON.stringify(['campaign_id', 'campaign_type', 'objective_type']),
      page: String(page),
      page_size: '1000',
    })) as {
      page_info: { total_page: number }
      list: Array<{ campaign_id: string; campaign_type: string; objective_type: string }>
    }

    for (const item of data.list ?? []) {
      campaignTypeMap.set(item.campaign_id, item.campaign_type ?? '')
    }

    if (page >= (data.page_info?.total_page ?? 1)) break
    page++
  }

  return campaignTypeMap
}

// ── 캠페인 성과 조회 ───────────────────────────────────────────────────────

export async function fetchTiktokCampaigns(
  advertiserId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<TiktokCampaignRow[]> {
  // campaign_type으로 GMV Max를 정확히 식별하기 위해 /campaign/get/ 먼저 호출
  // 실패해도 objective_type 휴리스틱으로 폴백
  let campaignTypeMap = new Map<string, string>()
  try {
    campaignTypeMap = await fetchCampaignTypes(advertiserId, accessToken)
  } catch {
    // campaign.read 스코프 없거나 API 오류 시 무시 — objective_type으로 폴백
  }

  const data = (await tiktokGet('/report/integrated/get/', accessToken, {
    advertiser_id: advertiserId,
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
    start_date: startDate,
    end_date: endDate,
    page: '1',
    page_size: '1000',
  })) as { list: Array<{ dimensions: Record<string, string>; metrics: Record<string, string> }> }

  return (data.list ?? []).map((item) => {
    const d = item.dimensions
    const m = item.metrics
    const spend = floatOrNull(m.spend)
    const revenue = floatOrNull(m.total_purchase_value)
    const roas = spend != null && spend > 0 && revenue != null ? revenue / spend : null

    // campaign_type 기반 GMV Max 판별 (campaign.read 스코프 있을 때)
    // 폴백: objective_type이 PRODUCT_SALES, SHOP_PURCHASES, PRODUCT_SHOPPING 인 경우
    const campaignType = campaignTypeMap.get(d.campaign_id) ?? ''
    const isGmvMaxByType = campaignType.toUpperCase().includes('GMV_MAX')
    const isGmvMaxByObjective = [
      'SHOP_PURCHASES',
      'PRODUCT_SHOPPING',
      'PRODUCT_SALES',
    ].includes(m.objective_type ?? '')
    const isGmvMax = campaignTypeMap.size > 0 ? isGmvMaxByType : isGmvMaxByObjective

    return {
      campaign_id: d.campaign_id,
      campaign_name: m.campaign_name,
      objective_type: m.objective_type ?? '',
      spend,
      impressions: roundOrNull(m.impressions),
      reach: roundOrNull(m.reach),
      clicks: roundOrNull(m.clicks),
      ctr: floatOrNull(m.ctr),
      cpc: floatOrNull(m.cpc),
      cpm: floatOrNull(m.cpm),
      purchases: roundOrNull(m.conversion),
      revenue,
      roas,
      video_views: roundOrNull(m.video_play_actions),
      isGmvMax,
    }
  })
}

// ── 소재 썸네일 조회 ──────────────────────────────────────────────────────
// Spark Ads: tiktok_item_id → TikTok oEmbed API → thumbnail_url
// 일반 광고: video_id → /file/video/ad/info/ → poster_url

// TikTok oEmbed API로 Spark Ads 썸네일 획득 (인증 불필요, 공개 API)
async function fetchOembedThumbnail(itemId: string): Promise<string | null> {
  try {
    const url = `https://www.tiktok.com/oembed?url=https://www.tiktok.com/video/${itemId}`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null
    const json = (await res.json()) as { thumbnail_url?: string }
    return json.thumbnail_url ?? null
  } catch {
    return null
  }
}

async function fetchTiktokAdThumbnails(
  advertiserId: string,
  accessToken: string,
  adIds: string[],
): Promise<Map<string, string>> {
  if (adIds.length === 0) return new Map()

  // 1단계: /ad/get/ 으로 각 ad의 video_id 또는 tiktok_item_id 조회 (100개씩)
  const adCreativeMap = new Map<string, { videoId: string | null; itemId: string | null }>()

  const chunkSize = 100
  for (let i = 0; i < adIds.length; i += chunkSize) {
    const chunk = adIds.slice(i, i + chunkSize)
    const data = (await tiktokGet('/ad/get/', accessToken, {
      advertiser_id: advertiserId,
      fields: JSON.stringify(['ad_id', 'video_id', 'image_ids', 'ad_format', 'tiktok_item_id']),
      filtering: JSON.stringify({ ad_ids: chunk }),
      page: '1',
      page_size: String(chunkSize),
    })) as {
      list: Array<{
        ad_id: string
        video_id?: string | null
        image_ids?: string[]
        tiktok_item_id?: string | null
      }>
    }

    for (const ad of data.list ?? []) {
      adCreativeMap.set(ad.ad_id, {
        videoId: ad.video_id ?? null,
        itemId: ad.tiktok_item_id ?? null,
      })
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`[TikTok] /ad/get/ 응답: ${data.list?.length ?? 0}개, itemId 보유: ${[...adCreativeMap.values()].filter((v) => v.itemId).length}개`)
    }
  }

  // 2단계-A: 일반 광고 — video_id 로 /file/video/ad/info/ 호출
  const videoIds = [...new Set(
    [...adCreativeMap.values()]
      .map((v) => v.videoId)
      .filter((id): id is string => !!id),
  )]

  const videoThumbMap = new Map<string, string>() // video_id → poster_url

  if (videoIds.length > 0) {
    const videoChunkSize = 20
    for (let i = 0; i < videoIds.length; i += videoChunkSize) {
      const chunk = videoIds.slice(i, i + videoChunkSize)
      try {
        const data = (await tiktokGet('/file/video/ad/info/', accessToken, {
          advertiser_id: advertiserId,
          video_ids: JSON.stringify(chunk),
        })) as { list: Array<{ video_id: string; poster_url?: string }> }

        for (const video of data.list ?? []) {
          if (video.poster_url) videoThumbMap.set(video.video_id, video.poster_url)
        }
      } catch {
        // 청크 실패 시 계속 진행
      }
    }
  }

  // 2단계-B: Spark Ads — tiktok_item_id 로 oEmbed API 호출 (병렬, 최대 20개 동시)
  const uniqueItemIds = [...new Set(
    [...adCreativeMap.values()]
      .map((v) => v.itemId)
      .filter((id): id is string => !!id),
  )]

  const itemThumbMap = new Map<string, string>() // tiktok_item_id → thumbnail_url

  if (uniqueItemIds.length > 0) {
    // 동시 요청 제한: 20개씩 병렬 처리
    const concurrency = 20
    for (let i = 0; i < uniqueItemIds.length; i += concurrency) {
      const chunk = uniqueItemIds.slice(i, i + concurrency)
      const results = await Promise.allSettled(
        chunk.map(async (itemId) => {
          const thumbUrl = await fetchOembedThumbnail(itemId)
          return { itemId, thumbUrl }
        }),
      )
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.thumbUrl) {
          itemThumbMap.set(result.value.itemId, result.value.thumbUrl)
        }
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`[TikTok] oEmbed 썸네일 획득: ${itemThumbMap.size}/${uniqueItemIds.length}개`)
    }
  }

  // 3단계: ad_id → thumbnail_url 최종 맵 생성
  const thumbnailMap = new Map<string, string>()
  for (const [adId, creative] of adCreativeMap) {
    if (creative.videoId && videoThumbMap.has(creative.videoId)) {
      thumbnailMap.set(adId, videoThumbMap.get(creative.videoId)!)
    } else if (creative.itemId && itemThumbMap.has(creative.itemId)) {
      thumbnailMap.set(adId, itemThumbMap.get(creative.itemId)!)
    }
  }

  return thumbnailMap
}

// ── 소재(ad) 성과 조회 ─────────────────────────────────────────────────────

export async function fetchTiktokAds(
  advertiserId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<TiktokAdRow[]> {
  // 1단계: 보고서 API로 성과 데이터 조회
  const data = (await tiktokGet('/report/integrated/get/', accessToken, {
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    data_level: 'AUCTION_AD',
    dimensions: JSON.stringify(['ad_id']),
    metrics: JSON.stringify([
      'ad_name',
      'adgroup_name',
      'campaign_name',
      'spend',
      'impressions',
      'clicks',
      'ctr',
      'cpc',
      'cpm',
      'conversion',
      'total_purchase_value',
      'video_play_actions',
    ]),
    start_date: startDate,
    end_date: endDate,
    page: '1',
    page_size: '1000',
  })) as { list: Array<{ dimensions: Record<string, string>; metrics: Record<string, string> }> }

  const adList = data.list ?? []

  // 2단계: 썸네일 조회 (ad.read 스코프 필요 — 실패 시 null 유지)
  const adIds = adList.map((item) => item.dimensions.ad_id)
  let thumbnailMap = new Map<string, string>()
  try {
    thumbnailMap = await fetchTiktokAdThumbnails(advertiserId, accessToken, adIds)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[TikTok] 썸네일 조회 완료: ${thumbnailMap.size}/${adIds.length}개`)
    }
  } catch (err) {
    console.error('[TikTok] 썸네일 조회 실패:', err)
    // ad.read 스코프 없거나 API 오류 시 썸네일 없이 진행
  }

  return adList.map((item) => {
    const d = item.dimensions
    const m = item.metrics
    const spend = floatOrNull(m.spend)
    const revenue = floatOrNull(m.total_purchase_value)
    const roas = spend != null && spend > 0 && revenue != null ? revenue / spend : null
    return {
      ad_id: d.ad_id,
      ad_name: m.ad_name,
      adgroup_name: m.adgroup_name,
      campaign_name: m.campaign_name,
      thumbnail_url: thumbnailMap.get(d.ad_id) ?? null,
      spend,
      impressions: roundOrNull(m.impressions),
      clicks: roundOrNull(m.clicks),
      ctr: floatOrNull(m.ctr),
      cpc: floatOrNull(m.cpc),
      cpm: floatOrNull(m.cpm),
      purchases: roundOrNull(m.conversion),
      revenue,
      roas,
      video_views: roundOrNull(m.video_play_actions),
    }
  })
}
