// GMV Max 전용 API 호출 함수
// 일반 /report/integrated/get/ 과 다른 전용 엔드포인트 사용
// - Store 목록: GET /open_api/v1.3/gmv_max/store/list/
// - 리포트:     GET /open_api/v1.3/gmv_max/report/get/

import type { GmvMaxCampaignRow, GmvMaxDailyRow, GmvMaxItemRow } from '@/types/database'
import { floatOrNull, roundOrNull } from './utils'

const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3'

async function gmvMaxGet(
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
  if (!res.ok) throw new Error(`TikTok GMV Max API ${path} 오류: ${res.status}`)
  const json = (await res.json()) as { code: number; message: string; data: unknown }
  if (json.code !== 0) throw new Error(`TikTok GMV Max API ${path} 실패: ${json.message}`)
  return json.data
}

// ── Store 목록 조회 ─────────────────────────────────────────────────────────
// 첫 번째 store_id를 반환. GMV Max 캠페인이 없는 계정이면 null 반환.

export async function fetchGmvMaxStoreId(
  advertiserId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const url = new URL(`${TIKTOK_API_BASE}/gmv_max/store/list/`)
    url.searchParams.set('advertiser_id', advertiserId)

    const res = await fetch(url.toString(), {
      headers: { 'Access-Token': accessToken },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = (await res.json()) as { code: number; message: string; data: unknown }

    if (json.code !== 0) return null

    // 응답 data 필드에서 가능한 모든 키 시도
    const data = json.data as Record<string, unknown> | null
    if (!data) return null

    // 가능한 배열 키: stores, list, store_list, data 자체가 배열인 경우
    const possibleKeys = ['stores', 'list', 'store_list']
    let stores: Array<Record<string, unknown>> = []

    if (Array.isArray(data)) {
      stores = data as Array<Record<string, unknown>>
    } else {
      for (const key of possibleKeys) {
        if (Array.isArray(data[key])) {
          stores = data[key] as Array<Record<string, unknown>>
          break
        }
      }
    }

    if (stores.length === 0) return null

    // store_id 또는 id 키 시도
    const first = stores[0]
    const storeId = (first.store_id ?? first.id ?? null) as string | null
    return storeId
  } catch {
    // GMV Max 미사용 계정이거나 권한 없는 경우 — null 반환
    return null
  }
}

// ── GMV Max 일별 리포트 조회 ────────────────────────────────────────────────
// dimensions: campaign_id + stat_time_day 로 날짜 × 캠페인 행 반환

export async function fetchGmvMaxDailyReport(params: {
  advertiser_id: string
  access_token: string
  store_ids: string[]
  start_date: string
  end_date: string
}): Promise<GmvMaxDailyRow[]> {
  const { advertiser_id, access_token, store_ids, start_date, end_date } = params

  const data = (await gmvMaxGet('/gmv_max/report/get/', access_token, {
    advertiser_id,
    store_ids: JSON.stringify(store_ids),
    dimensions: JSON.stringify(['campaign_id', 'stat_time_day']),
    metrics: JSON.stringify(['cost', 'gross_revenue', 'roi', 'orders', 'cost_per_order']),
    start_date,
    end_date,
    page: '1',
    page_size: '1000',
  })) as {
    list?: Array<{
      dimensions?: Record<string, string>
      metrics?: Record<string, string>
    }>
  }

  return (data.list ?? []).map((item) => {
    const d = item.dimensions ?? {}
    const m = item.metrics ?? {}
    const cost = floatOrNull(m.cost)
    const gross_revenue = floatOrNull(m.gross_revenue)
    const roi = floatOrNull(m.roi)

    return {
      date: d.stat_time_day ?? '',
      campaign_id: d.campaign_id ?? null,
      campaign_name: null, // 일별 리포트에서는 캠페인명 미포함 (캠페인 리포트에서 조회)
      cost,
      gross_revenue,
      roi,
      orders: roundOrNull(m.orders),
      cost_per_order: floatOrNull(m.cost_per_order),
    }
  })
}

// ── GMV Max 캠페인별 리포트 조회 ────────────────────────────────────────────
// 기간 합산된 캠페인별 성과 (리포트 스냅샷용)

export async function fetchGmvMaxCampaignReport(params: {
  advertiser_id: string
  access_token: string
  store_ids: string[]
  start_date: string
  end_date: string
}): Promise<GmvMaxCampaignRow[]> {
  const { advertiser_id, access_token, store_ids, start_date, end_date } = params

  const data = (await gmvMaxGet('/gmv_max/report/get/', access_token, {
    advertiser_id,
    store_ids: JSON.stringify(store_ids),
    dimensions: JSON.stringify(['campaign_id']),
    metrics: JSON.stringify(['cost', 'gross_revenue', 'roi', 'orders', 'cost_per_order']),
    start_date,
    end_date,
    page: '1',
    page_size: '1000',
  })) as {
    list?: Array<{
      dimensions?: Record<string, string>
      metrics?: Record<string, string>
    }>
  }

  const rows = data.list ?? []
  if (rows.length === 0) return []

  // /campaign/get/ 으로 캠페인명 조회
  const campaignIds = rows.map((item) => item.dimensions?.campaign_id).filter((id): id is string => !!id)
  const nameMap = new Map<string, string>()
  const campaignIdSet = new Set(campaignIds)

  // GMV Max 전용 캠페인 조회 엔드포인트
  try {
    const url = new URL(`${TIKTOK_API_BASE}/gmv_max/campaign/get/`)
    url.searchParams.set('advertiser_id', advertiser_id)
    url.searchParams.set('filtering', JSON.stringify({
      gmv_max_promotion_types: ['LIVE_GMV_MAX', 'PRODUCT_GMV_MAX'],
    }))
    url.searchParams.set('page', '1')
    url.searchParams.set('page_size', '100')

    const res = await fetch(url.toString(), { headers: { 'Access-Token': access_token } })
    const raw = (await res.json()) as { code: number; message: string; data?: { list?: Array<{ campaign_id: string; campaign_name: string }> } }

    if (raw.code === 0) {
      for (const c of raw.data?.list ?? []) {
        if (campaignIdSet.has(c.campaign_id)) nameMap.set(c.campaign_id, c.campaign_name)
      }
    }
  } catch {
    // 캠페인명 조회 실패 시 ID로 표시
  }

  return rows.map((item) => {
    const d = item.dimensions ?? {}
    const m = item.metrics ?? {}
    const campaignId = d.campaign_id ?? ''
    return {
      campaign_id: campaignId,
      campaign_name: nameMap.get(campaignId) ?? null,
      cost: floatOrNull(m.cost),
      gross_revenue: floatOrNull(m.gross_revenue),
      roi: floatOrNull(m.roi),
      orders: roundOrNull(m.orders),
      cost_per_order: floatOrNull(m.cost_per_order),
    }
  })
}

// ── GMV Max 소재(item) 리포트 조회 ──────────────────────────────────────────
// 3단계 드릴다운: campaign_id → item_group_id → item_id
// item_id는 TikTok 영상 ID (item_id="-1"은 오가닉 전환으로 제외)

async function fetchOembedData(itemId: string): Promise<{ thumbnail_url: string | null; title: string | null }> {
  try {
    const url = `https://www.tiktok.com/oembed?url=https://www.tiktok.com/video/${itemId}`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return { thumbnail_url: null, title: null }
    const json = (await res.json()) as { thumbnail_url?: string; title?: string }
    return { thumbnail_url: json.thumbnail_url ?? null, title: json.title ?? null }
  } catch {
    return { thumbnail_url: null, title: null }
  }
}

export async function fetchGmvMaxItems(params: {
  advertiser_id: string
  access_token: string
  store_ids: string[]
  start_date: string
  end_date: string
  campaignIds: string[]
}): Promise<GmvMaxItemRow[]> {
  const { advertiser_id, access_token, store_ids, start_date, end_date, campaignIds } = params

  if (campaignIds.length === 0) return []

  // 2단계: item_group_id 획득
  const itemGroupData = (await gmvMaxGet('/gmv_max/report/get/', access_token, {
    advertiser_id,
    store_ids: JSON.stringify(store_ids),
    dimensions: JSON.stringify(['item_group_id']),
    metrics: JSON.stringify(['cost', 'gross_revenue', 'roi', 'orders', 'cost_per_order']),
    filtering: JSON.stringify({ campaign_ids: campaignIds }),
    start_date,
    end_date,
    page: '1',
    page_size: '1000',
  })) as {
    list?: Array<{ dimensions?: Record<string, string>; metrics?: Record<string, string> }>
  }

  const itemGroupIds = (itemGroupData.list ?? [])
    .map((item) => item.dimensions?.item_group_id)
    .filter((id): id is string => !!id && id !== '')

  if (itemGroupIds.length === 0) return []

  // 3단계: item_id별 성과 조회
  const itemData = (await gmvMaxGet('/gmv_max/report/get/', access_token, {
    advertiser_id,
    store_ids: JSON.stringify(store_ids),
    dimensions: JSON.stringify(['item_id']),
    metrics: JSON.stringify(['cost', 'gross_revenue', 'roi', 'orders', 'cost_per_order']),
    filtering: JSON.stringify({ campaign_ids: campaignIds, item_group_ids: itemGroupIds }),
    start_date,
    end_date,
    page: '1',
    page_size: '1000',
  })) as {
    list?: Array<{ dimensions?: Record<string, string>; metrics?: Record<string, string> }>
  }

  // item_id="-1" 필터링 (오가닉 전환)
  const validItems = (itemData.list ?? []).filter(
    (item) => item.dimensions?.item_id && item.dimensions.item_id !== '-1',
  )

  if (validItems.length === 0) return []

  // 4단계: oEmbed로 썸네일 + 타이틀 병렬 획득 (20개씩 청크)
  const itemIds = validItems.map((item) => item.dimensions!.item_id)
  const oembedMap = new Map<string, { thumbnail_url: string | null; title: string | null }>()
  const concurrency = 20

  for (let i = 0; i < itemIds.length; i += concurrency) {
    const chunk = itemIds.slice(i, i + concurrency)
    const results = await Promise.allSettled(
      chunk.map(async (itemId) => {
        const data = await fetchOembedData(itemId)
        return { itemId, ...data }
      }),
    )
    for (const result of results) {
      if (result.status === 'fulfilled') {
        oembedMap.set(result.value.itemId, {
          thumbnail_url: result.value.thumbnail_url,
          title: result.value.title,
        })
      }
    }
  }

  return validItems.map((item) => {
    const d = item.dimensions ?? {}
    const m = item.metrics ?? {}
    const oembed = oembedMap.get(d.item_id ?? '')
    return {
      item_id: d.item_id ?? '',
      item_group_id: d.item_group_id ?? '',
      campaign_id: d.campaign_id ?? '',
      title: oembed?.title ?? null,
      cost: floatOrNull(m.cost),
      gross_revenue: floatOrNull(m.gross_revenue),
      roi: floatOrNull(m.roi),
      orders: roundOrNull(m.orders),
      cost_per_order: floatOrNull(m.cost_per_order),
      thumbnail_url: oembed?.thumbnail_url ?? null,
    }
  })
}
