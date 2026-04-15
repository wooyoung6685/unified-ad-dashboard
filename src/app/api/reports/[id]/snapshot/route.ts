import { requireAdmin } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTokenForCurrentUser } from '@/lib/tokens'
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
  type ShopeeShoppingRow,
  type MetaSpendRow,
  type TiktokDailyRow,
  type Qoo10DailyOrganicRow,
  type Qoo10DailyAdsRow,
} from '@/lib/reports/aggregators'
import { groupGmvMaxByWeek, groupMetaByWeek, groupQoo10ByWeek, groupShopeeByWeek, groupTiktokByWeek } from '@/lib/reports/weeklyGrouper'
import { preprocessQoo10Name, translateJaToKo } from '@/lib/qoo10/translate'
import {
  fetchMetaCampaigns,
  fetchMetaAdsets,
  fetchMetaCreatives,
  mergeMetaCampaignPrev,
  mergeMetaAdsetPrev,
} from '@/lib/reports/metaApi'
import { fetchTiktokCampaigns, fetchTiktokAdgroups, fetchTiktokAds } from '@/lib/reports/tiktokApi'
import { fetchGmvMaxCampaignReport, fetchGmvMaxItems } from '@/lib/tiktok/gmvMax'
import type {
  AmazonDailyData,
  AmazonKeywordData,
  AmazonMonthlyData,
  AmazonProductData,
  AmazonWeeklyData,
  Qoo10DailyData,
  Qoo10MonthlyData,
  Qoo10ProductData,
  ReportSnapshot,
  ShopeeAdsBreakdownData,
} from '@/types/database'

import {
  runConcurrent,
  getExistingThumbs,
  uploadThumb,
  uploadTiktokThumb,
} from '@/lib/reports/thumbnails'

// Hobby 플랜 최대 60초 (Pro 플랜으로 업그레이드 시 300으로 늘릴 수 있음)
export const maxDuration = 60

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  // 인증 + admin 체크
  const { error: authError } = await requireAdmin()
  if (authError) return authError

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
    platform: 'meta' | 'shopee_inapp' | 'tiktok' | 'amazon' | 'qoo10'
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
    } else if (platform === 'amazon') {
      snapshot = await buildAmazonSnapshot({
        internal_account_id,
        year,
        month,
        thisMonthStart,
        thisMonthEnd,
        prevMonthStart,
        prevMonthEnd,
      })
    } else if (platform === 'qoo10') {
      snapshot = await buildQoo10Snapshot({
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

  // 현재 로그인한 어드민의 Meta 토큰 조회
  const accessToken = await getTokenForCurrentUser('meta')

  let campaigns: ReturnType<typeof mergeMetaCampaignPrev> = []
  let adsets: ReturnType<typeof mergeMetaAdsetPrev> = []
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
      const [curAdsets, prevAdsets] = await Promise.all([
        fetchMetaAdsets(metaAccount.account_id, accessToken, thisMonthStart, thisMonthEnd),
        fetchMetaAdsets(metaAccount.account_id, accessToken, prevMonthStart, prevMonthEnd),
      ])
      adsets = mergeMetaAdsetPrev(curAdsets, prevAdsets)
    } catch (err) {
      console.error('[snapshot] Meta 광고세트 fetch 실패 (부분 성공):', err)
      adsets = []
    }

    try {
      const [raw, existingMetaThumbs] = await Promise.all([
        fetchMetaCreatives(metaAccount.account_id, accessToken, thisMonthStart, thisMonthEnd),
        getExistingThumbs('meta'),
      ])
      creatives = await runConcurrent(raw, 10, async (c) => {
        if (!c.thumbnail_url) return c
        const stored = await uploadThumb(
          c.ad_id,
          c.thumbnail_url,
          c.is_fb_ads_image ? accessToken : undefined,
          existingMetaThumbs,
        )
        return { ...c, thumbnail_url: stored ?? c.thumbnail_url }
      })
    } catch (err) {
      console.error('[snapshot] Meta 소재 fetch 실패 (부분 성공):', err)
      creatives = []
    }
  }

  return {
    platform: 'meta',
    data: { monthly, weekly, campaigns, adsets, creatives },
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

  // 이 계정의 brand_id, country 조회
  const { data: shopeeAccount } = await supabaseAdmin
    .from('shopee_accounts')
    .select('brand_id, country')
    .eq('id', internal_account_id)
    .single()

  // 같은 brand+country의 shopping 계정 및 meta 계정 조회
  const [{ data: shoppingAccounts }, { data: metaAccounts }] = await Promise.all([
    shopeeAccount
      ? supabaseAdmin
          .from('shopee_accounts')
          .select('id')
          .eq('brand_id', shopeeAccount.brand_id)
          .eq('country', shopeeAccount.country)
          .eq('account_type', 'shopping')
      : Promise.resolve({ data: [] }),
    shopeeAccount
      ? supabaseAdmin
          .from('meta_accounts')
          .select('id')
          .eq('brand_id', shopeeAccount.brand_id)
          .eq('country', shopeeAccount.country)
      : Promise.resolve({ data: [] }),
  ])

  const shoppingAccountIds = (shoppingAccounts ?? []).map((a) => a.id)
  const metaAccountIds = (metaAccounts ?? []).map((a) => a.id)

  // 모든 데이터 병렬 조회
  const [
    { data: curInappStats },
    { data: prevInappStats },
    { data: curShoppingStats },
    { data: prevShoppingStats },
    { data: curMetaStats },
    { data: prevMetaStats },
  ] = await Promise.all([
    // inapp: 주간차트/breakdown + 월간 items_sold/expense_krw
    supabaseAdmin
      .from('shopee_inapp_stats')
      .select('date, ads_type, expense_krw, gmv_krw, conversions, clicks, impressions, items_sold')
      .eq('shopee_account_id', internal_account_id)
      .gte('date', thisMonthStart)
      .lte('date', thisMonthEnd),
    supabaseAdmin
      .from('shopee_inapp_stats')
      .select('date, ads_type, expense_krw, gmv_krw, conversions, clicks, impressions, items_sold')
      .eq('shopee_account_id', internal_account_id)
      .gte('date', prevMonthStart)
      .lte('date', prevMonthEnd),
    // shopping: 월간 쇼핑 지표
    shoppingAccountIds.length > 0
      ? supabaseAdmin
          .from('shopee_shopping_stats')
          .select('date, sales_krw, orders, product_clicks, visitors, buyers, new_buyers, existing_buyers')
          .in('shopee_account_id', shoppingAccountIds)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd)
      : Promise.resolve({ data: [] }),
    shoppingAccountIds.length > 0
      ? supabaseAdmin
          .from('shopee_shopping_stats')
          .select('date, sales_krw, orders, product_clicks, visitors, buyers, new_buyers, existing_buyers')
          .in('shopee_account_id', shoppingAccountIds)
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd)
      : Promise.resolve({ data: [] }),
    // meta spend: 같은 brand+country의 메타 광고비
    metaAccountIds.length > 0
      ? supabaseAdmin
          .from('meta_daily_stats')
          .select('date, spend')
          .in('meta_account_id', metaAccountIds)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd)
      : Promise.resolve({ data: [] }),
    metaAccountIds.length > 0
      ? supabaseAdmin
          .from('meta_daily_stats')
          .select('date, spend')
          .in('meta_account_id', metaAccountIds)
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd)
      : Promise.resolve({ data: [] }),
  ])

  const curRows: ShopeeInappRow[] = curInappStats ?? []
  const prevRows: ShopeeInappRow[] = prevInappStats ?? []
  const curShopping: ShopeeShoppingRow[] = (curShoppingStats ?? []) as ShopeeShoppingRow[]
  const prevShopping: ShopeeShoppingRow[] = (prevShoppingStats ?? []) as ShopeeShoppingRow[]
  const curMeta: MetaSpendRow[] = (curMetaStats ?? []) as MetaSpendRow[]
  const prevMeta: MetaSpendRow[] = (prevMetaStats ?? []) as MetaSpendRow[]

  const monthly = aggregateShopeeMonthly(curShopping, prevShopping, curRows, prevRows, curMeta, prevMeta)
  const weekly = groupShopeeByWeek(curRows, year, month)

  // ads_type별 브레이크다운 (기존 inapp 데이터 기반 유지)
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
      .select('date, spend, revenue, impressions, reach, clicks, purchases, video_views, views_2s, views_6s, views_25pct, views_100pct, add_to_cart, add_to_cart_value')
      .eq('tiktok_account_id', internal_account_id)
      .gte('date', thisMonthStart)
      .lte('date', thisMonthEnd),
    supabaseAdmin
      .from('tiktok_daily_stats')
      .select('date, spend, revenue, impressions, reach, clicks, purchases, video_views, views_2s, views_6s, views_25pct, views_100pct, add_to_cart, add_to_cart_value')
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

  // 현재 로그인한 어드민의 TikTok 토큰 조회
  const accessToken = await getTokenForCurrentUser('tiktok')

  let campaigns: Awaited<ReturnType<typeof fetchTiktokCampaigns>> = []
  let adgroups: Awaited<ReturnType<typeof fetchTiktokAdgroups>> = []
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
    const [fetchedCampaigns, fetchedAdgroups, fetchedGmvCampaigns, fetchedAds] = await Promise.all([
      fetchTiktokCampaigns(
        tiktokAccount.advertiser_id,
        accessToken,
        thisMonthStart,
        thisMonthEnd,
      ).catch((err) => {
        console.error('[snapshot] TikTok 캠페인 fetch 실패 (부분 성공):', err)
        return [] as typeof campaigns
      }),
      fetchTiktokAdgroups(
        tiktokAccount.advertiser_id,
        accessToken,
        thisMonthStart,
        thisMonthEnd,
      ).catch((err) => {
        console.error('[snapshot] TikTok 광고그룹 fetch 실패 (부분 성공):', err)
        return [] as typeof adgroups
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
    adgroups = fetchedAdgroups
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
        conversions: null,
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

    // 기존 썸네일 목록 조회 후 업로드 (이미 존재하는 파일 스킵)
    const existingTiktokThumbs = await getExistingThumbs('tiktok')
    const [uploadedGmvItems, uploadedAds] = await Promise.all([
      runConcurrent(gmvMaxItems, 10, async (item) => {
        if (!item.thumbnail_url) return item
        const permanentUrl = await uploadTiktokThumb(item.item_id, item.thumbnail_url, existingTiktokThumbs)
        return { ...item, thumbnail_url: permanentUrl ?? item.thumbnail_url }
      }),
      runConcurrent(ads, 10, async (ad) => {
        if (!ad.thumbnail_url) return ad
        const permanentUrl = await uploadTiktokThumb(ad.ad_id, ad.thumbnail_url, existingTiktokThumbs)
        return { ...ad, thumbnail_url: permanentUrl ?? ad.thumbnail_url }
      }),
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
      adgroups,
      ads,
      hasGmvMax,
      ...(gmvMaxMonthly !== undefined && { gmvMaxMonthly }),
      ...(gmvMaxWeekly !== undefined && { gmvMaxWeekly }),
      ...(gmvMaxCampaigns.length > 0 && { gmvMaxCampaigns }),
      ...(gmvMaxItems.length > 0 && { gmvMaxItems }),
    },
  }
}

// ── Amazon 스냅샷 빌더 ─────────────────────────────────────────────────────

async function buildAmazonSnapshot(args: {
  internal_account_id: string
  year: number
  month: number
  thisMonthStart: string
  thisMonthEnd: string
  prevMonthStart: string
  prevMonthEnd: string
}): Promise<ReportSnapshot> {
  const { internal_account_id, year, month, thisMonthStart, thisMonthEnd, prevMonthStart, prevMonthEnd } = args

  // 1. 이 계정의 account_id, brand_id 조회
  const { data: amazonAccount } = await supabaseAdmin
    .from('amazon_accounts')
    .select('account_id, brand_id')
    .eq('id', internal_account_id)
    .single()

  if (!amazonAccount) throw new Error('Amazon 계정을 찾을 수 없습니다.')

  const { account_id: externalAccountId, brand_id: bId } = amazonAccount

  // 2. 같은 account_id의 organic/ads/asin 계정 조회
  const { data: allAccts } = await supabaseAdmin
    .from('amazon_accounts')
    .select('id, account_type')
    .eq('account_id', externalAccountId)
    .eq('brand_id', bId)

  const organicIds = (allAccts ?? []).filter(a => a.account_type === 'organic').map(a => a.id)
  const adsIds = (allAccts ?? []).filter(a => a.account_type === 'ads').map(a => a.id)
  const asinIds = (allAccts ?? []).filter(a => a.account_type === 'asin').map(a => a.id)

  // 3. 모든 데이터 병렬 조회 (당월 + 전월)
  const [
    { data: curOrganic },
    { data: prevOrganic },
    { data: curAds },
    { data: prevAds },
    { data: curAsin },
    { data: keywordRows },
  ] = await Promise.all([
    organicIds.length > 0
      ? supabaseAdmin
          .from('amazon_organic_stats')
          .select('date, ordered_product_sales, orders, sessions, page_views, buy_box_percentage, unit_session_percentage, currency')
          .in('amazon_account_id', organicIds)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd)
          .order('date', { ascending: true })
      : Promise.resolve({ data: [] }),
    organicIds.length > 0
      ? supabaseAdmin
          .from('amazon_organic_stats')
          .select('date, ordered_product_sales, orders, sessions, page_views')
          .in('amazon_account_id', organicIds)
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd)
      : Promise.resolve({ data: [] }),
    adsIds.length > 0
      ? supabaseAdmin
          .from('amazon_ads_stats')
          .select('date, cost, sales, impressions, clicks, purchases, purchases_new_to_brand, currency')
          .in('amazon_account_id', adsIds)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd)
          .order('date', { ascending: true })
      : Promise.resolve({ data: [] }),
    adsIds.length > 0
      ? supabaseAdmin
          .from('amazon_ads_stats')
          .select('date, cost, sales, impressions, clicks, purchases')
          .in('amazon_account_id', adsIds)
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd)
      : Promise.resolve({ data: [] }),
    asinIds.length > 0
      ? supabaseAdmin
          .from('amazon_asin_stats')
          .select('date, parent_asin, child_asin, title, ordered_product_sales, total_order_items, sessions, orders')
          .in('amazon_account_id', asinIds)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd)
      : Promise.resolve({ data: [] }),
    adsIds.length > 0
      ? supabaseAdmin
          .from('amazon_ads_keyword_stats')
          .select('keyword, impressions')
          .in('amazon_account_id', adsIds)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd)
      : Promise.resolve({ data: [] }),
  ])

  const organicRows = curOrganic ?? []
  const prevOrganicRows = prevOrganic ?? []
  const adsRows = curAds ?? []
  const prevAdsRows = prevAds ?? []
  const asinRows = curAsin ?? []

  // 4. monthly 계산
  const sumOrg = {
    sales: organicRows.reduce((s, r) => s + ((r.ordered_product_sales as number) ?? 0), 0),
    orders: organicRows.reduce((s, r) => s + ((r.orders as number) ?? 0), 0),
    sessions: organicRows.reduce((s, r) => s + ((r.sessions as number) ?? 0), 0),
  }
  const sumPrevOrg = {
    sales: prevOrganicRows.reduce((s, r) => s + ((r.ordered_product_sales as number) ?? 0), 0),
    orders: prevOrganicRows.reduce((s, r) => s + ((r.orders as number) ?? 0), 0),
    sessions: prevOrganicRows.reduce((s, r) => s + ((r.sessions as number) ?? 0), 0),
  }
  const sumAd = {
    cost: adsRows.reduce((s, r) => s + ((r.cost as number) ?? 0), 0),
    sales: adsRows.reduce((s, r) => s + ((r.sales as number) ?? 0), 0),
    impressions: adsRows.reduce((s, r) => s + ((r.impressions as number) ?? 0), 0),
    clicks: adsRows.reduce((s, r) => s + ((r.clicks as number) ?? 0), 0),
  }
  const sumPrevAd = {
    cost: prevAdsRows.reduce((s, r) => s + ((r.cost as number) ?? 0), 0),
    sales: prevAdsRows.reduce((s, r) => s + ((r.sales as number) ?? 0), 0),
    impressions: prevAdsRows.reduce((s, r) => s + ((r.impressions as number) ?? 0), 0),
    clicks: prevAdsRows.reduce((s, r) => s + ((r.clicks as number) ?? 0), 0),
  }

  const monthly: AmazonMonthlyData = {
    organic_sales: sumOrg.sales || null,
    orders: sumOrg.orders || null,
    sessions: sumOrg.sessions || null,
    conversion_rate: sumOrg.sessions > 0 ? (sumOrg.orders / sumOrg.sessions) * 100 : null,
    aov: sumOrg.orders > 0 ? sumOrg.sales / sumOrg.orders : null,
    ad_cost: sumAd.cost || null,
    ad_sales: sumAd.sales || null,
    ad_roas: sumAd.cost > 0 ? sumAd.sales / sumAd.cost : null,
    ad_impressions: sumAd.impressions || null,
    ad_clicks: sumAd.clicks || null,
    ad_cpc: sumAd.clicks > 0 ? sumAd.cost / sumAd.clicks : null,
    ad_ctr: sumAd.impressions > 0 ? (sumAd.clicks / sumAd.impressions) * 100 : null,
    prev_organic_sales: sumPrevOrg.sales || null,
    prev_orders: sumPrevOrg.orders || null,
    prev_sessions: sumPrevOrg.sessions || null,
    prev_conversion_rate: sumPrevOrg.sessions > 0 ? (sumPrevOrg.orders / sumPrevOrg.sessions) * 100 : null,
    prev_aov: sumPrevOrg.orders > 0 ? sumPrevOrg.sales / sumPrevOrg.orders : null,
    prev_ad_cost: sumPrevAd.cost || null,
    prev_ad_sales: sumPrevAd.sales || null,
    prev_ad_roas: sumPrevAd.cost > 0 ? sumPrevAd.sales / sumPrevAd.cost : null,
    prev_ad_impressions: sumPrevAd.impressions || null,
    prev_ad_clicks: sumPrevAd.clicks || null,
    prev_ad_cpc: sumPrevAd.clicks > 0 ? sumPrevAd.cost / sumPrevAd.clicks : null,
    prev_ad_ctr: sumPrevAd.impressions > 0 ? (sumPrevAd.clicks / sumPrevAd.impressions) * 100 : null,
  }

  // 5. weekly 계산
  function getWeekNumber(dateStr: string): number {
    const day = new Date(dateStr).getDate()
    return Math.ceil(day / 7)
  }
  function getWeekRange(yr: number, mo: number, week: number): string {
    const start = (week - 1) * 7 + 1
    const lastDay = new Date(yr, mo, 0).getDate()
    const end = Math.min(week * 7, lastDay)
    const m = String(mo).padStart(2, '0')
    return `${yr}-${m}-${String(start).padStart(2, '0')} ~ ${yr}-${m}-${String(end).padStart(2, '0')}`
  }

  const orgByWeek: Record<number, { sales: number; orders: number; sessions: number }> = {}
  for (const r of organicRows) {
    const w = getWeekNumber(r.date)
    if (!orgByWeek[w]) orgByWeek[w] = { sales: 0, orders: 0, sessions: 0 }
    orgByWeek[w].sales += (r.ordered_product_sales as number) ?? 0
    orgByWeek[w].orders += (r.orders as number) ?? 0
    orgByWeek[w].sessions += (r.sessions as number) ?? 0
  }

  const adByWeek: Record<number, { cost: number; sales: number; impressions: number; clicks: number }> = {}
  for (const r of adsRows) {
    const w = getWeekNumber(r.date)
    if (!adByWeek[w]) adByWeek[w] = { cost: 0, sales: 0, impressions: 0, clicks: 0 }
    adByWeek[w].cost += (r.cost as number) ?? 0
    adByWeek[w].sales += (r.sales as number) ?? 0
    adByWeek[w].impressions += (r.impressions as number) ?? 0
    adByWeek[w].clicks += (r.clicks as number) ?? 0
  }

  const weekNumbers = [...new Set([...Object.keys(orgByWeek), ...Object.keys(adByWeek)].map(Number))].sort((a, b) => a - b)
  const weekly: AmazonWeeklyData[] = weekNumbers.map(w => {
    const o = orgByWeek[w] ?? { sales: 0, orders: 0, sessions: 0 }
    const a = adByWeek[w] ?? { cost: 0, sales: 0, impressions: 0, clicks: 0 }
    return {
      week: w,
      date_range: getWeekRange(year, month, w),
      organic_sales: o.sales || null,
      orders: o.orders || null,
      sessions: o.sessions || null,
      conversion_rate: o.sessions > 0 ? (o.orders / o.sessions) * 100 : null,
      aov: o.orders > 0 ? o.sales / o.orders : null,
      ad_cost: a.cost || null,
      ad_sales: a.sales || null,
      ad_roas: a.cost > 0 ? a.sales / a.cost : null,
      ad_impressions: a.impressions || null,
      ad_clicks: a.clicks || null,
      ad_cpc: a.clicks > 0 ? a.cost / a.clicks : null,
      ad_ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : null,
    }
  })

  // 6. keywords 계산 (B0 제외, Top 15)
  let keywords: AmazonKeywordData[] = []
  if (keywordRows && keywordRows.length > 0) {
    const keywordMap: Record<string, number> = {}
    for (const r of keywordRows) {
      const kw = (r.keyword as string) ?? ''
      if (kw.startsWith('B0')) continue
      if (!kw.trim()) continue
      keywordMap[kw] = (keywordMap[kw] ?? 0) + ((r.impressions as number) ?? 0)
    }
    keywords = Object.entries(keywordMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([keyword, impressions]) => ({ keyword, impressions }))
  }

  // 7. daily 계산
  const daily: AmazonDailyData[] = organicRows.map(r => ({
    date: r.date,
    organic_sales: (r.ordered_product_sales as number) ?? null,
    orders: (r.orders as number) ?? null,
    sessions: (r.sessions as number) ?? null,
    conversion_rate: ((r.sessions as number) ?? 0) > 0
      ? (((r.orders as number) ?? 0) / ((r.sessions as number) ?? 1)) * 100
      : null,
  }))

  // 8. products 계산 (child_asin 기준 집계)
  const productMap: Record<string, {
    title: string; parent_asin: string | null; child_asin: string;
    sales: number; quantity: number
  }> = {}

  for (const r of asinRows) {
    const key = (r.child_asin as string) ?? 'unknown'
    if (!productMap[key]) {
      productMap[key] = {
        title: (r.title as string) ?? '',
        parent_asin: (r.parent_asin as string) ?? null,
        child_asin: key,
        sales: 0,
        quantity: 0,
      }
    }
    productMap[key].sales += (r.ordered_product_sales as number) ?? 0
    productMap[key].quantity += (r.total_order_items as number) ?? 0
  }

  const products: AmazonProductData[] = Object.values(productMap)
    .filter(p => p.sales > 0)
    .sort((a, b) => b.sales - a.sales)
    .map(p => ({
      title: p.title,
      parent_asin: p.parent_asin,
      child_asin: p.child_asin,
      sales: p.sales || null,
      quantity: p.quantity || null,
    }))

  return {
    platform: 'amazon',
    data: { monthly, weekly, keywords, daily, products },
  } as ReportSnapshot
}

// ── Qoo10 스냅샷 빌더 ────────────────────────────────────────────────────────

async function buildQoo10Snapshot(args: {
  internal_account_id: string
  year: number
  month: number
  thisMonthStart: string
  thisMonthEnd: string
  prevMonthStart: string
  prevMonthEnd: string
}): Promise<ReportSnapshot> {
  const { internal_account_id, year, month, thisMonthStart, thisMonthEnd, prevMonthStart, prevMonthEnd } = args

  // 1. 이 계정의 account_id, brand_id 조회
  const { data: qoo10Account } = await supabaseAdmin
    .from('qoo10_accounts')
    .select('account_id, brand_id')
    .eq('id', internal_account_id)
    .single()

  if (!qoo10Account) throw new Error('큐텐 계정을 찾을 수 없습니다.')

  const { account_id: externalAccountId, brand_id: bId } = qoo10Account

  // 2. 같은 account_id의 ads/organic 계정 PK 조회
  const { data: allQoo10Accts } = await supabaseAdmin
    .from('qoo10_accounts')
    .select('id, account_type')
    .eq('account_id', externalAccountId)
    .eq('brand_id', bId)

  const adsIds = (allQoo10Accts ?? []).filter((a) => a.account_type === 'ads').map((a) => a.id)
  const organicIds = (allQoo10Accts ?? []).filter((a) => a.account_type === 'organic').map((a) => a.id)

  // 3. 모든 데이터 병렬 조회 (당월 + 전월)
  const [
    { data: curAds },
    { data: prevAds },
    { data: curVisitor },
    { data: prevVisitor },
    { data: curTx },
    { data: prevTx },
  ] = await Promise.all([
    adsIds.length > 0
      ? supabaseAdmin
          .from('qoo10_ads_stats')
          .select('date, cost, sales, impressions, clicks')
          .in('qoo10_account_id', adsIds)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd)
          .order('date', { ascending: true })
      : Promise.resolve({ data: [] }),
    adsIds.length > 0
      ? supabaseAdmin
          .from('qoo10_ads_stats')
          .select('date, cost, sales, impressions, clicks')
          .in('qoo10_account_id', adsIds)
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd)
      : Promise.resolve({ data: [] }),
    organicIds.length > 0
      ? supabaseAdmin
          .from('qoo10_organic_visitor_stats')
          .select('date, visitors')
          .in('qoo10_account_id', organicIds)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd)
          .order('date', { ascending: true })
      : Promise.resolve({ data: [] }),
    organicIds.length > 0
      ? supabaseAdmin
          .from('qoo10_organic_visitor_stats')
          .select('date, visitors')
          .in('qoo10_account_id', organicIds)
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd)
      : Promise.resolve({ data: [] }),
    organicIds.length > 0
      ? supabaseAdmin
          .from('qoo10_organic_transaction_stats')
          .select('date, transaction_amount, transaction_quantity, product_name')
          .in('qoo10_account_id', organicIds)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd)
          .order('date', { ascending: true })
      : Promise.resolve({ data: [] }),
    organicIds.length > 0
      ? supabaseAdmin
          .from('qoo10_organic_transaction_stats')
          .select('date, transaction_amount, transaction_quantity')
          .in('qoo10_account_id', organicIds)
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd)
      : Promise.resolve({ data: [] }),
  ])

  // 4. 날짜별 집계 (당월)
  type OrgAgg = { revenue: number; purchases: number }
  const txByDate = new Map<string, OrgAgg>()
  for (const r of curTx ?? []) {
    const prev = txByDate.get(r.date) ?? { revenue: 0, purchases: 0 }
    txByDate.set(r.date, {
      revenue: prev.revenue + ((r.transaction_amount as number) ?? 0),
      purchases: prev.purchases + ((r.transaction_quantity as number) ?? 0),
    })
  }

  const visitorByDate = new Map<string, number>()
  for (const r of curVisitor ?? []) {
    visitorByDate.set(r.date, (visitorByDate.get(r.date) ?? 0) + ((r.visitors as number) ?? 0))
  }

  type AdsAgg = { ad_sales: number; ad_cost: number; impressions: number; clicks: number }
  const adsByDate = new Map<string, AdsAgg>()
  for (const r of curAds ?? []) {
    const prev = adsByDate.get(r.date) ?? { ad_sales: 0, ad_cost: 0, impressions: 0, clicks: 0 }
    adsByDate.set(r.date, {
      ad_sales: prev.ad_sales + ((r.sales as number) ?? 0),
      ad_cost: prev.ad_cost + ((r.cost as number) ?? 0),
      impressions: prev.impressions + ((r.impressions as number) ?? 0),
      clicks: prev.clicks + ((r.clicks as number) ?? 0),
    })
  }

  // 5. 전월 집계
  type PrevOrgAgg = { revenue: number; purchases: number; sessions: number }
  const prevOrgAgg: PrevOrgAgg = { revenue: 0, purchases: 0, sessions: 0 }
  for (const r of prevTx ?? []) {
    prevOrgAgg.revenue += (r.transaction_amount as number) ?? 0
    prevOrgAgg.purchases += (r.transaction_quantity as number) ?? 0
  }
  for (const r of prevVisitor ?? []) {
    prevOrgAgg.sessions += (r.visitors as number) ?? 0
  }

  type PrevAdsAgg = { ad_sales: number; ad_cost: number; impressions: number; clicks: number }
  const prevAdsAgg: PrevAdsAgg = { ad_sales: 0, ad_cost: 0, impressions: 0, clicks: 0 }
  for (const r of prevAds ?? []) {
    prevAdsAgg.ad_sales += (r.sales as number) ?? 0
    prevAdsAgg.ad_cost += (r.cost as number) ?? 0
    prevAdsAgg.impressions += (r.impressions as number) ?? 0
    prevAdsAgg.clicks += (r.clicks as number) ?? 0
  }

  // 6. 당월 합계
  const allDates = Array.from(
    new Set([...txByDate.keys(), ...visitorByDate.keys(), ...adsByDate.keys()])
  ).sort()

  const sumRevenue = allDates.reduce((s, d) => s + (txByDate.get(d)?.revenue ?? 0), 0)
  const sumPurchases = allDates.reduce((s, d) => s + (txByDate.get(d)?.purchases ?? 0), 0)
  const sumSessions = allDates.reduce((s, d) => s + (visitorByDate.get(d) ?? 0), 0)
  const sumAdSales = allDates.reduce((s, d) => s + (adsByDate.get(d)?.ad_sales ?? 0), 0)
  const sumAdCost = allDates.reduce((s, d) => s + (adsByDate.get(d)?.ad_cost ?? 0), 0)
  const sumImpressions = allDates.reduce((s, d) => s + (adsByDate.get(d)?.impressions ?? 0), 0)
  const sumClicks = allDates.reduce((s, d) => s + (adsByDate.get(d)?.clicks ?? 0), 0)

  // 대상 기간 문자열
  const dateRange = `${thisMonthStart} ~ ${thisMonthEnd}`

  // 7. monthly 데이터 구성
  const monthly: Qoo10MonthlyData = {
    date_range: dateRange,
    revenue: sumRevenue || null,
    purchases: sumPurchases || null,
    sessions: sumSessions || null,
    conversion_rate: sumSessions > 0 ? (sumPurchases / sumSessions) * 100 : null,
    aov: sumPurchases > 0 ? sumRevenue / sumPurchases : null,
    ad_sales: sumAdSales || null,
    ad_cost: sumAdCost || null,
    roas: sumAdCost > 0 ? sumAdSales / sumAdCost : null,
    impressions: sumImpressions || null,
    clicks: sumClicks || null,
    ctr: sumImpressions > 0 ? (sumClicks / sumImpressions) * 100 : null,
    cpc: sumClicks > 0 ? sumAdCost / sumClicks : null,
    // 전월
    prev_revenue: prevOrgAgg.revenue || null,
    prev_purchases: prevOrgAgg.purchases || null,
    prev_sessions: prevOrgAgg.sessions || null,
    prev_conversion_rate: prevOrgAgg.sessions > 0 ? (prevOrgAgg.purchases / prevOrgAgg.sessions) * 100 : null,
    prev_aov: prevOrgAgg.purchases > 0 ? prevOrgAgg.revenue / prevOrgAgg.purchases : null,
    prev_ad_sales: prevAdsAgg.ad_sales || null,
    prev_ad_cost: prevAdsAgg.ad_cost || null,
    prev_roas: prevAdsAgg.ad_cost > 0 ? prevAdsAgg.ad_sales / prevAdsAgg.ad_cost : null,
    prev_impressions: prevAdsAgg.impressions || null,
    prev_clicks: prevAdsAgg.clicks || null,
    prev_ctr: prevAdsAgg.impressions > 0 ? (prevAdsAgg.clicks / prevAdsAgg.impressions) * 100 : null,
    prev_cpc: prevAdsAgg.clicks > 0 ? prevAdsAgg.ad_cost / prevAdsAgg.clicks : null,
  }

  // 8. organic/ads 행 배열 구성 → 주간 집계
  const organicRows: Qoo10DailyOrganicRow[] = allDates.map((date) => ({
    date,
    revenue: txByDate.get(date)?.revenue ?? null,
    purchases: txByDate.get(date)?.purchases ?? null,
    sessions: visitorByDate.get(date) ?? null,
  }))

  const adsRowsForWeekly: Qoo10DailyAdsRow[] = allDates.map((date) => ({
    date,
    ad_sales: adsByDate.get(date)?.ad_sales ?? null,
    ad_cost: adsByDate.get(date)?.ad_cost ?? null,
    impressions: adsByDate.get(date)?.impressions ?? null,
    clicks: adsByDate.get(date)?.clicks ?? null,
  }))

  const weekly = groupQoo10ByWeek(organicRows, adsRowsForWeekly, year, month)

  // 9. daily 데이터 (오가닉 기준)
  const daily: Qoo10DailyData[] = allDates.map((date) => {
    const tx = txByDate.get(date) ?? { revenue: 0, purchases: 0 }
    const sessions = visitorByDate.get(date) ?? 0
    return {
      date,
      revenue: tx.revenue || null,
      purchases: tx.purchases || null,
      sessions: sessions || null,
      conversion_rate: sessions > 0 ? (tx.purchases / sessions) * 100 : null,
    }
  })

  // 10. 제품별 집계 + JP→KO 번역
  const productMap = new Map<string, { sales: number; quantity: number }>()
  for (const r of curTx ?? []) {
    const rawName = (r.product_name as string) ?? '(이름없음)'
    const key = rawName
    const prev = productMap.get(key) ?? { sales: 0, quantity: 0 }
    productMap.set(key, {
      sales: prev.sales + ((r.transaction_amount as number) ?? 0),
      quantity: prev.quantity + ((r.transaction_quantity as number) ?? 0),
    })
  }

  // 상위 30개 선별 후 번역
  const topProducts = Array.from(productMap.entries())
    .filter(([, v]) => v.sales > 0)
    .sort(([, a], [, b]) => b.sales - a.sales)
    .slice(0, 30)

  const rawNames = topProducts.map(([name]) => name)
  const preprocessedNames = rawNames.map(preprocessQoo10Name)
  const uniquePreprocessed = [...new Set(preprocessedNames.filter(Boolean))]
  const translationMap = await translateJaToKo(uniquePreprocessed)

  const products: Qoo10ProductData[] = topProducts.map(([rawName, v]) => {
    const preprocessed = preprocessQoo10Name(rawName)
    const koName = preprocessed ? (translationMap.get(preprocessed) ?? null) : null
    return {
      product_name_jp: preprocessed || rawName,
      product_name_ko: koName,
      sales: v.sales || null,
      quantity: v.quantity || null,
    }
  })

  return {
    platform: 'qoo10',
    data: { monthly, weekly, daily, products },
  } as ReportSnapshot
}
