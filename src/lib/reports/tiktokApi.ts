import type { TiktokCampaignRow, TiktokAdRow } from '@/types/database'
import { floatOrNull, roundOrNull } from '@/lib/tiktok/utils'
import { getAllAdminTokens } from '@/lib/tokens'

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

// ── 이름 정규화 헬퍼 ──────────────────────────────────────────────────────
// 광고명/비디오명 비교 시 대소문자, 공백, 복사/버전 접미사를 제거하여 정규화

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/_copy\b/gi, '')
    .replace(/\s*\(copy\)\s*/gi, '')
    .replace(/_v\d+$/i, '')
    .replace(/[_\-]\d{6,8}$/, '') // 날짜 접미사 (예: _20240101)
    .trim()
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
// 이미지 광고: image_ids → /file/image/ad/info/ → image_url

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

type AdCreativeMap = Map<string, { videoId: string | null; itemId: string | null; imageIds: string[] | null }>

// /ad/get/ 으로 ad_id → video_id/tiktok_item_id/image_ids 매핑 조회 (ad.read 스코프 필요)
async function tryFetchViaAdGet(
  advertiserId: string,
  accessToken: string,
  adIds: string[],
): Promise<AdCreativeMap | null> {
  const adCreativeMap: AdCreativeMap = new Map()
  const chunkSize = 100
  try {
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
          image_ids?: string[] | null
          tiktok_item_id?: string | null
        }>
      }
      for (const ad of data.list ?? []) {
        adCreativeMap.set(ad.ad_id, {
          videoId: ad.video_id ?? null,
          itemId: ad.tiktok_item_id ?? null,
          imageIds: ad.image_ids?.length ? ad.image_ids : null,
        })
      }
      console.log(
        `[TikTok] /ad/get/ 응답: ${data.list?.length ?? 0}개`
        + ` | video_id: ${[...adCreativeMap.values()].filter((v) => v.videoId).length}개`
        + ` | tiktok_item_id: ${[...adCreativeMap.values()].filter((v) => v.itemId).length}개`
        + ` | image_ids: ${[...adCreativeMap.values()].filter((v) => v.imageIds).length}개`,
      )
    }
    return adCreativeMap
  } catch (err) {
    console.log(`[TikTok] /ad/get/ 실패 (ad.read 권한 없음 또는 오류): ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}


// 비디오 라이브러리 전체 조회 (/file/video/ad/search/) — asset.read 스코프, ad.read 불필요
type VideoLibraryEntry = {
  video_id: string
  video_name: string
  poster_url: string
}

async function fetchVideoLibrary(
  advertiserId: string,
  accessToken: string,
): Promise<VideoLibraryEntry[]> {
  const allVideos: VideoLibraryEntry[] = []
  let page = 1
  while (true) {
    const data = (await tiktokGet('/file/video/ad/search/', accessToken, {
      advertiser_id: advertiserId,
      page: String(page),
      page_size: '100',
    })) as {
      page_info: { total_page: number }
      list: Array<{ video_id: string; video_name?: string; poster_url?: string; cover_image_url?: string }>
    }
    for (const v of data.list ?? []) {
      const posterUrl = v.poster_url ?? v.cover_image_url
      if (v.video_id && v.video_name && posterUrl) {
        allVideos.push({ video_id: v.video_id, video_name: v.video_name, poster_url: posterUrl })
      }
    }
    if (page >= (data.page_info?.total_page ?? 1)) break
    page++
  }
  return allVideos
}

// 비디오 라이브러리와 광고를 다단계 매칭으로 연결하여 ad_id → poster_url 맵 반환
// 전략: 1) exact match → 2) normalized match → 3) contains match
function matchAdsToVideos(
  adNameMap: Map<string, string>, // ad_id → ad_name
  videoLibrary: VideoLibraryEntry[],
): { thumbnailMap: Map<string, string>; stats: Record<string, number> } {
  const thumbnailMap = new Map<string, string>()
  const stats = { exact: 0, normalized: 0, contains: 0, unmatched: 0 }

  // 전략 1: exact match
  const exactVideoMap = new Map(videoLibrary.map((v) => [v.video_name, v]))
  const remaining = new Map<string, string>()

  for (const [adId, adName] of adNameMap) {
    const match = exactVideoMap.get(adName)
    if (match) {
      thumbnailMap.set(adId, match.poster_url)
      stats.exact++
    } else {
      remaining.set(adId, adName)
    }
  }

  if (remaining.size === 0) return { thumbnailMap, stats }

  // 전략 2: normalized match
  const normalizedVideoMap = new Map<string, VideoLibraryEntry>()
  for (const v of videoLibrary) {
    const normalized = normalizeName(v.video_name)
    if (normalized && !normalizedVideoMap.has(normalized)) {
      normalizedVideoMap.set(normalized, v)
    }
  }

  const remaining2 = new Map<string, string>()
  for (const [adId, adName] of remaining) {
    const normalizedAdName = normalizeName(adName)
    const match = normalizedVideoMap.get(normalizedAdName)
    if (match) {
      thumbnailMap.set(adId, match.poster_url)
      stats.normalized++
    } else {
      remaining2.set(adId, adName)
    }
  }

  if (remaining2.size === 0) return { thumbnailMap, stats }

  // 전략 3: contains match — video_name이 ad_name에 포함되거나 그 반대
  // 더 긴 video_name 매칭을 우선 (false positive 방지)
  const sortedVideos = [...videoLibrary].sort(
    (a, b) => b.video_name.length - a.video_name.length,
  )

  for (const [adId, adName] of remaining2) {
    const adNameLower = adName.toLowerCase()
    let bestMatch: VideoLibraryEntry | null = null
    for (const v of sortedVideos) {
      const vNameLower = v.video_name.toLowerCase()
      // 최소 10자 이상인 경우에만 contains match 허용 (너무 짧은 이름 오매칭 방지)
      if (vNameLower.length >= 10 && adNameLower.includes(vNameLower)) {
        bestMatch = v
        break
      }
      if (adNameLower.length >= 10 && vNameLower.includes(adNameLower)) {
        bestMatch = v
        break
      }
    }
    if (bestMatch) {
      thumbnailMap.set(adId, bestMatch.poster_url)
      stats.contains++
    } else {
      stats.unmatched++
    }
  }

  return { thumbnailMap, stats }
}

// Video Library 검색 폴백 — /file/video/ad/search/ 로 모든 비디오를 가져온 후
// 다단계 매칭 전략으로 poster_url 반환 (ad_id → poster_url 맵)
async function tryFetchViaVideoSearch(
  advertiserId: string,
  accessToken: string,
  adNameMap: Map<string, string>, // ad_id → ad_name
): Promise<Map<string, string> | null> {
  try {
    const videoLibrary = await fetchVideoLibrary(advertiserId, accessToken)

    console.log(
      `[TikTok] 비디오 라이브러리 조회 완료: ${videoLibrary.length}개`
      + ` (광고주 ${advertiserId}, 조회 대상 광고 ${adNameMap.size}개)`,
    )

    if (videoLibrary.length === 0) {
      console.log(`[TikTok] 비디오 라이브러리 비어 있음 — 썸네일 매칭 불가`)
      return null
    }

    // 비디오 라이브러리 샘플 출력 (최대 5개)
    const sampleVideos = videoLibrary.slice(0, 5).map((v) => `"${v.video_name}"`)
    console.log(`[TikTok] 비디오 라이브러리 샘플: [${sampleVideos.join(', ')}]`)

    // 조회 대상 광고명 샘플 출력 (최대 5개)
    const sampleAds = [...adNameMap.values()].slice(0, 5).map((n) => `"${n}"`)
    console.log(`[TikTok] 매칭 대상 광고명 샘플: [${sampleAds.join(', ')}]`)

    const { thumbnailMap, stats } = matchAdsToVideos(adNameMap, videoLibrary)

    console.log(
      `[TikTok] 비디오 매칭 결과: total=${adNameMap.size}`
      + ` | exact=${stats.exact} | normalized=${stats.normalized} | contains=${stats.contains} | unmatched=${stats.unmatched}`,
    )

    // 매칭 실패한 광고 목록 출력
    if (stats.unmatched > 0) {
      const unmatchedAds = [...adNameMap.entries()]
        .filter(([adId]) => !thumbnailMap.has(adId))
        .map(([adId, adName]) => `${adId}:"${adName}"`)
      console.log(`[TikTok] 매칭 실패 광고: [${unmatchedAds.join(', ')}]`)
    }

    return thumbnailMap.size > 0 ? thumbnailMap : null
  } catch (err) {
    console.log(`[TikTok] /file/video/ad/search/ 실패: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

// 다른 어드민 토큰으로 /ad/get/ 재시도 폴백
async function tryFetchWithOtherTokens(
  advertiserId: string,
  currentToken: string,
  adIds: string[],
): Promise<AdCreativeMap | null> {
  try {
    const allTokens = await getAllAdminTokens('tiktok')
    const otherTokens = allTokens.filter((t) => t.access_token !== currentToken)
    console.log(`[TikTok] 다른 어드민 토큰으로 재시도: ${otherTokens.length}개 토큰`)
    for (const { access_token } of otherTokens) {
      const result = await tryFetchViaAdGet(advertiserId, access_token, adIds)
      if (result && result.size > 0) {
        console.log(`[TikTok] 다른 어드민 토큰으로 /ad/get/ 성공: ${result.size}개`)
        return result
      }
    }
  } catch {
    // 폴백 실패 — 무시
  }
  console.log(`[TikTok] 다른 어드민 토큰 재시도 모두 실패`)
  return null
}

// video_id → poster_url, tiktok_item_id → oEmbed thumbnail, image_ids → image_url 조회
async function buildThumbnailMap(
  advertiserId: string,
  accessToken: string,
  adCreativeMap: AdCreativeMap,
): Promise<Map<string, string>> {
  // 2단계-A: 일반 광고 — video_id 로 /file/video/ad/info/ 호출
  const videoIds = [...new Set(
    [...adCreativeMap.values()]
      .map((v) => v.videoId)
      .filter((id): id is string => !!id),
  )]

  const videoThumbMap = new Map<string, string>()

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
      } catch (err) {
        console.log(`[TikTok] /file/video/ad/info/ 청크 실패: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    console.log(`[TikTok] /file/video/ad/info/ 결과: ${videoThumbMap.size}/${videoIds.length}개 poster_url 획득`)
  }

  // 2단계-B: Spark Ads — tiktok_item_id 로 oEmbed API 호출 (병렬, 최대 20개 동시)
  const uniqueItemIds = [...new Set(
    [...adCreativeMap.values()]
      .map((v) => v.itemId)
      .filter((id): id is string => !!id),
  )]

  const itemThumbMap = new Map<string, string>()

  if (uniqueItemIds.length > 0) {
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
    console.log(`[TikTok] oEmbed 썸네일 획득: ${itemThumbMap.size}/${uniqueItemIds.length}개`)
  }

  // 2단계-C: 이미지 광고 — image_ids 로 /file/image/ad/info/ 호출
  // video_id/tiktok_item_id 없는 광고이면서 image_ids가 있는 경우
  const imageAdEntries = [...adCreativeMap.entries()].filter(
    ([, c]) => !c.videoId && !c.itemId && c.imageIds?.length,
  )
  const uniqueImageIds = [
    ...new Set(imageAdEntries.flatMap(([, c]) => c.imageIds ?? [])),
  ]
  const imageThumbMap = new Map<string, string>() // image_id → image_url

  if (uniqueImageIds.length > 0) {
    const imageChunkSize = 20
    for (let i = 0; i < uniqueImageIds.length; i += imageChunkSize) {
      const chunk = uniqueImageIds.slice(i, i + imageChunkSize)
      try {
        const data = (await tiktokGet('/file/image/ad/info/', accessToken, {
          advertiser_id: advertiserId,
          image_ids: JSON.stringify(chunk),
        })) as { list: Array<{ image_id: string; image_url?: string; url?: string }> }
        for (const img of data.list ?? []) {
          const imgUrl = img.image_url ?? img.url
          if (imgUrl) imageThumbMap.set(img.image_id, imgUrl)
        }
      } catch (err) {
        console.log(`[TikTok] /file/image/ad/info/ 청크 실패: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    console.log(`[TikTok] /file/image/ad/info/ 결과: ${imageThumbMap.size}/${uniqueImageIds.length}개 image_url 획득`)
  }

  // 3단계: ad_id → thumbnail_url 최종 맵 생성
  const thumbnailMap = new Map<string, string>()
  for (const [adId, creative] of adCreativeMap) {
    if (creative.videoId && videoThumbMap.has(creative.videoId)) {
      thumbnailMap.set(adId, videoThumbMap.get(creative.videoId)!)
    } else if (creative.itemId && itemThumbMap.has(creative.itemId)) {
      thumbnailMap.set(adId, itemThumbMap.get(creative.itemId)!)
    } else if (creative.imageIds?.length) {
      // 첫 번째 image_id의 URL 사용
      for (const imgId of creative.imageIds) {
        if (imageThumbMap.has(imgId)) {
          thumbnailMap.set(adId, imageThumbMap.get(imgId)!)
          break
        }
      }
    }
  }

  console.log(
    `[TikTok] buildThumbnailMap 최종 결과: ${thumbnailMap.size}/${adCreativeMap.size}개`
    + ` (video=${videoThumbMap.size}, spark=${itemThumbMap.size}, image=${imageThumbMap.size})`,
  )

  return thumbnailMap
}

async function fetchTiktokAdThumbnails(
  advertiserId: string,
  accessToken: string,
  adIds: string[],
  adNameMap: Map<string, string>, // ad_id → ad_name (Video Search 매칭용)
): Promise<Map<string, string>> {
  if (adIds.length === 0) return new Map()

  console.log(`[TikTok] 썸네일 조회 시작: 광고주=${advertiserId}, 광고 수=${adIds.length}개`)

  let thumbnailMap = new Map<string, string>()

  // Phase 1: ad.read 기반 조회 시도
  let adCreativeMap = await tryFetchViaAdGet(advertiserId, accessToken, adIds)

  if (!adCreativeMap || adCreativeMap.size === 0) {
    console.log(`[TikTok] Phase 1-A 실패 → 다른 어드민 토큰 재시도`)
    adCreativeMap = await tryFetchWithOtherTokens(advertiserId, accessToken, adIds)
  }

  // Phase 1 성공 시 video/spark/image thumbnail 해결
  if (adCreativeMap && adCreativeMap.size > 0) {
    thumbnailMap = await buildThumbnailMap(advertiserId, accessToken, adCreativeMap)
  } else {
    console.log(`[TikTok] Phase 1 전체 실패 (ad.read 권한 없음) → Phase 2 video search로 진행`)
  }

  // Phase 2: 썸네일 누락된 광고에 대해 비디오 라이브러리 매칭으로 보충
  // (Phase 1 성공 여부와 무관하게 항상 실행 — 누락 광고가 있으면 보충)
  const missingAdIds = adIds.filter((id) => !thumbnailMap.has(id))
  if (missingAdIds.length > 0) {
    console.log(`[TikTok] Phase 2: 썸네일 누락 광고 ${missingAdIds.length}개 → video search 보충 시도`)
    const missingAdNameMap = new Map(
      missingAdIds
        .filter((id) => adNameMap.has(id))
        .map((id) => [id, adNameMap.get(id)!]),
    )
    if (missingAdNameMap.size > 0) {
      const videoSearchResults = await tryFetchViaVideoSearch(
        advertiserId,
        accessToken,
        missingAdNameMap,
      )
      if (videoSearchResults) {
        for (const [adId, url] of videoSearchResults) {
          thumbnailMap.set(adId, url)
        }
        console.log(
          `[TikTok] Phase 2 video search 보충 완료: +${videoSearchResults.size}개`
          + ` (총 ${thumbnailMap.size}/${adIds.length}개)`,
        )
      } else {
        console.log(`[TikTok] Phase 2 video search 결과 없음`)
      }
    }
  } else {
    console.log(`[TikTok] Phase 2 스킵 (누락 광고 없음)`)
  }

  console.log(`[TikTok] 썸네일 조회 최종: ${thumbnailMap.size}/${adIds.length}개`)
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

  // 2단계: 썸네일 조회 (여러 폴백 경로 시도 — 실패 시 null 유지)
  const adIds = adList.map((item) => item.dimensions.ad_id)
  const adNameMap = new Map(adList.map((item) => [item.dimensions.ad_id, item.metrics.ad_name ?? '']))
  let thumbnailMap = new Map<string, string>()
  try {
    thumbnailMap = await fetchTiktokAdThumbnails(advertiserId, accessToken, adIds, adNameMap)
  } catch (err) {
    console.error('[TikTok] 썸네일 조회 실패:', err)
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
