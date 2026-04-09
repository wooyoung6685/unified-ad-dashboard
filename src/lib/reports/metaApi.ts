import type { MetaAdsetData, MetaCreativeData } from '@/types/database'
import type { MetaAdsetCurrent, MetaCampaignCurrent } from './aggregators'

const META_GRAPH_BASE = 'https://graph.facebook.com/v21.0'

/** thumbnail_url에서 stp 파라미터를 제거해 원본 해상도 URL 반환 */
function removeStp(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete('stp')
    return u.toString()
  } catch {
    return url
  }
}

// ── Action 파싱 유틸 ────────────────────────────────────────────────────────

const PURCHASE_CANDIDATES = [
  'omni_purchase',
  'purchase',
  'offsite_conversion.fb_pixel_purchase',
  'app_custom_event.fb_mobile_purchase',
]

const ADD_TO_CART_CANDIDATES = [
  'omni_add_to_cart',
  'add_to_cart',
  'offsite_conversion.fb_pixel_add_to_cart',
  'app_custom_event.fb_mobile_add_to_cart',
]

type ActionEntry = { action_type: string; value: string }

function findAction(
  actions: ActionEntry[] | undefined,
  candidates: string[],
  extra?: ActionEntry[],
): number | null {
  const merged = [...(actions ?? []), ...(extra ?? [])]
  for (const candidate of candidates) {
    const found = merged.find((a) => a.action_type === candidate)
    if (found) return parseFloat(found.value) || null
  }
  return null
}

// ── 캠페인 인사이트 ────────────────────────────────────────────────────────

const CAMPAIGN_FIELDS = [
  'campaign_id',
  'campaign_name',
  'spend',
  'impressions',
  'reach',
  'frequency',
  'cpm',
  'clicks',
  'ctr',
  'cpc',
  'actions',
  'action_values',
  'catalog_segment_actions',
  'catalog_segment_value',
  'cost_per_action_type',
].join(',')

export async function fetchMetaCampaigns(
  accountId: string,
  accessToken: string,
  since: string,
  until: string,
): Promise<MetaCampaignCurrent[]> {
  const params = new URLSearchParams({
    fields: CAMPAIGN_FIELDS,
    level: 'campaign',
    time_range: JSON.stringify({ since, until }),
    access_token: accessToken,
    limit: '100',
  })

  const res = await fetch(`${META_GRAPH_BASE}/act_${accountId}/insights?${params}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta 캠페인 API 오류 ${res.status}: ${body}`)
  }

  const json = await res.json()
  if (json.error) throw new Error(`Meta 캠페인 API 오류: ${json.error.message}`)

  return (json.data ?? []).map((row: any): MetaCampaignCurrent => {
    const spend = parseFloat(row.spend ?? '0')
    const impressions = parseFloat(row.impressions ?? '0')
    const reach = parseFloat(row.reach ?? '0')
    const clicks = parseFloat(row.clicks ?? '0')

    const purchases = findAction(
      row.actions,
      PURCHASE_CANDIDATES,
      row.catalog_segment_actions,
    )
    const revenue = findAction(
      row.action_values,
      PURCHASE_CANDIDATES,
      row.catalog_segment_value,
    )
    const add_to_cart = findAction(
      row.actions,
      ADD_TO_CART_CANDIDATES,
      row.catalog_segment_actions,
    )
    const add_to_cart_value = findAction(
      row.action_values,
      ADD_TO_CART_CANDIDATES,
      row.catalog_segment_value,
    )
    const cost_per_add_to_cart = findAction(row.cost_per_action_type, ADD_TO_CART_CANDIDATES)

    return {
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      spend: spend || null,
      revenue,
      roas: revenue != null && spend > 0 ? (revenue / spend) * 100 : null,
      purchases: purchases != null ? Math.round(purchases) : null,
      impressions: impressions || null,
      reach: reach || null,
      frequency: reach > 0 ? impressions / reach : null,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
      clicks: clicks || null,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
      cpc: clicks > 0 ? spend / clicks : null,
      add_to_cart: add_to_cart != null ? Math.round(add_to_cart) : null,
      cost_per_add_to_cart,
      add_to_cart_value,
    }
  })
}

export function mergeMetaCampaignPrev(
  current: MetaCampaignCurrent[],
  prev: MetaCampaignCurrent[],
) {
  const prevMap = new Map(prev.map((c) => [c.campaign_id, c]))
  return current.map((cur) => {
    const p = prevMap.get(cur.campaign_id)
    return {
      ...cur,
      prev_spend: p?.spend ?? null,
      prev_revenue: p?.revenue ?? null,
      prev_roas: p?.roas ?? null,
      prev_purchases: p?.purchases ?? null,
      prev_impressions: p?.impressions ?? null,
      prev_reach: p?.reach ?? null,
      prev_frequency: p?.frequency ?? null,
      prev_cpm: p?.cpm ?? null,
      prev_clicks: p?.clicks ?? null,
      prev_ctr: p?.ctr ?? null,
      prev_cpc: p?.cpc ?? null,
      prev_add_to_cart: p?.add_to_cart ?? null,
      prev_cost_per_add_to_cart: p?.cost_per_add_to_cart ?? null,
    }
  })
}

// ── 광고세트(Adset) 인사이트 ────────────────────────────────────────────────

const ADSET_FIELDS = [
  'adset_id',
  'adset_name',
  'campaign_name',
  'spend',
  'impressions',
  'reach',
  'frequency',
  'cpm',
  'clicks',
  'ctr',
  'cpc',
  'actions',
  'action_values',
  'catalog_segment_actions',
  'catalog_segment_value',
  'cost_per_action_type',
].join(',')

export async function fetchMetaAdsets(
  accountId: string,
  accessToken: string,
  since: string,
  until: string,
): Promise<MetaAdsetCurrent[]> {
  const params = new URLSearchParams({
    fields: ADSET_FIELDS,
    level: 'adset',
    time_range: JSON.stringify({ since, until }),
    access_token: accessToken,
    limit: '200',
  })

  const res = await fetch(`${META_GRAPH_BASE}/act_${accountId}/insights?${params}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta 광고세트 API 오류 ${res.status}: ${body}`)
  }

  const json = await res.json()
  if (json.error) throw new Error(`Meta 광고세트 API 오류: ${json.error.message}`)

  return (json.data ?? []).map((row: any): MetaAdsetCurrent => {
    const spend = parseFloat(row.spend ?? '0')
    const impressions = parseFloat(row.impressions ?? '0')
    const reach = parseFloat(row.reach ?? '0')
    const clicks = parseFloat(row.clicks ?? '0')

    const purchases = findAction(row.actions, PURCHASE_CANDIDATES, row.catalog_segment_actions)
    const revenue = findAction(row.action_values, PURCHASE_CANDIDATES, row.catalog_segment_value)
    const add_to_cart = findAction(row.actions, ADD_TO_CART_CANDIDATES, row.catalog_segment_actions)
    const add_to_cart_value = findAction(row.action_values, ADD_TO_CART_CANDIDATES, row.catalog_segment_value)
    const cost_per_add_to_cart = findAction(row.cost_per_action_type, ADD_TO_CART_CANDIDATES)

    return {
      adset_id: row.adset_id,
      adset_name: row.adset_name,
      campaign_name: row.campaign_name,
      spend: spend || null,
      revenue,
      roas: revenue != null && spend > 0 ? (revenue / spend) * 100 : null,
      purchases: purchases != null ? Math.round(purchases) : null,
      impressions: impressions || null,
      reach: reach || null,
      frequency: reach > 0 ? impressions / reach : null,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
      clicks: clicks || null,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
      cpc: clicks > 0 ? spend / clicks : null,
      add_to_cart: add_to_cart != null ? Math.round(add_to_cart) : null,
      cost_per_add_to_cart,
      add_to_cart_value,
    }
  })
}

export function mergeMetaAdsetPrev(
  current: MetaAdsetCurrent[],
  prev: MetaAdsetCurrent[],
): MetaAdsetData[] {
  const prevMap = new Map(prev.map((a) => [a.adset_id, a]))
  return current.map((cur) => {
    const p = prevMap.get(cur.adset_id)
    return {
      ...cur,
      prev_spend: p?.spend ?? null,
      prev_revenue: p?.revenue ?? null,
      prev_roas: p?.roas ?? null,
      prev_purchases: p?.purchases ?? null,
      prev_impressions: p?.impressions ?? null,
      prev_reach: p?.reach ?? null,
      prev_frequency: p?.frequency ?? null,
      prev_cpm: p?.cpm ?? null,
      prev_clicks: p?.clicks ?? null,
      prev_ctr: p?.ctr ?? null,
      prev_cpc: p?.cpc ?? null,
      prev_add_to_cart: p?.add_to_cart ?? null,
      prev_cost_per_add_to_cart: p?.cost_per_add_to_cart ?? null,
    }
  })
}

// ── 소재(Ad) 인사이트 + 썸네일 ────────────────────────────────────────────

const AD_FIELDS = [
  'ad_id',
  'ad_name',
  'adset_name',
  'campaign_name',
  'spend',
  'clicks',
  'actions',
  'action_values',
  'catalog_segment_actions',
  'catalog_segment_value',
].join(',')

const BATCH_SIZE = 50

export async function fetchMetaCreatives(
  accountId: string,
  accessToken: string,
  since: string,
  until: string,
): Promise<MetaCreativeData[]> {
  // Step 1: ad 레벨 인사이트 조회
  const params = new URLSearchParams({
    fields: AD_FIELDS,
    level: 'ad',
    time_range: JSON.stringify({ since, until }),
    access_token: accessToken,
    limit: '200',
  })

  const insightsRes = await fetch(`${META_GRAPH_BASE}/act_${accountId}/insights?${params}`)
  if (!insightsRes.ok) {
    const body = await insightsRes.text()
    throw new Error(`Meta 소재 인사이트 API 오류 ${insightsRes.status}: ${body}`)
  }

  const insightsJson = await insightsRes.json()
  if (insightsJson.error) throw new Error(`Meta 소재 API 오류: ${insightsJson.error.message}`)

  const adRows: any[] = insightsJson.data ?? []
  if (adRows.length === 0) return []

  // Step 2: Facebook Batch API로 크리에이티브 정보 일괄 조회 (50개 단위 청크)
  const creativeInfoMap = new Map<
    string,
    { imageUrl: string | null; imageHash: string | null; videoId: string | null; isFbAdsImage: boolean }
  >()

  for (let i = 0; i < adRows.length; i += BATCH_SIZE) {
    const chunk = adRows.slice(i, i + BATCH_SIZE)
    const batch = chunk.map((row) => ({
      method: 'GET',
      relative_url: `${row.ad_id}?fields=creative{thumbnail_url,image_url,image_hash,video_id,object_story_spec{video_data{image_url},link_data{picture,child_attachments{picture}},photo_data{picture}},asset_feed_spec{images{url,hash}}}`,
    }))

    try {
      const batchRes = await fetch(`${META_GRAPH_BASE}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          access_token: accessToken,
          batch: JSON.stringify(batch),
        }),
      })

      if (!batchRes.ok) {
        chunk.forEach((row) =>
          creativeInfoMap.set(row.ad_id, { imageUrl: null, imageHash: null, videoId: null, isFbAdsImage: false }),
        )
        continue
      }

      const batchJson: Array<{ code: number; body: string } | null> = await batchRes.json()

      for (let j = 0; j < chunk.length; j++) {
        const adId = chunk[j].ad_id
        const result = batchJson[j]

        if (!result || result.code !== 200) {
          console.warn(`[meta:creative] adId=${adId} batch code=${result?.code ?? 'null'} body=${result?.body?.slice(0, 200) ?? ''}`)
          creativeInfoMap.set(adId, { imageUrl: null, imageHash: null, videoId: null, isFbAdsImage: false })
          continue
        }

        try {
          const parsed = JSON.parse(result.body)
          const creative = parsed.creative

          // [DEBUG] 크리에이티브 원본 구조 출력
          console.log(`[meta:creative] adId=${adId}`, JSON.stringify({
            image_url: creative?.image_url,
            image_hash: creative?.image_hash,
            thumbnail_url: creative?.thumbnail_url,
            video_id: creative?.video_id,
            oss_video_image: creative?.object_story_spec?.video_data?.image_url,
            oss_link_full: creative?.object_story_spec?.link_data?.full_picture,
            oss_link_pic: creative?.object_story_spec?.link_data?.picture,
            oss_photo: creative?.object_story_spec?.photo_data?.picture,
            asset_feed_img: creative?.asset_feed_spec?.images?.[0],
          }))

          // 이미지 URL 우선순위 결정
          let imageUrl: string | null = null
          let imageHash: string | null = null
          let isFbAdsImage = false

          if (creative?.image_url) {
            imageUrl = creative.image_url
          } else if (creative?.object_story_spec?.video_data?.image_url) {
            // facebook.com/ads/image/ URL — access_token 필요 (서버에서 fetch 가능)
            imageUrl = creative.object_story_spec.video_data.image_url
            isFbAdsImage = imageUrl?.includes('facebook.com/ads/image/') ?? false
          } else if (creative?.object_story_spec?.link_data?.picture) {
            imageUrl = creative.object_story_spec.link_data.picture
          } else if (creative?.object_story_spec?.photo_data?.picture) {
            imageUrl = creative.object_story_spec.photo_data.picture
          } else if (creative?.asset_feed_spec?.images?.[0]?.url) {
            imageUrl = creative.asset_feed_spec.images[0].url
          }
          // fbcdn.net thumbnail_url은 세션/IP 묶임 → 서버에서 403 → 사용 안 함

          // imageUrl이 없으면 image_hash로 나중에 URL 조회 시도
          if (!imageUrl) {
            imageHash =
              creative?.image_hash ??
              creative?.asset_feed_spec?.images?.[0]?.hash ??
              null
            console.log(`[meta:creative] adId=${adId} imageUrl=null → imageHash=${imageHash}`)
          }

          creativeInfoMap.set(adId, {
            imageUrl,
            imageHash,
            videoId: creative?.video_id ?? null,
            isFbAdsImage,
          })
        } catch {
          creativeInfoMap.set(adId, { imageUrl: null, imageHash: null, videoId: null, isFbAdsImage: false })
        }
      }
    } catch {
      // 배치 실패 시 해당 청크 null 처리
      chunk.forEach((row) =>
        creativeInfoMap.set(row.ad_id, { imageUrl: null, imageHash: null, videoId: null, isFbAdsImage: false }),
      )
    }
  }

  // Step 2.5: imageUrl이 없고 imageHash가 있는 소재 → 해시로 이미지 URL 일괄 조회
  const hashToAdIds = new Map<string, string[]>()
  for (const [adId, info] of creativeInfoMap.entries()) {
    if (!info.imageUrl && info.imageHash) {
      const ids = hashToAdIds.get(info.imageHash) ?? []
      ids.push(adId)
      hashToAdIds.set(info.imageHash, ids)
    }
  }

  if (hashToAdIds.size > 0) {
    console.log(`[meta:adimages] image_hash로 URL 조회 시도: ${hashToAdIds.size}개 해시`)
    try {
      const hashes = Array.from(hashToAdIds.keys())
      const hashParams = new URLSearchParams({
        hashes: JSON.stringify(hashes),
        fields: 'hash,url',
        access_token: accessToken,
      })
      const hashRes = await fetch(`${META_GRAPH_BASE}/act_${accountId}/adimages?${hashParams}`)
      console.log(`[meta:adimages] 응답 status=${hashRes.status}`)
      if (hashRes.ok) {
        const hashJson = await hashRes.json()
        console.log(`[meta:adimages] 응답 data=`, JSON.stringify(hashJson.data ?? []))
        for (const item of hashJson.data ?? []) {
          const adIds = hashToAdIds.get(item.hash) ?? []
          for (const adId of adIds) {
            const existing = creativeInfoMap.get(adId)
            if (existing && item.url) {
              creativeInfoMap.set(adId, { ...existing, imageUrl: item.url })
            }
          }
        }
      } else {
        const errBody = await hashRes.text()
        console.error(`[meta:adimages] 실패 body=${errBody}`)
      }
    } catch (err) {
      console.error('[meta:adimages] 예외:', err)
    }
  }

  // Step 3: 인사이트 + 썸네일 병합
  return adRows.map((row: any): MetaCreativeData => {
    const spend = parseFloat(row.spend ?? '0')
    const clicks = parseFloat(row.clicks ?? '0')
    const purchases = findAction(
      row.actions,
      PURCHASE_CANDIDATES,
      row.catalog_segment_actions,
    )
    const revenue = findAction(
      row.action_values,
      PURCHASE_CANDIDATES,
      row.catalog_segment_value,
    )
    const add_to_cart = findAction(
      row.actions,
      ADD_TO_CART_CANDIDATES,
      row.catalog_segment_actions,
    )
    const add_to_cart_value = findAction(
      row.action_values,
      ADD_TO_CART_CANDIDATES,
      row.catalog_segment_value,
    )

    return {
      ad_id: row.ad_id,
      ad_name: row.ad_name,
      campaign_name: row.campaign_name,
      adset_name: row.adset_name,
      thumbnail_url: creativeInfoMap.get(row.ad_id)?.imageUrl ?? null,
      is_fb_ads_image: creativeInfoMap.get(row.ad_id)?.isFbAdsImage ?? false,
      spend: spend || null,
      revenue,
      roas: revenue != null && spend > 0 ? (revenue / spend) * 100 : null,
      purchases: purchases != null ? Math.round(purchases) : null,
      add_to_cart: add_to_cart != null ? Math.round(add_to_cart) : null,
      add_to_cart_value,
      cpc: clicks > 0 ? spend / clicks : null,
      clicks: clicks || null,
    }
  })
}
