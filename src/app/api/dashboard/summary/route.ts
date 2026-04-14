import { createClient } from '@/lib/supabase/server'
import { preprocessQoo10Name, translateJaToKo } from '@/lib/qoo10/translate'
import type {
  AmazonAdsSummaryDayData,
  AmazonAdsSummaryTotals,
  AmazonCombinedTotals,
  GmvMaxSummaryDayData,
  GmvMaxSummaryTotals,
  Qoo10AdsSummaryDayData,
  Qoo10AdsSummaryTotals,
  Qoo10AdTypeRow,
  Qoo10AdsProductRow,
  Qoo10CombinedTotals,
  Qoo10OrganicProductRow,
  Qoo10OrganicSummaryDayData,
  Qoo10OrganicSummaryTotals,
  Qoo10OrganicTransactionStat,
  Qoo10OrganicVisitorStat,
  Qoo10AdsStat,
  SummaryDayData,
  SummaryTotals,
} from '@/types/database'
import { NextRequest, NextResponse } from 'next/server'

// 계산 지표 산출 (0으로 나누기 방지)
function calcMetrics(
  spend: number | null,
  revenue: number | null,
  impressions: number | null,
  reach: number | null,
  clicks: number | null,
  purchases: number | null,
  content_views?: number | null
) {
  const roas =
    spend && revenue && spend > 0 ? revenue / spend : null
  const frequency =
    impressions && reach && reach > 0 ? impressions / reach : null
  const ctr =
    clicks && impressions && impressions > 0
      ? (clicks / impressions) * 100
      : null
  const cpc = spend && clicks && clicks > 0 ? spend / clicks : null
  const cpa = spend && purchases && purchases > 0 ? spend / purchases : null
  const cpm =
    spend && impressions && impressions > 0
      ? spend / (impressions / 1000)
      : null
  const aov =
    revenue != null && purchases && purchases > 0 ? revenue / purchases : null
  const purchase_rate =
    purchases != null && content_views && content_views > 0
      ? (purchases / content_views) * 100
      : null
  return { roas, frequency, ctr, cpc, cpa, cpm, aov, purchase_rate }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const brandId = searchParams.get('brand_id') ?? ''
  const accountId = searchParams.get('account_id') ?? ''
  const accountType = searchParams.get('account_type') as
    | 'meta'
    | 'tiktok'
    | 'shopee'
    | 'shopee_shopping'
    | 'shopee_inapp'
    | 'amazon'
    | 'amazon_organic'
    | 'amazon_ads'
    | 'amazon_asin'
    | 'qoo10_ads'
    | 'qoo10_organic'
    | 'qoo10'
    | null
  const startDate = searchParams.get('start_date') ?? ''
  const endDate = searchParams.get('end_date') ?? ''

  if (!accountType || !accountId || !startDate || !endDate) {
    return NextResponse.json(
      { error: '필수 파라미터가 누락되었습니다.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  if (accountType === 'meta') {
    let query = supabase
      .from('meta_daily_stats')
      .select('*')
      .eq('meta_account_id', accountId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (brandId && brandId !== 'all') {
      query = query.eq('brand_id', brandId)
    }

    const { data, error } = await query
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []

    // 날짜별 데이터 변환
    const dailyData: SummaryDayData[] = rows.map((r) => {
      const content_views = (r.content_views as number | null) ?? null
      const outboundClicks = (r.outbound_clicks as number | null) ?? null
      const metrics = calcMetrics(
        r.spend,
        r.revenue,
        r.impressions,
        r.reach ?? null,
        outboundClicks,
        r.purchases,
        content_views
      )
      return {
        date: r.date,
        spend: r.spend,
        revenue: r.revenue,
        impressions: r.impressions,
        reach: r.reach ?? null,
        clicks: r.clicks,
        purchases: r.purchases,
        add_to_cart: r.add_to_cart ?? null,
        content_views,
        outbound_clicks: (r.outbound_clicks as number | null) ?? null,
        video_views: null, // Meta는 항상 null
        views_2s: null,
        views_6s: null,
        views_25pct: null,
        views_100pct: null,
        ...metrics,
      }
    })

    // 합산 후 재계산
    const sum = rows.reduce(
      (acc, r) => ({
        spend: (acc.spend ?? 0) + (r.spend ?? 0),
        revenue: (acc.revenue ?? 0) + (r.revenue ?? 0),
        impressions: (acc.impressions ?? 0) + (r.impressions ?? 0),
        reach: (acc.reach ?? 0) + ((r.reach as number | null) ?? 0),
        clicks: (acc.clicks ?? 0) + (r.clicks ?? 0),
        purchases: (acc.purchases ?? 0) + (r.purchases ?? 0),
        add_to_cart:
          (acc.add_to_cart ?? 0) + ((r.add_to_cart as number | null) ?? 0),
        content_views:
          (acc.content_views ?? 0) + ((r.content_views as number | null) ?? 0),
        outbound_clicks:
          (acc.outbound_clicks ?? 0) + ((r.outbound_clicks as number | null) ?? 0),
      }),
      {
        spend: 0,
        revenue: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        purchases: 0,
        add_to_cart: 0,
        content_views: 0,
        outbound_clicks: 0,
      }
    )

    const totals: SummaryTotals = {
      ...sum,
      content_views: sum.content_views || null,
      outbound_clicks: sum.outbound_clicks || null,
      video_views: null, // Meta는 항상 null
      views_2s: null,
      views_6s: null,
      views_25pct: null,
      views_100pct: null,
      ...calcMetrics(
        sum.spend || null,
        sum.revenue || null,
        sum.impressions || null,
        sum.reach || null,
        sum.outbound_clicks || null,
        sum.purchases || null,
        sum.content_views || null
      ),
    }

    return NextResponse.json({ platform: 'meta', dailyData, totals })
  } else if (accountType === 'tiktok') {
    let query = supabase
      .from('tiktok_daily_stats')
      .select('*')
      .eq('tiktok_account_id', accountId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (brandId && brandId !== 'all') {
      query = query.eq('brand_id', brandId)
    }

    const { data, error } = await query
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []

    const dailyData: SummaryDayData[] = rows.map((r) => {
      const metrics = calcMetrics(
        r.spend,
        r.revenue,
        r.impressions,
        r.reach ?? null,
        r.clicks,
        r.purchases
      )
      return {
        date: r.date,
        spend: r.spend,
        revenue: r.revenue,
        impressions: r.impressions,
        reach: r.reach ?? null,
        clicks: r.clicks,
        purchases: r.purchases,
        add_to_cart: null, // TikTok은 항상 null
        content_views: null,
        outbound_clicks: null,
        video_views: (r as any).video_views ?? null,
        views_2s: (r as any).views_2s ?? null,
        views_6s: (r as any).views_6s ?? null,
        views_25pct: (r as any).views_25pct ?? null,
        views_100pct: (r as any).views_100pct ?? null,
        ...metrics,
      }
    })

    const sum = rows.reduce(
      (acc, r) => ({
        spend: (acc.spend ?? 0) + (r.spend ?? 0),
        revenue: (acc.revenue ?? 0) + (r.revenue ?? 0),
        impressions: (acc.impressions ?? 0) + (r.impressions ?? 0),
        reach: (acc.reach ?? 0) + ((r.reach as number | null) ?? 0),
        clicks: (acc.clicks ?? 0) + (r.clicks ?? 0),
        purchases: (acc.purchases ?? 0) + (r.purchases ?? 0),
        add_to_cart: 0,
        video_views: (acc.video_views ?? 0) + (((r as any).video_views as number | null) ?? 0),
        views_2s: (acc.views_2s ?? 0) + (((r as any).views_2s as number | null) ?? 0),
        views_6s: (acc.views_6s ?? 0) + (((r as any).views_6s as number | null) ?? 0),
        views_25pct: (acc.views_25pct ?? 0) + (((r as any).views_25pct as number | null) ?? 0),
        views_100pct: (acc.views_100pct ?? 0) + (((r as any).views_100pct as number | null) ?? 0),
      }),
      {
        spend: 0,
        revenue: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        purchases: 0,
        add_to_cart: 0,
        video_views: 0,
        views_2s: 0,
        views_6s: 0,
        views_25pct: 0,
        views_100pct: 0,
      }
    )

    const totals: SummaryTotals = {
      ...sum,
      add_to_cart: null, // TikTok은 항상 null
      content_views: null,
      outbound_clicks: null,
      ...calcMetrics(
        sum.spend || null,
        sum.revenue || null,
        sum.impressions || null,
        sum.reach || null,
        sum.clicks || null,
        sum.purchases || null
      ),
    }

    // GMV Max 데이터 조회 (store_id가 있는 계정만)
    let gmvMaxDailyData: GmvMaxSummaryDayData[] | undefined
    let gmvMaxTotals: GmvMaxSummaryTotals | undefined

    const { data: tiktokAcct } = await supabase
      .from('tiktok_accounts')
      .select('store_id')
      .eq('id', accountId)
      .single()

    if (tiktokAcct?.store_id) {
      let gmvQuery = supabase
        .from('gmv_max_daily_stats')
        .select('date, cost, gross_revenue, roi, orders, cost_per_order')
        .eq('tiktok_account_id', accountId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (brandId && brandId !== 'all') {
        gmvQuery = gmvQuery.eq('brand_id', brandId)
      }

      const { data: gmvRows } = await gmvQuery

      if (gmvRows && gmvRows.length > 0) {
        gmvMaxDailyData = gmvRows.map((r) => ({
          date: r.date as string,
          cost: r.cost as number | null,
          gross_revenue: r.gross_revenue as number | null,
          roi: r.roi as number | null,
          orders: r.orders as number | null,
          cost_per_order: r.cost_per_order as number | null,
        }))

        // totals 합산 후 파생 지표 재계산
        const sumCost = gmvRows.reduce((s, r) => s + ((r.cost as number | null) ?? 0), 0)
        const sumRevenue = gmvRows.reduce((s, r) => s + ((r.gross_revenue as number | null) ?? 0), 0)
        const sumOrders = gmvRows.reduce((s, r) => s + ((r.orders as number | null) ?? 0), 0)

        gmvMaxTotals = {
          cost: sumCost || null,
          gross_revenue: sumRevenue || null,
          roi: sumCost > 0 ? sumRevenue / sumCost : null,
          orders: sumOrders || null,
          cost_per_order: sumOrders > 0 ? sumCost / sumOrders : null,
        }
      }
    }

    return NextResponse.json({
      platform: 'tiktok',
      dailyData,
      totals,
      ...(gmvMaxDailyData ? { gmvMaxDailyData, gmvMaxTotals } : {}),
    })
  } else if (accountType === 'shopee' || accountType === 'shopee_shopping' || accountType === 'shopee_inapp') {
    // 전달된 accountId로 shopee_accounts 조회하여 외부 account_id 획득
    const { data: refAcct } = await supabase
      .from('shopee_accounts')
      .select('account_id, brand_id, country, sub_brand')
      .eq('id', accountId)
      .single()

    if (!refAcct) return NextResponse.json({ error: '쇼피 계정을 찾을 수 없습니다.' }, { status: 404 })

    const { account_id: externalAccountId, brand_id: bId, country: bCountry, sub_brand: bSubBrand } = refAcct

    // 같은 account_id의 shopping/inapp 계정 ID 조회
    const { data: allShopeeAccts } = await supabase
      .from('shopee_accounts')
      .select('id, account_type')
      .eq('account_id', externalAccountId)
      .eq('brand_id', bId)

    const shoppingAccountIds = (allShopeeAccts ?? []).filter((a) => a.account_type === 'shopping').map((a) => a.id)
    const inappAccountIds = (allShopeeAccts ?? []).filter((a) => a.account_type === 'inapp').map((a) => a.id)

    // ── 쇼핑몰 데이터 ──────────────────────────────────────────────────
    let shoppingDailyData: SummaryDayData[] = []
    let shoppingTotals: SummaryTotals = buildEmptyTotals()
    let shoppingCurrency: string | null = null
    let shoppingHasKrw = false

    if (shoppingAccountIds.length > 0) {
      let shopQuery = supabase
        .from('shopee_shopping_stats')
        .select('date, sales_krw, sales, orders, product_clicks, visitors, currency, buyers, new_buyers, existing_buyers, order_conversion_rate, repeat_purchase_rate, cancelled_orders, cancelled_sales, cancelled_sales_krw, refunded_orders, refunded_sales, refunded_sales_krw')
        .in('shopee_account_id', shoppingAccountIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      if (brandId && brandId !== 'all') shopQuery = shopQuery.eq('brand_id', brandId)

      const { data: shopData } = await shopQuery
      const shopRows = shopData ?? []

      // spend_krw 계산: Meta + 인앱 spend 조인
      const spendByDate: Record<string, number> = {}

      let metaAcctQuery = supabase
        .from('meta_accounts')
        .select('id')
        .eq('brand_id', bId)
        .eq('country', bCountry)
      metaAcctQuery =
        bSubBrand === null
          ? metaAcctQuery.is('sub_brand', null)
          : metaAcctQuery.eq('sub_brand', bSubBrand)
      const { data: metaAccts } = await metaAcctQuery
      const metaIds = (metaAccts ?? []).map((a) => a.id)

      if (metaIds.length > 0) {
        const { data: metaStats } = await supabase
          .from('meta_daily_stats')
          .select('date, spend')
          .in('meta_account_id', metaIds)
          .gte('date', startDate)
          .lte('date', endDate)
        for (const s of metaStats ?? []) {
          spendByDate[s.date] = (spendByDate[s.date] ?? 0) + (s.spend ?? 0)
        }
      }

      if (inappAccountIds.length > 0) {
        const { data: inappStats } = await supabase
          .from('shopee_inapp_stats')
          .select('date, expense_krw')
          .in('shopee_account_id', inappAccountIds)
          .gte('date', startDate)
          .lte('date', endDate)
        for (const s of inappStats ?? []) {
          if (s.expense_krw != null) {
            spendByDate[s.date] = (spendByDate[s.date] ?? 0) + s.expense_krw
          }
        }
      }

      shoppingHasKrw = shopRows.some((r) => r.sales_krw != null)
      shoppingCurrency = (shopRows[0]?.currency as string | null) ?? null

      shoppingDailyData = shopRows.map((r) => {
        const spend = spendByDate[r.date] ?? null
        const revenue = shoppingHasKrw ? ((r.sales_krw as number | null) ?? null) : ((r.sales as number | null) ?? null)
        const purchases = (r.orders as number | null) ?? null
        const clicks = (r.product_clicks as number | null) ?? null
        const impressions = (r.visitors as number | null) ?? null
        const ctr = impressions && purchases && impressions > 0 ? (purchases / impressions) * 100 : null
        const roas = spend && revenue && spend > 0 ? revenue / spend : null
        const cpc = spend && clicks && clicks > 0 ? spend / clicks : null
        const aov = revenue != null && purchases && purchases > 0 ? revenue / purchases : null
        return {
          date: r.date, spend, revenue, purchases, clicks, impressions,
          reach: null, add_to_cart: null, content_views: null, outbound_clicks: null,
          video_views: null, views_2s: null, views_6s: null, views_25pct: null, views_100pct: null,
          roas, frequency: null, ctr, cpc, cpa: null, cpm: null, aov, purchase_rate: null,
          buyers: (r.buyers as number | null) ?? null,
          new_buyers: (r.new_buyers as number | null) ?? null,
          existing_buyers: (r.existing_buyers as number | null) ?? null,
          order_conversion_rate: (r.order_conversion_rate as number | null) ?? null,
          repeat_purchase_rate: (r.repeat_purchase_rate as number | null) ?? null,
          cancelled_orders: (r.cancelled_orders as number | null) ?? null,
          cancelled_sales: shoppingHasKrw
            ? ((r.cancelled_sales_krw as number | null) ?? null)
            : ((r.cancelled_sales as number | null) ?? null),
          refunded_orders: (r.refunded_orders as number | null) ?? null,
          refunded_sales: shoppingHasKrw
            ? ((r.refunded_sales_krw as number | null) ?? null)
            : ((r.refunded_sales as number | null) ?? null),
        }
      })

      const shopSum = shopRows.reduce(
        (acc, r) => ({
          spend: acc.spend + (spendByDate[r.date] ?? 0),
          revenue: acc.revenue + (shoppingHasKrw ? ((r.sales_krw as number | null) ?? 0) : ((r.sales as number | null) ?? 0)),
          purchases: acc.purchases + ((r.orders as number | null) ?? 0),
          clicks: acc.clicks + ((r.product_clicks as number | null) ?? 0),
          impressions: acc.impressions + ((r.visitors as number | null) ?? 0),
          buyers: acc.buyers + ((r.buyers as number | null) ?? 0),
          new_buyers: acc.new_buyers + ((r.new_buyers as number | null) ?? 0),
          existing_buyers: acc.existing_buyers + ((r.existing_buyers as number | null) ?? 0),
          cancelled_orders: acc.cancelled_orders + ((r.cancelled_orders as number | null) ?? 0),
          cancelled_sales: acc.cancelled_sales + (shoppingHasKrw ? ((r.cancelled_sales_krw as number | null) ?? 0) : ((r.cancelled_sales as number | null) ?? 0)),
          refunded_orders: acc.refunded_orders + ((r.refunded_orders as number | null) ?? 0),
          refunded_sales: acc.refunded_sales + (shoppingHasKrw ? ((r.refunded_sales_krw as number | null) ?? 0) : ((r.refunded_sales as number | null) ?? 0)),
        }),
        { spend: 0, revenue: 0, purchases: 0, clicks: 0, impressions: 0, buyers: 0, new_buyers: 0, existing_buyers: 0, cancelled_orders: 0, cancelled_sales: 0, refunded_orders: 0, refunded_sales: 0 }
      )
      shoppingTotals = {
        spend: shopSum.spend || null, revenue: shopSum.revenue || null,
        purchases: shopSum.purchases || null, clicks: shopSum.clicks || null,
        impressions: shopSum.impressions || null,
        reach: null, add_to_cart: null, content_views: null, outbound_clicks: null,
        video_views: null, views_2s: null, views_6s: null, views_25pct: null, views_100pct: null,
        roas: shopSum.spend > 0 ? shopSum.revenue / shopSum.spend : null,
        frequency: null,
        ctr: shopSum.impressions > 0 ? (shopSum.purchases / shopSum.impressions) * 100 : null,
        cpc: shopSum.clicks > 0 ? shopSum.spend / shopSum.clicks : null,
        cpa: null, cpm: null,
        aov: shopSum.purchases > 0 ? shopSum.revenue / shopSum.purchases : null,
        purchase_rate: null,
        buyers: shopSum.buyers || null,
        new_buyers: shopSum.new_buyers || null,
        existing_buyers: shopSum.existing_buyers || null,
        order_conversion_rate: shopSum.impressions > 0 ? (shopSum.purchases / shopSum.impressions) * 100 : null,
        repeat_purchase_rate: shopSum.buyers > 0 ? (shopSum.existing_buyers / shopSum.buyers) * 100 : null,
        cancelled_orders: shopSum.cancelled_orders || null,
        cancelled_sales: shopSum.cancelled_sales || null,
        refunded_orders: shopSum.refunded_orders || null,
        refunded_sales: shopSum.refunded_sales || null,
      }
    }

    // ── 인앱 데이터 ────────────────────────────────────────────────────
    let inappDailyData: SummaryDayData[] = []
    let inappTotals: SummaryTotals = buildEmptyTotals()
    let inappCurrency: string | null = null
    let inappHasKrw = false

    if (inappAccountIds.length > 0) {
      let inappQuery = supabase
        .from('shopee_inapp_stats')
        .select('date, impressions, clicks, conversions, gmv, gmv_krw, expense, expense_krw, currency')
        .in('shopee_account_id', inappAccountIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      if (brandId && brandId !== 'all') inappQuery = inappQuery.eq('brand_id', brandId)

      const { data: inappData } = await inappQuery
      const inappRows = inappData ?? []

      inappHasKrw = inappRows.some((r) => r.expense_krw != null)
      inappCurrency = (inappRows[0]?.currency as string | null) ?? null

      const byDate: Record<string, { impressions: number; clicks: number; conversions: number; gmv: number; gmv_krw: number | null; expense: number; expense_krw: number | null }> = {}
      for (const r of inappRows) {
        if (!byDate[r.date]) byDate[r.date] = { impressions: 0, clicks: 0, conversions: 0, gmv: 0, gmv_krw: null, expense: 0, expense_krw: null }
        const d = byDate[r.date]
        d.impressions += (r.impressions as number | null) ?? 0
        d.clicks += (r.clicks as number | null) ?? 0
        d.conversions += (r.conversions as number | null) ?? 0
        d.gmv += (r.gmv as number | null) ?? 0
        d.expense += (r.expense as number | null) ?? 0
        if (r.gmv_krw != null) d.gmv_krw = (d.gmv_krw ?? 0) + (r.gmv_krw as number)
        if (r.expense_krw != null) d.expense_krw = (d.expense_krw ?? 0) + (r.expense_krw as number)
      }

      inappDailyData = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => {
          const spend = inappHasKrw ? d.expense_krw : (d.expense || null)
          const revenue = inappHasKrw ? d.gmv_krw : (d.gmv || null)
          const purchases = d.conversions || null
          const clicks = d.clicks || null
          const impressions = d.impressions || null
          const roas = spend && revenue && spend > 0 ? revenue / spend : null
          const ctr = clicks && impressions && impressions > 0 ? (clicks / impressions) * 100 : null
          const cpc = spend && clicks && clicks > 0 ? spend / clicks : null
          const cpa = spend && purchases && purchases > 0 ? spend / purchases : null
          const conversion_rate = clicks && purchases && clicks > 0 ? (purchases / clicks) * 100 : null
          return {
            date, spend, revenue, purchases, clicks, impressions,
            reach: null, add_to_cart: null, content_views: null, outbound_clicks: null,
            video_views: null, views_2s: null, views_6s: null, views_25pct: null, views_100pct: null,
            roas, frequency: null, ctr, cpc, cpa, cpm: null, aov: null, purchase_rate: null, conversion_rate,
          }
        })

      const inappSum = Object.values(byDate).reduce(
        (acc, d) => ({
          spend: acc.spend + (inappHasKrw ? (d.expense_krw ?? 0) : d.expense),
          revenue: acc.revenue + (inappHasKrw ? (d.gmv_krw ?? 0) : d.gmv),
          purchases: acc.purchases + d.conversions,
          clicks: acc.clicks + d.clicks,
          impressions: acc.impressions + d.impressions,
        }),
        { spend: 0, revenue: 0, purchases: 0, clicks: 0, impressions: 0 }
      )
      inappTotals = {
        spend: inappSum.spend || null, revenue: inappSum.revenue || null,
        purchases: inappSum.purchases || null, clicks: inappSum.clicks || null,
        impressions: inappSum.impressions || null,
        reach: null, add_to_cart: null, content_views: null, outbound_clicks: null,
        video_views: null, views_2s: null, views_6s: null, views_25pct: null, views_100pct: null,
        roas: inappSum.spend > 0 ? inappSum.revenue / inappSum.spend : null,
        frequency: null,
        ctr: inappSum.impressions > 0 ? (inappSum.clicks / inappSum.impressions) * 100 : null,
        cpc: inappSum.clicks > 0 ? inappSum.spend / inappSum.clicks : null,
        cpa: inappSum.purchases > 0 ? inappSum.spend / inappSum.purchases : null,
        cpm: null, aov: null, purchase_rate: null,
        conversion_rate: inappSum.clicks > 0 ? (inappSum.purchases / inappSum.clicks) * 100 : null,
      }
    }

    const currency = shoppingCurrency ?? inappCurrency
    const hasKrw = shoppingHasKrw || inappHasKrw

    return NextResponse.json({
      platform: 'shopee',
      dailyData: shoppingDailyData,  // 대표 데이터 (하위호환)
      totals: shoppingTotals,
      shopeeExtra: { currency, hasKrw },
      shoppingDailyData,
      shoppingTotals,
      inappDailyData,
      inappTotals,
    })
  } else if (
    accountType === 'amazon' ||
    accountType === 'amazon_organic' ||
    accountType === 'amazon_ads' ||
    accountType === 'amazon_asin'
  ) {
    // 전달된 accountId로 amazon_accounts 조회하여 외부 account_id 획득
    const { data: refAcct } = await supabase
      .from('amazon_accounts')
      .select('account_id, brand_id')
      .eq('id', accountId)
      .single()

    if (!refAcct) return NextResponse.json({ error: '아마존 계정을 찾을 수 없습니다.' }, { status: 404 })

    const { account_id: externalAccountId, brand_id: bId } = refAcct

    // 같은 account_id + brand_id의 organic/ads 계정 ID 조회
    const { data: allAmazonAccts } = await supabase
      .from('amazon_accounts')
      .select('id, account_type')
      .eq('account_id', externalAccountId)
      .eq('brand_id', bId)

    const organicAccountIds = (allAmazonAccts ?? [])
      .filter((a) => a.account_type === 'organic')
      .map((a) => a.id)
    const adsAccountIds = (allAmazonAccts ?? [])
      .filter((a) => a.account_type === 'ads')
      .map((a) => a.id)

    // ── 오가닉 데이터 ──────────────────────────────────────────────────
    let organicDailyData: SummaryDayData[] = []
    let organicTotals: SummaryTotals = buildEmptyTotals()
    let organicCurrency: string | null = null

    if (organicAccountIds.length > 0) {
      let orgQuery = supabase
        .from('amazon_organic_stats')
        .select('date, ordered_product_sales, orders, sessions, page_views, buy_box_percentage, unit_session_percentage, currency')
        .in('amazon_account_id', organicAccountIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      if (brandId && brandId !== 'all') orgQuery = orgQuery.eq('brand_id', brandId)

      const { data: orgData } = await orgQuery
      const orgRows = orgData ?? []

      organicCurrency = (orgRows[0]?.currency as string | null) ?? null

      // 날짜별 집계 (같은 날짜에 여러 행이 있을 수 있음)
      const byDate: Record<string, { sales: number; orders: number; sessions: number; page_views: number; buy_box_pct: number | null; unit_session_pct: number | null }> = {}
      for (const r of orgRows) {
        if (!byDate[r.date]) byDate[r.date] = { sales: 0, orders: 0, sessions: 0, page_views: 0, buy_box_pct: null, unit_session_pct: null }
        const d = byDate[r.date]
        d.sales += (r.ordered_product_sales as number | null) ?? 0
        d.orders += (r.orders as number | null) ?? 0
        d.sessions += (r.sessions as number | null) ?? 0
        d.page_views += (r.page_views as number | null) ?? 0
        // 백분율 지표는 마지막 값 사용 (계정 1개 기준)
        if (r.buy_box_percentage != null) d.buy_box_pct = r.buy_box_percentage as number
        if (r.unit_session_percentage != null) d.unit_session_pct = r.unit_session_percentage as number
      }

      organicDailyData = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => {
          const revenue = d.sales || null
          const purchases = d.orders || null
          const impressions = d.sessions || null  // sessions → impressions 매핑
          const clicks = d.page_views || null      // page_views → clicks 매핑
          const conversion_rate = d.sessions > 0 ? (d.orders / d.sessions) * 100 : null
          const aov = d.orders > 0 ? d.sales / d.orders : null
          return {
            date, spend: null, revenue, purchases, clicks, impressions,
            reach: null, add_to_cart: null, content_views: null, outbound_clicks: null,
            video_views: null, views_2s: null, views_6s: null, views_25pct: null, views_100pct: null,
            roas: null, frequency: null, ctr: null, cpc: null, cpa: null, cpm: null,
            aov, purchase_rate: null,
            order_conversion_rate: conversion_rate,
            buy_box_percentage: d.buy_box_pct,
            unit_session_percentage: d.unit_session_pct,
          }
        })

      const dateEntries = Object.values(byDate)
      const orgSum = dateEntries.reduce(
        (acc, d) => ({
          sales: acc.sales + d.sales,
          orders: acc.orders + d.orders,
          sessions: acc.sessions + d.sessions,
          page_views: acc.page_views + d.page_views,
        }),
        { sales: 0, orders: 0, sessions: 0, page_views: 0 }
      )

      // buy_box_percentage, unit_session_percentage: null이 아닌 값들의 평균
      const bbValues = dateEntries.map((d) => d.buy_box_pct).filter((v): v is number => v != null)
      const usValues = dateEntries.map((d) => d.unit_session_pct).filter((v): v is number => v != null)
      const avgBuyBox = bbValues.length > 0 ? bbValues.reduce((a, b) => a + b, 0) / bbValues.length : null
      const avgUnitSession = usValues.length > 0 ? usValues.reduce((a, b) => a + b, 0) / usValues.length : null

      organicTotals = {
        ...buildEmptyTotals(),
        revenue: orgSum.sales || null,
        purchases: orgSum.orders || null,
        impressions: orgSum.sessions || null,
        clicks: orgSum.page_views || null,
        aov: orgSum.orders > 0 ? orgSum.sales / orgSum.orders : null,
        order_conversion_rate: orgSum.sessions > 0 ? (orgSum.orders / orgSum.sessions) * 100 : null,
        buy_box_percentage: avgBuyBox,
        unit_session_percentage: avgUnitSession,
      }
    }

    // ── 광고 데이터 ────────────────────────────────────────────────────
    let adsDailyData: AmazonAdsSummaryDayData[] = []
    let adsTotals: AmazonAdsSummaryTotals = {
      cost: null, sales: null, impressions: null, clicks: null,
      purchases: null, purchases_new_to_brand: null,
      acos: null, roas: null, cpc: null, ctr: null, cost_per_purchase: null,
    }
    let adsCurrency: string | null = null

    if (adsAccountIds.length > 0) {
      let adsQuery = supabase
        .from('amazon_ads_stats')
        .select('date, impressions, clicks, cost, purchases, purchases_new_to_brand, sales, currency')
        .in('amazon_account_id', adsAccountIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      if (brandId && brandId !== 'all') adsQuery = adsQuery.eq('brand_id', brandId)

      const { data: adsData } = await adsQuery
      const adsRows = adsData ?? []

      adsCurrency = (adsRows[0]?.currency as string | null) ?? null

      // 날짜별 집계
      const byDate: Record<string, { impressions: number; clicks: number; cost: number; purchases: number; purchases_ntb: number; sales: number }> = {}
      for (const r of adsRows) {
        if (!byDate[r.date]) byDate[r.date] = { impressions: 0, clicks: 0, cost: 0, purchases: 0, purchases_ntb: 0, sales: 0 }
        const d = byDate[r.date]
        d.impressions += (r.impressions as number | null) ?? 0
        d.clicks += (r.clicks as number | null) ?? 0
        d.cost += (r.cost as number | null) ?? 0
        d.purchases += (r.purchases as number | null) ?? 0
        d.purchases_ntb += (r.purchases_new_to_brand as number | null) ?? 0
        d.sales += (r.sales as number | null) ?? 0
      }

      adsDailyData = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({
          date,
          cost: d.cost || null,
          sales: d.sales || null,
          impressions: d.impressions || null,
          clicks: d.clicks || null,
          purchases: d.purchases || null,
          purchases_new_to_brand: d.purchases_ntb || null,
          acos: d.sales > 0 ? (d.cost / d.sales) * 100 : null,
          roas: d.cost > 0 ? d.sales / d.cost : null,
          cpc: d.clicks > 0 ? d.cost / d.clicks : null,
          ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : null,
          cost_per_purchase: d.purchases > 0 ? d.cost / d.purchases : null,
        }))

      const adsSum = Object.values(byDate).reduce(
        (acc, d) => ({
          cost: acc.cost + d.cost,
          sales: acc.sales + d.sales,
          impressions: acc.impressions + d.impressions,
          clicks: acc.clicks + d.clicks,
          purchases: acc.purchases + d.purchases,
          purchases_ntb: acc.purchases_ntb + d.purchases_ntb,
        }),
        { cost: 0, sales: 0, impressions: 0, clicks: 0, purchases: 0, purchases_ntb: 0 }
      )
      adsTotals = {
        cost: adsSum.cost || null,
        sales: adsSum.sales || null,
        impressions: adsSum.impressions || null,
        clicks: adsSum.clicks || null,
        purchases: adsSum.purchases || null,
        purchases_new_to_brand: adsSum.purchases_ntb || null,
        acos: adsSum.sales > 0 ? (adsSum.cost / adsSum.sales) * 100 : null,
        roas: adsSum.cost > 0 ? adsSum.sales / adsSum.cost : null,
        cpc: adsSum.clicks > 0 ? adsSum.cost / adsSum.clicks : null,
        ctr: adsSum.impressions > 0 ? (adsSum.clicks / adsSum.impressions) * 100 : null,
        cost_per_purchase: adsSum.purchases > 0 ? adsSum.cost / adsSum.purchases : null,
      }
    }

    // ── 통합 지표 계산 ─────────────────────────────────────────────────
    const organicSales = organicTotals.revenue
    const adSales = adsTotals.sales
    const adCost = adsTotals.cost
    const totalSales = (organicSales ?? 0) + (adSales ?? 0) || null

    const combinedTotals: AmazonCombinedTotals = {
      total_sales: totalSales,
      organic_sales: organicSales,
      ad_sales: adSales,
      ad_cost: adCost,
      tacos: organicSales && organicSales > 0 && adCost != null ? (adCost / organicSales) * 100 : null,
      ad_sales_ratio: totalSales && totalSales > 0 && adSales != null ? (adSales / totalSales) * 100 : null,
      total_orders: organicTotals.purchases,
      total_sessions: organicTotals.impressions,
    }

    const currency = organicCurrency ?? adsCurrency

    return NextResponse.json({
      platform: 'amazon',
      dailyData: organicDailyData,  // 하위호환용
      totals: organicTotals,
      organicDailyData,
      organicTotals,
      adsDailyData,
      adsTotals,
      combinedTotals,
      amazonExtra: { currency },
    })
  } else if (
    accountType === 'qoo10' ||
    accountType === 'qoo10_ads' ||
    accountType === 'qoo10_organic'
  ) {
    // 전달된 accountId로 qoo10_accounts 조회 → 외부 account_id 획득
    const { data: refAcct } = await supabase
      .from('qoo10_accounts')
      .select('account_id, brand_id')
      .eq('id', accountId)
      .single()

    if (!refAcct) {
      return NextResponse.json({ error: '큐텐 계정을 찾을 수 없습니다.' }, { status: 404 })
    }

    const { account_id: externalAccountId, brand_id: bId } = refAcct

    // 같은 account_id의 ads/organic 계정 PK 조회
    const { data: allQoo10Accts } = await supabase
      .from('qoo10_accounts')
      .select('id, account_type')
      .eq('account_id', externalAccountId)
      .eq('brand_id', bId)

    const adsIds = (allQoo10Accts ?? []).filter((a) => a.account_type === 'ads').map((a) => a.id)
    const organicIds = (allQoo10Accts ?? []).filter((a) => a.account_type === 'organic').map((a) => a.id)

    // ── 광고 데이터 조회 ──────────────────────────────────────────────
    let ads_rows: Qoo10AdsStat[] = []
    if (adsIds.length > 0) {
      let adsQuery = supabase
        .from('qoo10_ads_stats')
        .select('*')
        .in('qoo10_account_id', adsIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      if (brandId && brandId !== 'all') adsQuery = adsQuery.eq('brand_id', brandId)
      const { data } = await adsQuery
      ads_rows = (data ?? []) as Qoo10AdsStat[]
    }

    // ── 오가닉 유입자 데이터 조회 ─────────────────────────────────────
    let visitor_rows: Qoo10OrganicVisitorStat[] = []
    if (organicIds.length > 0) {
      let visitorQuery = supabase
        .from('qoo10_organic_visitor_stats')
        .select('*')
        .in('qoo10_account_id', organicIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      if (brandId && brandId !== 'all') visitorQuery = visitorQuery.eq('brand_id', brandId)
      const { data } = await visitorQuery
      visitor_rows = (data ?? []) as Qoo10OrganicVisitorStat[]
    }

    // ── 오가닉 거래 데이터 조회 ───────────────────────────────────────
    let transaction_rows: Qoo10OrganicTransactionStat[] = []
    if (organicIds.length > 0) {
      let txQuery = supabase
        .from('qoo10_organic_transaction_stats')
        .select('*')
        .in('qoo10_account_id', organicIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      if (brandId && brandId !== 'all') txQuery = txQuery.eq('brand_id', brandId)
      const { data } = await txQuery
      transaction_rows = (data ?? []) as Qoo10OrganicTransactionStat[]
    }

    // ── JP 환율 조회 ──────────────────────────────────────────────────
    const monthKeys = new Set<string>()
    const d = new Date(startDate)
    const endD = new Date(endDate)
    while (d <= endD) {
      monthKeys.add(d.toISOString().slice(0, 7))
      d.setMonth(d.getMonth() + 1)
    }
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    const { data: rateRows } = await supabase
      .from('exchange_rates')
      .select('year_month, rate')
      .eq('country', 'jp')
      .in('year_month', Array.from(monthKeys))
      .or(`owner_user_id.eq.${currentUser?.id ?? 'null'},owner_user_id.is.null`)

    const fxRates: Record<string, number> = {}
    for (const r of rateRows ?? []) {
      if (r.year_month && r.rate != null) {
        fxRates[r.year_month] = r.rate
      }
    }

    const hasKrw = monthKeys.size > 0 && Array.from(monthKeys).every((m) => fxRates[m] != null)
    const sortedMonths = Array.from(monthKeys).sort()
    const appliedRate = sortedMonths.length > 0 ? (fxRates[sortedMonths[sortedMonths.length - 1]] ?? null) : null

    // JPY → KRW 환산 헬퍼
    function toKrw(jpy: number, date: string): number | null {
      const rate = fxRates[date.slice(0, 7)]
      return rate != null ? jpy * rate : null
    }

    // ── 오가닉 집계 ───────────────────────────────────────────────────
    // transaction_rows를 날짜별로 집계
    const txByDate = new Map<string, { amount: number; qty: number }>()
    for (const r of transaction_rows) {
      const prev = txByDate.get(r.date) ?? { amount: 0, qty: 0 }
      txByDate.set(r.date, {
        amount: prev.amount + (r.transaction_amount ?? 0),
        qty: prev.qty + (r.transaction_quantity ?? 0),
      })
    }

    // visitor_rows를 날짜별로 맵핑
    const visitorByDate = new Map<string, { visitors: number | null; cart: number | null }>()
    for (const r of visitor_rows) {
      visitorByDate.set(r.date, { visitors: r.visitors, cart: r.add_to_cart })
    }

    const organicDates = Array.from(
      new Set([...txByDate.keys(), ...visitorByDate.keys()])
    ).sort()

    const qoo10OrganicDailyData: Qoo10OrganicSummaryDayData[] = organicDates.map((date) => {
      const tx = txByDate.get(date) ?? { amount: 0, qty: 0 }
      const vis = visitorByDate.get(date) ?? { visitors: null, cart: null }
      const amtKrw = toKrw(tx.amount, date)
      return {
        date,
        visitors: vis.visitors,
        add_to_cart: vis.cart,
        transaction_amount_jpy: tx.amount || null,
        transaction_amount_krw: amtKrw,
        transaction_quantity: tx.qty || null,
        aov_jpy: tx.qty > 0 ? tx.amount / tx.qty : null,
        conversion_rate: (vis.visitors ?? 0) > 0 ? (tx.qty / (vis.visitors ?? 0)) * 100 : null,
        cart_to_purchase_rate: (vis.cart ?? 0) > 0 ? (tx.qty / (vis.cart ?? 1)) * 100 : null,
      }
    })

    const orgSumAmount = organicDates.reduce((s, date) => s + (txByDate.get(date)?.amount ?? 0), 0)
    const orgSumQty = organicDates.reduce((s, date) => s + (txByDate.get(date)?.qty ?? 0), 0)
    const orgSumVisitors = organicDates.reduce((s, date) => s + (visitorByDate.get(date)?.visitors ?? 0), 0)
    const orgSumCart = organicDates.reduce((s, date) => s + (visitorByDate.get(date)?.cart ?? 0), 0)
    const orgSumAmtKrw = hasKrw ? organicDates.reduce((s, date) => {
      const k = toKrw(txByDate.get(date)?.amount ?? 0, date)
      return s + (k ?? 0)
    }, 0) : null

    const qoo10OrganicTotals: Qoo10OrganicSummaryTotals = {
      visitors: orgSumVisitors || null,
      add_to_cart: orgSumCart || null,
      transaction_amount_jpy: orgSumAmount || null,
      transaction_amount_krw: orgSumAmtKrw,
      transaction_quantity: orgSumQty || null,
      aov_jpy: orgSumQty > 0 ? orgSumAmount / orgSumQty : null,
      conversion_rate: orgSumVisitors > 0 ? (orgSumQty / orgSumVisitors) * 100 : null,
      cart_to_purchase_rate: orgSumCart > 0 ? (orgSumQty / orgSumCart) * 100 : null,
    }

    // 상품별 오가닉 매출 TOP 10 (product_name 그룹핑)
    const organicProductMap = new Map<string, { amount: number; qty: number; dates: string[] }>()
    for (const r of transaction_rows) {
      const key = r.product_name ?? '(이름없음)'
      const prev = organicProductMap.get(key) ?? { amount: 0, qty: 0, dates: [] }
      organicProductMap.set(key, {
        amount: prev.amount + (r.transaction_amount ?? 0),
        qty: prev.qty + (r.transaction_quantity ?? 0),
        dates: [...prev.dates, r.date],
      })
    }
    const qoo10OrganicProductBreakdown: Qoo10OrganicProductRow[] = Array.from(organicProductMap.entries())
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 10)
      .map(([product_name, v]) => {
        // 대표 환율: 첫 날짜 사용
        const repDate = v.dates[0] ?? startDate
        const amtKrw = hasKrw ? toKrw(v.amount, repDate) : null
        return {
          product_name,
          transaction_amount_jpy: v.amount || null,
          transaction_amount_krw: amtKrw,
          transaction_quantity: v.qty || null,
          aov_jpy: v.qty > 0 ? v.amount / v.qty : null,
        }
      })

    // ── 광고 집계 ─────────────────────────────────────────────────────
    // 날짜별 집계
    type AdsAgg = { cost: number; sales: number; impressions: number; clicks: number; carts: number; purchases: number }
    const adsByDate = new Map<string, AdsAgg>()
    for (const r of ads_rows) {
      const prev = adsByDate.get(r.date) ?? { cost: 0, sales: 0, impressions: 0, clicks: 0, carts: 0, purchases: 0 }
      adsByDate.set(r.date, {
        cost: prev.cost + (r.cost ?? 0),
        sales: prev.sales + (r.sales ?? 0),
        impressions: prev.impressions + (r.impressions ?? 0),
        clicks: prev.clicks + (r.clicks ?? 0),
        carts: prev.carts + (r.carts ?? 0),
        purchases: prev.purchases + (r.purchases ?? 0),
      })
    }

    const adsDates = Array.from(adsByDate.keys()).sort()

    const qoo10AdsDailyData: Qoo10AdsSummaryDayData[] = adsDates.map((date) => {
      const a = adsByDate.get(date)!
      const costKrw = toKrw(a.cost, date)
      const salesKrw = toKrw(a.sales, date)
      return {
        date,
        cost: a.cost || null,
        sales: a.sales || null,
        impressions: a.impressions || null,
        clicks: a.clicks || null,
        ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : null,
        carts: a.carts || null,
        cart_conversion_rate: a.clicks > 0 ? (a.carts / a.clicks) * 100 : null,
        purchases: a.purchases || null,
        purchase_conversion_rate: a.clicks > 0 ? (a.purchases / a.clicks) * 100 : null,
        roas: a.cost > 0 ? a.sales / a.cost : null,
        cpc: a.clicks > 0 ? a.cost / a.clicks : null,
        cost_per_purchase: a.purchases > 0 ? a.cost / a.purchases : null,
        cost_krw: costKrw,
        sales_krw: salesKrw,
      }
    })

    const adsSum = Array.from(adsByDate.values()).reduce(
      (acc, a) => ({
        cost: acc.cost + a.cost,
        sales: acc.sales + a.sales,
        impressions: acc.impressions + a.impressions,
        clicks: acc.clicks + a.clicks,
        carts: acc.carts + a.carts,
        purchases: acc.purchases + a.purchases,
      }),
      { cost: 0, sales: 0, impressions: 0, clicks: 0, carts: 0, purchases: 0 }
    )
    const adsSumCostKrw = hasKrw ? adsDates.reduce((s, date) => s + (toKrw(adsByDate.get(date)!.cost, date) ?? 0), 0) : null
    const adsSumSalesKrw = hasKrw ? adsDates.reduce((s, date) => s + (toKrw(adsByDate.get(date)!.sales, date) ?? 0), 0) : null

    const qoo10AdsTotals: Qoo10AdsSummaryTotals = {
      cost: adsSum.cost || null,
      sales: adsSum.sales || null,
      impressions: adsSum.impressions || null,
      clicks: adsSum.clicks || null,
      ctr: adsSum.impressions > 0 ? (adsSum.clicks / adsSum.impressions) * 100 : null,
      carts: adsSum.carts || null,
      cart_conversion_rate: adsSum.clicks > 0 ? (adsSum.carts / adsSum.clicks) * 100 : null,
      purchases: adsSum.purchases || null,
      purchase_conversion_rate: adsSum.clicks > 0 ? (adsSum.purchases / adsSum.clicks) * 100 : null,
      roas: adsSum.cost > 0 ? adsSum.sales / adsSum.cost : null,
      cpc: adsSum.clicks > 0 ? adsSum.cost / adsSum.clicks : null,
      cost_per_purchase: adsSum.purchases > 0 ? adsSum.cost / adsSum.purchases : null,
      cost_krw: adsSumCostKrw,
      sales_krw: adsSumSalesKrw,
    }

    // 광고유형(ad_name)별 브레이크다운
    type AdTypeAgg = { cost: number; sales: number; impressions: number; clicks: number; purchases: number; dates: string[] }
    const adTypeMap = new Map<string, AdTypeAgg>()
    for (const r of ads_rows) {
      const key = r.ad_name ?? '기타'
      const prev = adTypeMap.get(key) ?? { cost: 0, sales: 0, impressions: 0, clicks: 0, purchases: 0, dates: [] }
      adTypeMap.set(key, {
        cost: prev.cost + (r.cost ?? 0),
        sales: prev.sales + (r.sales ?? 0),
        impressions: prev.impressions + (r.impressions ?? 0),
        clicks: prev.clicks + (r.clicks ?? 0),
        purchases: prev.purchases + (r.purchases ?? 0),
        dates: [...prev.dates, r.date],
      })
    }
    const qoo10AdTypeBreakdown: Qoo10AdTypeRow[] = Array.from(adTypeMap.entries())
      .sort(([, a], [, b]) => b.cost - a.cost)
      .map(([ad_name, v]) => {
        const repDate = v.dates[0] ?? startDate
        return {
          ad_name,
          cost: v.cost || null,
          sales: v.sales || null,
          roas: v.cost > 0 ? v.sales / v.cost : null,
          impressions: v.impressions || null,
          clicks: v.clicks || null,
          ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : null,
          purchases: v.purchases || null,
          purchase_conversion_rate: v.clicks > 0 ? (v.purchases / v.clicks) * 100 : null,
          cost_krw: hasKrw ? toKrw(v.cost, repDate) : null,
          sales_krw: hasKrw ? toKrw(v.sales, repDate) : null,
        }
      })

    // 상품별(product_code) 광고성과 TOP 10
    type AdsProductAgg = { product_name: string; cost: number; sales: number; purchases: number; dates: string[] }
    const adsProductMap = new Map<string, AdsProductAgg>()
    for (const r of ads_rows) {
      const key = r.product_code ?? '(코드없음)'
      const prev = adsProductMap.get(key) ?? { product_name: r.product_name ?? '', cost: 0, sales: 0, purchases: 0, dates: [] }
      adsProductMap.set(key, {
        product_name: prev.product_name || r.product_name || '',
        cost: prev.cost + (r.cost ?? 0),
        sales: prev.sales + (r.sales ?? 0),
        purchases: prev.purchases + (r.purchases ?? 0),
        dates: [...prev.dates, r.date],
      })
    }
    const qoo10AdsProductBreakdown: Qoo10AdsProductRow[] = Array.from(adsProductMap.entries())
      .sort(([, a], [, b]) => b.cost - a.cost)
      .slice(0, 10)
      .map(([product_code, v]) => {
        const repDate = v.dates[0] ?? startDate
        return {
          product_code,
          product_name: v.product_name,
          cost: v.cost || null,
          sales: v.sales || null,
          roas: v.cost > 0 ? v.sales / v.cost : null,
          purchases: v.purchases || null,
          cost_krw: hasKrw ? toKrw(v.cost, repDate) : null,
          sales_krw: hasKrw ? toKrw(v.sales, repDate) : null,
        }
      })

    // ── 상품명 JP → KO 번역 ─────────────────────────────────────────────
    // 두 breakdown의 product_name을 합쳐 전처리 후 일괄 번역 (Supabase 캐시 활용)
    const allProductNames = [
      ...qoo10OrganicProductBreakdown.map((r) => r.product_name),
      ...qoo10AdsProductBreakdown.map((r) => r.product_name),
    ]
    const uniquePreprocessed = [...new Set(allProductNames.map(preprocessQoo10Name))].filter(Boolean)
    const translationMap = await translateJaToKo(uniquePreprocessed)

    for (const row of qoo10OrganicProductBreakdown) {
      const pre = preprocessQoo10Name(row.product_name)
      row.product_name_ko = (translationMap.get(pre) ?? pre) || null
    }
    for (const row of qoo10AdsProductBreakdown) {
      const pre = preprocessQoo10Name(row.product_name)
      row.product_name_ko = (translationMap.get(pre) ?? pre) || null
    }

    // ── 통합 지표 계산 ─────────────────────────────────────────────────
    const totalSalesJpy = (orgSumAmount || 0) + (adsSum.sales || 0) || null
    const totalSalesKrw = hasKrw
      ? (orgSumAmtKrw ?? 0) + (adsSumSalesKrw ?? 0) || null
      : null

    const qoo10CombinedTotals: Qoo10CombinedTotals = {
      total_sales_jpy: orgSumAmount || null,  // 오가닉 매출 = 전체 매출 (큐텐 특성상)
      total_sales_krw: orgSumAmtKrw,
      total_quantity: orgSumQty || null,
      total_visitors: orgSumVisitors || null,
      overall_conversion_rate: orgSumVisitors > 0 ? (orgSumQty / orgSumVisitors) * 100 : null,
      ad_cost_jpy: adsSum.cost || null,
      ad_cost_krw: adsSumCostKrw,
      overall_roas: adsSum.cost > 0 && orgSumAmount > 0 ? orgSumAmount / adsSum.cost : null,
      tacos: orgSumAmount > 0 && adsSum.cost > 0 ? (adsSum.cost / orgSumAmount) * 100 : null,
      ad_sales_ratio:
        (totalSalesJpy ?? 0) > 0 && adsSum.sales > 0
          ? (adsSum.sales / (totalSalesJpy ?? 1)) * 100
          : null,
    }

    return NextResponse.json({
      platform: 'qoo10',
      dailyData: [],
      totals: buildEmptyTotals(),
      qoo10AdsDailyData,
      qoo10AdsTotals,
      qoo10OrganicDailyData,
      qoo10OrganicTotals,
      qoo10CombinedTotals,
      qoo10AdTypeBreakdown,
      qoo10AdsProductBreakdown,
      qoo10OrganicProductBreakdown,
      qoo10Extra: { fxRates, hasKrw, appliedRate },
    })
  }
}

// 빈 totals 초기값 생성 헬퍼
function buildEmptyTotals(): SummaryTotals {
  return {
    spend: null, revenue: null, purchases: null, clicks: null, impressions: null,
    reach: null, add_to_cart: null, content_views: null, outbound_clicks: null,
    video_views: null, views_2s: null, views_6s: null, views_25pct: null, views_100pct: null,
    roas: null, frequency: null, ctr: null, cpc: null, cpa: null, cpm: null,
    aov: null, purchase_rate: null,
  }
}
