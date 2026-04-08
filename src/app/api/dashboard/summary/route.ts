import { createClient } from '@/lib/supabase/server'
import type { GmvMaxSummaryDayData, GmvMaxSummaryTotals, SummaryDayData, SummaryTotals } from '@/types/database'
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
