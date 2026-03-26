import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { format, endOfMonth, startOfMonth, subMonths } from 'date-fns'
import {
  aggregateGmvMaxMonthly,
  aggregateMetaMonthly,
  aggregateShopeeMonthly,
  aggregateTiktokMonthly,
  divOrNull,
  sumRows,
  type ShopeeInappRow,
  type TiktokDailyRow,
} from '@/lib/reports/aggregators'
import { groupGmvMaxByWeek, groupMetaByWeek, groupShopeeByWeek, groupTiktokByWeek } from '@/lib/reports/weeklyGrouper'
import {
  fetchMetaCampaigns,
  fetchMetaCreatives,
  mergeMetaCampaignPrev,
} from '@/lib/reports/metaApi'
import { fetchTiktokCampaigns, fetchTiktokAds } from '@/lib/reports/tiktokApi'
import { fetchGmvMaxCampaignReport, fetchGmvMaxItems } from '@/lib/tiktok/gmvMax'
import type { ReportSnapshot, ShopeeAdsBreakdownData } from '@/types/database'

export const maxDuration = 60

// Facebook CDN 이미지를 Supabase Storage에 업로드하고 퍼블릭 URL 반환
// (Storage URL은 만료 없음 — fbcdn.net URL은 24시간 내 만료됨)
async function uploadThumb(
  adId: string,
  url: string,
  accessToken?: string,
): Promise<string | null> {
  const tryFetch = async (targetUrl: string) => {
    const res = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null
    return res
  }

  // facebook.com/ads/image/ URL은 access_token 파라미터 필요
  let targetUrl = url
  if (url.includes('facebook.com/ads/image/') && accessToken) {
    const u = new URL(url)
    u.searchParams.set('access_token', accessToken)
    targetUrl = u.toString()
  }

  try {
    const res = await tryFetch(targetUrl)
    if (!res) return null

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const path = `meta/${adId}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from('report-thumbnails')
      .upload(path, buffer, { contentType, upsert: true })
    if (error) return null

    const { data } = supabaseAdmin.storage.from('report-thumbnails').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}

// TikTok CDN 이미지를 Supabase Storage에 영구 저장 (CDN URL 만료 방지)
async function uploadTiktokThumb(adId: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const path = `tiktok/${adId}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from('report-thumbnails')
      .upload(path, buffer, { contentType, upsert: true })
    if (error) return null

    const { data } = supabaseAdmin.storage.from('report-thumbnails').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  // 인증 + admin 체크
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  // report 조회 (supabaseAdmin → RLS 우회)
  const { data: report, error: reportError } = await supabaseAdmin
    .from('reports')
    .select('id, platform, internal_account_id, year, month')
    .eq('id', id)
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { platform, internal_account_id, year, month } = report as {
    platform: 'meta' | 'shopee_inapp' | 'tiktok'
    internal_account_id: string | null
    year: number
    month: number
  }

  if (!internal_account_id) {
    return NextResponse.json(
      { error: '리포트에 연결된 계정이 없습니다.' },
      { status: 400 },
    )
  }

  // 날짜 범위 계산
  const thisMonthBase = new Date(year, month - 1, 1)
  const thisMonthStart = format(thisMonthBase, 'yyyy-MM-dd')
  const thisMonthEnd = format(endOfMonth(thisMonthBase), 'yyyy-MM-dd')
  const prevMonthBase = subMonths(thisMonthBase, 1)
  const prevMonthStart = format(startOfMonth(prevMonthBase), 'yyyy-MM-dd')
  const prevMonthEnd = format(endOfMonth(prevMonthBase), 'yyyy-MM-dd')

  let snapshot: ReportSnapshot

  try {
    if (platform === 'meta') {
      snapshot = await buildMetaSnapshot({
        internal_account_id,
        year,
        month,
        thisMonthStart,
        thisMonthEnd,
        prevMonthStart,
        prevMonthEnd,
      })
    } else if (platform === 'tiktok') {
      snapshot = await buildTiktokSnapshot({
        internal_account_id,
        year,
        month,
        thisMonthStart,
        thisMonthEnd,
        prevMonthStart,
        prevMonthEnd,
      })
    } else {
      snapshot = await buildShopeeSnapshot({
        internal_account_id,
        year,
        month,
        thisMonthStart,
        thisMonthEnd,
        prevMonthStart,
        prevMonthEnd,
      })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('reports')
    .update({ snapshot, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ report: updated })
}

// ── Meta 스냅샷 빌더 ────────────────────────────────────────────────────────

async function buildMetaSnapshot(args: {
  internal_account_id: string
  year: number
  month: number
  thisMonthStart: string
  thisMonthEnd: string
  prevMonthStart: string
  prevMonthEnd: string
}): Promise<ReportSnapshot> {
  const {
    internal_account_id,
    year,
    month,
    thisMonthStart,
    thisMonthEnd,
    prevMonthStart,
    prevMonthEnd,
  } = args

  // meta_accounts에서 실제 account_id(광고계정 ID) 조회
  const { data: metaAccount } = await supabaseAdmin
    .from('meta_accounts')
    .select('account_id')
    .eq('id', internal_account_id)
    .single()

  if (!metaAccount) throw new Error('Meta 계정을 찾을 수 없습니다.')

  // meta_daily_stats 이번달/전월 병렬 조회
  const [{ data: curStats }, { data: prevStats }] = await Promise.all([
    supabaseAdmin
      .from('meta_daily_stats')
      .select(
        'date, spend, revenue, impressions, reach, clicks, purchases, add_to_cart, add_to_cart_value',
      )
      .eq('meta_account_id', internal_account_id)
      .gte('date', thisMonthStart)
      .lte('date', thisMonthEnd),
    supabaseAdmin
      .from('meta_daily_stats')
      .select(
        'date, spend, revenue, impressions, reach, clicks, purchases, add_to_cart, add_to_cart_value',
      )
      .eq('meta_account_id', internal_account_id)
      .gte('date', prevMonthStart)
      .lte('date', prevMonthEnd),
  ])

  const curRows = curStats ?? []
  const prevRows = prevStats ?? []

  const monthly = aggregateMetaMonthly(curRows, prevRows)
  const weekly = groupMetaByWeek(curRows, year, month)

  // Meta API 토큰 조회
  const { data: settings } = await supabaseAdmin
    .from('global_settings')
    .select('access_token')
    .eq('platform', 'meta')
    .single()

  const accessToken = settings?.access_token

  let campaigns: ReturnType<typeof mergeMetaCampaignPrev> = []
  let creatives: Awaited<ReturnType<typeof fetchMetaCreatives>> = []

  if (accessToken) {
    try {
      const [curCampaigns, prevCampaigns] = await Promise.all([
        fetchMetaCampaigns(metaAccount.account_id, accessToken, thisMonthStart, thisMonthEnd),
        fetchMetaCampaigns(metaAccount.account_id, accessToken, prevMonthStart, prevMonthEnd),
      ])
      campaigns = mergeMetaCampaignPrev(curCampaigns, prevCampaigns)
    } catch (err) {
      console.error('[snapshot] Meta 캠페인 fetch 실패 (부분 성공):', err)
      campaigns = []
    }

    try {
      const raw = await fetchMetaCreatives(
        metaAccount.account_id,
        accessToken,
        thisMonthStart,
        thisMonthEnd,
      )
      creatives = await Promise.all(
        raw.map(async (c) => {
          if (!c.thumbnail_url) return c
          const stored = await uploadThumb(
            c.ad_id,
            c.thumbnail_url,
            c.is_fb_ads_image ? accessToken : undefined,
          )
          return { ...c, thumbnail_url: stored ?? c.thumbnail_url }
        }),
      )
    } catch (err) {
      console.error('[snapshot] Meta 소재 fetch 실패 (부분 성공):', err)
      creatives = []
    }
  }

  return {
    platform: 'meta',
    data: { monthly, weekly, campaigns, creatives },
  }
}

// ── Shopee Inapp 스냅샷 빌더 ────────────────────────────────────────────────

async function buildShopeeSnapshot(args: {
  internal_account_id: string
  year: number
  month: number
  thisMonthStart: string
  thisMonthEnd: string
  prevMonthStart: string
  prevMonthEnd: string
}): Promise<ReportSnapshot> {
  const {
    internal_account_id,
    year,
    month,
    thisMonthStart,
    thisMonthEnd,
    prevMonthStart,
    prevMonthEnd,
  } = args

  const [{ data: curStats }, { data: prevStats }] = await Promise.all([
    supabaseAdmin
      .from('shopee_inapp_stats')
      .select('date, ads_type, expense_krw, gmv_krw, conversions, clicks, impressions')
      .eq('shopee_account_id', internal_account_id)
      .gte('date', thisMonthStart)
      .lte('date', thisMonthEnd),
    supabaseAdmin
      .from('shopee_inapp_stats')
      .select('date, ads_type, expense_krw, gmv_krw, conversions, clicks, impressions')
      .eq('shopee_account_id', internal_account_id)
      .gte('date', prevMonthStart)
      .lte('date', prevMonthEnd),
  ])

  const curRows: ShopeeInappRow[] = curStats ?? []
  const prevRows: ShopeeInappRow[] = prevStats ?? []

  const monthly = aggregateShopeeMonthly(curRows, prevRows)
  const weekly = groupShopeeByWeek(curRows, year, month)

  // ads_type별 브레이크다운
  const ADS_TYPES: Array<{ type: 'shop_ad' | 'product_ad'; label: string }> = [
    { type: 'shop_ad', label: 'Shop Ads' },
    { type: 'product_ad', label: 'Product Ads' },
  ]

  const calcBreakdown = (rows: ShopeeInappRow[]) => {
    const spend_krw = sumRows(rows.map((r) => r.expense_krw))
    const revenue_krw = sumRows(rows.map((r) => r.gmv_krw))
    const purchases = sumRows(rows.map((r) => r.conversions))
    const clicks = sumRows(rows.map((r) => r.clicks))
    const impressions = sumRows(rows.map((r) => r.impressions))
    return {
      spend_krw: spend_krw || null,
      revenue_krw: revenue_krw || null,
      roas: divOrNull(revenue_krw * 100, spend_krw),
      purchases: purchases || null,
      clicks: clicks || null,
      impressions: impressions || null,
      cpc_krw: divOrNull(spend_krw, clicks),
      ctr: divOrNull(clicks * 100, impressions),
      conversion_rate: divOrNull(purchases * 100, clicks),
    }
  }

  const ads_breakdown: ShopeeAdsBreakdownData[] = ADS_TYPES.map(({ type, label }) => {
    const cur = calcBreakdown(curRows.filter((r) => r.ads_type === type))
    const prev = calcBreakdown(prevRows.filter((r) => r.ads_type === type))
    return {
      ads_type: type,
      label,
      ...cur,
      prev_spend_krw: prev.spend_krw,
      prev_revenue_krw: prev.revenue_krw,
      prev_roas: prev.roas,
      prev_purchases: prev.purchases,
      prev_clicks: prev.clicks,
      prev_impressions: prev.impressions,
      prev_cpc_krw: prev.cpc_krw,
      prev_ctr: prev.ctr,
      prev_conversion_rate: prev.conversion_rate,
    }
  })

  return {
    platform: 'shopee_inapp',
    data: { monthly, weekly, ads_breakdown },
  }
}

// ── TikTok 스냅샷 빌더 ─────────────────────────────────────────────────────

async function buildTiktokSnapshot(args: {
  internal_account_id: string
  year: number
  month: number
  thisMonthStart: string
  thisMonthEnd: string
  prevMonthStart: string
  prevMonthEnd: string
}): Promise<ReportSnapshot> {
  const {
    internal_account_id,
    year,
    month,
    thisMonthStart,
    thisMonthEnd,
    prevMonthStart,
    prevMonthEnd,
  } = args

  // tiktok_accounts에서 advertiser_id, store_id 조회
  const { data: tiktokAccount } = await supabaseAdmin
    .from('tiktok_accounts')
    .select('advertiser_id, store_id')
    .eq('id', internal_account_id)
    .single()

  if (!tiktokAccount) throw new Error('TikTok 계정을 찾을 수 없습니다.')

  // tiktok_daily_stats + gmv_max_daily_stats 이번달/전월 병렬 조회
  const [
    { data: curStats },
    { data: prevStats },
    { data: gmvCurStats },
    { data: gmvPrevStats },
  ] = await Promise.all([
    supabaseAdmin
      .from('tiktok_daily_stats')
      .select('date, spend, revenue, impressions, reach, clicks, purchases, video_views, add_to_cart, add_to_cart_value')
      .eq('tiktok_account_id', internal_account_id)
      .gte('date', thisMonthStart)
      .lte('date', thisMonthEnd),
    supabaseAdmin
      .from('tiktok_daily_stats')
      .select('date, spend, revenue, impressions, reach, clicks, purchases, video_views, add_to_cart, add_to_cart_value')
      .eq('tiktok_account_id', internal_account_id)
      .gte('date', prevMonthStart)
      .lte('date', prevMonthEnd),
    supabaseAdmin
      .from('gmv_max_daily_stats')
      .select('date, cost, gross_revenue, orders')
      .eq('tiktok_account_id', internal_account_id)
      .gte('date', thisMonthStart)
      .lte('date', thisMonthEnd),
    supabaseAdmin
      .from('gmv_max_daily_stats')
      .select('date, cost, gross_revenue, orders')
      .eq('tiktok_account_id', internal_account_id)
      .gte('date', prevMonthStart)
      .lte('date', prevMonthEnd),
  ])

  const curRows: TiktokDailyRow[] = curStats ?? []
  const prevRows: TiktokDailyRow[] = prevStats ?? []
  const gmvCurRows = gmvCurStats ?? []
  const gmvPrevRows = gmvPrevStats ?? []

  const monthly = aggregateTiktokMonthly(curRows, prevRows)
  const weekly = groupTiktokByWeek(curRows, year, month)
  const gmvMaxMonthly = gmvCurRows.length > 0
    ? aggregateGmvMaxMonthly(gmvCurRows, gmvPrevRows)
    : undefined
  const gmvMaxWeekly = gmvCurRows.length > 0
    ? groupGmvMaxByWeek(gmvCurRows, year, month)
    : undefined

  // TikTok API 토큰 조회
  const { data: settings } = await supabaseAdmin
    .from('global_settings')
    .select('access_token')
    .eq('platform', 'tiktok')
    .single()

  const accessToken = settings?.access_token

  let campaigns: Awaited<ReturnType<typeof fetchTiktokCampaigns>> = []
  let ads: Awaited<ReturnType<typeof fetchTiktokAds>> = []
  let gmvMaxCampaigns: Awaited<ReturnType<typeof fetchGmvMaxCampaignReport>> = []
  let gmvMaxItems: Awaited<ReturnType<typeof fetchGmvMaxItems>> = []

  if (accessToken) {
    const gmvParams = tiktokAccount.store_id
      ? {
          advertiser_id: tiktokAccount.advertiser_id,
          access_token: accessToken,
          store_ids: [tiktokAccount.store_id],
          start_date: thisMonthStart,
          end_date: thisMonthEnd,
        }
      : null

    // 그룹 A: 서로 독립적인 호출 병렬 실행
    const [fetchedCampaigns, fetchedGmvCampaigns, fetchedAds] = await Promise.all([
      fetchTiktokCampaigns(
        tiktokAccount.advertiser_id,
        accessToken,
        thisMonthStart,
        thisMonthEnd,
      ).catch((err) => {
        console.error('[snapshot] TikTok 캠페인 fetch 실패 (부분 성공):', err)
        return [] as typeof campaigns
      }),
      gmvParams
        ? fetchGmvMaxCampaignReport(gmvParams).catch((err) => {
            console.error('[snapshot] GMV Max 캠페인 fetch 실패 (부분 성공):', err)
            return [] as typeof gmvMaxCampaigns
          })
        : Promise.resolve([] as typeof gmvMaxCampaigns),
      fetchTiktokAds(
        tiktokAccount.advertiser_id,
        accessToken,
        thisMonthStart,
        thisMonthEnd,
      ).catch((err) => {
        console.error('[snapshot] TikTok 소재 fetch 실패 (부분 성공):', err)
        return [] as typeof ads
      }),
    ])

    campaigns = fetchedCampaigns
    gmvMaxCampaigns = fetchedGmvCampaigns
    ads = fetchedAds

    // GMV Max 캠페인 → 일반 campaigns에 병합 (impressions/clicks 미지원 → null)
    if (gmvMaxCampaigns.length > 0) {
      const gmvMaxRows = gmvMaxCampaigns.map((c) => ({
        campaign_id: c.campaign_id,
        campaign_name: c.campaign_name ?? `GMV Max ${c.campaign_id}`,
        objective_type: 'GMV_MAX',
        spend: c.cost,
        impressions: null,
        reach: null,
        clicks: null,
        ctr: null,
        cpc: null,
        cpm: null,
        purchases: c.orders,
        revenue: c.gross_revenue,
        roas: c.roi,
        video_views: null,
        isGmvMax: true,
      }))
      campaigns = [...campaigns, ...gmvMaxRows]
    }

    // 그룹 B: gmvMaxCampaigns 결과(campaignIds)가 필요 → 그룹 A 이후 실행
    // 소재 fetch + 썸네일 업로드를 병렬 실행
    if (gmvParams && gmvMaxCampaigns.length > 0) {
      try {
        const rawItems = await fetchGmvMaxItems({
          ...gmvParams,
          campaignIds: gmvMaxCampaigns.map((c) => c.campaign_id),
        })
        gmvMaxItems = rawItems
      } catch (err) {
        console.error('[snapshot] GMV Max 소재 fetch 실패 (부분 성공):', err)
      }
    }

    // 썸네일 업로드: gmvMaxItems + ads 병렬 처리
    const [uploadedGmvItems, uploadedAds] = await Promise.all([
      Promise.all(
        gmvMaxItems.map(async (item) => {
          if (!item.thumbnail_url) return item
          const permanentUrl = await uploadTiktokThumb(item.item_id, item.thumbnail_url)
          return { ...item, thumbnail_url: permanentUrl ?? item.thumbnail_url }
        }),
      ),
      Promise.all(
        ads.map(async (ad) => {
          if (!ad.thumbnail_url) return ad
          const permanentUrl = await uploadTiktokThumb(ad.ad_id, ad.thumbnail_url)
          return { ...ad, thumbnail_url: permanentUrl ?? ad.thumbnail_url }
        }),
      ),
    ])

    gmvMaxItems = uploadedGmvItems
    ads = uploadedAds
  }

  const hasGmvMax = campaigns.some((c) => c.isGmvMax)

  return {
    platform: 'tiktok',
    data: {
      monthly,
      weekly,
      campaigns,
      ads,
      hasGmvMax,
      ...(gmvMaxMonthly !== undefined && { gmvMaxMonthly }),
      ...(gmvMaxWeekly !== undefined && { gmvMaxWeekly }),
      ...(gmvMaxCampaigns.length > 0 && { gmvMaxCampaigns }),
      ...(gmvMaxItems.length > 0 && { gmvMaxItems }),
    },
  }
}
