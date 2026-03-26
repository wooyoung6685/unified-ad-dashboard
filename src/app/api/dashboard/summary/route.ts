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
  purchases: number | null
) {
  const roas =
    spend && revenue && spend > 0 ? (revenue / spend) * 100 : null
  const frequency =
    impressions && reach && reach > 0 ? impressions / reach : null
  const ctr =
    clicks && impressions && impressions > 0
      ? (clicks / impressions) * 100
      : null
  const cpc = spend && clicks && clicks > 0 ? spend / clicks : null
  const cpa = spend && purchases && purchases > 0 ? spend / purchases : null
  return { roas, frequency, ctr, cpc, cpa }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const brandId = searchParams.get('brand_id') ?? ''
  const accountId = searchParams.get('account_id') ?? ''
  const accountType = searchParams.get('account_type') as
    | 'meta'
    | 'tiktok'
    | 'shopee_shopping'
    | 'shopee_inapp'
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
        add_to_cart: r.add_to_cart ?? null,
        video_views: null, // Meta는 항상 null
        views_2s: null,
        views_6s: null,
        views_100pct: null,
        aov: null,
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
      }),
      {
        spend: 0,
        revenue: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        purchases: 0,
        add_to_cart: 0,
      }
    )

    const totals: SummaryTotals = {
      ...sum,
      video_views: null, // Meta는 항상 null
      views_2s: null,
      views_6s: null,
      views_100pct: null,
      aov: null,
      ...calcMetrics(
        sum.spend || null,
        sum.revenue || null,
        sum.impressions || null,
        sum.reach || null,
        sum.clicks || null,
        sum.purchases || null
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
        video_views: (r as any).video_views ?? null,
        views_2s: (r as any).views_2s ?? null,
        views_6s: (r as any).views_6s ?? null,
        views_100pct: (r as any).views_100pct ?? null,
        aov: null,
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
        views_100pct: 0,
      }
    )

    const totals: SummaryTotals = {
      ...sum,
      add_to_cart: null, // TikTok은 항상 null
      aov: null,
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
  } else if (accountType === 'shopee_shopping') {
    let query = supabase
      .from('shopee_shopping_stats')
      .select('date, sales_krw, sales, orders, product_clicks, visitors, currency')
      .eq('shopee_account_id', accountId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (brandId && brandId !== 'all') {
      query = query.eq('brand_id', brandId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []

    // spend_krw 계산: daily route와 동일하게 Meta + 인앱 데이터 조인
    const spendByDate: Record<string, number> = {}
    const { data: shopAcct } = await supabase
      .from('shopee_accounts')
      .select('brand_id, country, sub_brand')
      .eq('id', accountId)
      .single()

    if (shopAcct) {
      const { brand_id: bId, country: bCountry, sub_brand: bSubBrand } = shopAcct

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

      let inappAcctQuery = supabase
        .from('shopee_accounts')
        .select('id')
        .eq('brand_id', bId)
        .eq('country', bCountry)
        .eq('account_type', 'inapp')
      inappAcctQuery =
        bSubBrand === null
          ? inappAcctQuery.is('sub_brand', null)
          : inappAcctQuery.eq('sub_brand', bSubBrand)
      const { data: inappAccts } = await inappAcctQuery
      const inappIds = (inappAccts ?? []).map((a) => a.id)

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

      if (inappIds.length > 0) {
        const { data: inappStats } = await supabase
          .from('shopee_inapp_stats')
          .select('date, expense_krw')
          .in('shopee_account_id', inappIds)
          .gte('date', startDate)
          .lte('date', endDate)
        for (const s of inappStats ?? []) {
          if (s.expense_krw != null) {
            spendByDate[s.date] = (spendByDate[s.date] ?? 0) + s.expense_krw
          }
        }
      }
    }

    // KRW 환산 가능 여부 판정
    const hasKrw = rows.some((r) => r.sales_krw != null)

    // spend = spend_krw, revenue = sales_krw (없으면 현지통화 sales로 fallback)
    // purchases = orders, clicks = product_clicks, impressions = visitors
    const dailyData: SummaryDayData[] = rows.map((r) => {
      const spend = spendByDate[r.date] ?? null
      const revenue = hasKrw ? ((r.sales_krw as number | null) ?? null) : ((r.sales as number | null) ?? null)
      const purchases = (r.orders as number | null) ?? null
      const clicks = (r.product_clicks as number | null) ?? null
      const impressions = (r.visitors as number | null) ?? null
      // 전환율: orders / visitors * 100
      const ctr = impressions && purchases && impressions > 0 ? (purchases / impressions) * 100 : null
      const roas = spend && revenue && spend > 0 ? (revenue / spend) * 100 : null
      const cpc = spend && clicks && clicks > 0 ? spend / clicks : null
      const aov = revenue != null && purchases && purchases > 0 ? revenue / purchases : null
      return {
        date: r.date,
        spend,
        revenue,
        purchases,
        clicks,
        impressions,
        reach: null,
        add_to_cart: null,
        video_views: null,
        views_2s: null,
        views_6s: null,
        views_100pct: null,
        roas,
        frequency: null,
        ctr,
        cpc,
        cpa: null,
        aov,
      }
    })

    const sum = rows.reduce(
      (acc, r) => ({
        spend: acc.spend + (spendByDate[r.date] ?? 0),
        revenue: acc.revenue + (hasKrw ? ((r.sales_krw as number | null) ?? 0) : ((r.sales as number | null) ?? 0)),
        purchases: acc.purchases + ((r.orders as number | null) ?? 0),
        clicks: acc.clicks + ((r.product_clicks as number | null) ?? 0),
        impressions: acc.impressions + ((r.visitors as number | null) ?? 0),
      }),
      { spend: 0, revenue: 0, purchases: 0, clicks: 0, impressions: 0 }
    )

    const roas = sum.spend > 0 ? (sum.revenue / sum.spend) * 100 : null
    const ctr = sum.impressions > 0 ? (sum.purchases / sum.impressions) * 100 : null
    const cpc = sum.clicks > 0 ? sum.spend / sum.clicks : null
    const aov = sum.purchases > 0 ? sum.revenue / sum.purchases : null

    const totals: SummaryTotals = {
      spend: sum.spend || null,
      revenue: sum.revenue || null,
      purchases: sum.purchases || null,
      clicks: sum.clicks || null,
      impressions: sum.impressions || null,
      reach: null,
      add_to_cart: null,
      video_views: null,
      views_2s: null,
      views_6s: null,
      views_100pct: null,
      roas,
      frequency: null,
      ctr,
      cpc,
      cpa: null,
      aov,
    }

    const currency = (rows[0]?.currency as string | null) ?? null
    return NextResponse.json({ platform: 'shopee_shopping', dailyData, totals, shopeeExtra: { currency, hasKrw } })
  } else {
    // shopee_inapp
    let query = supabase
      .from('shopee_inapp_stats')
      .select('date, impressions, clicks, conversions, gmv, gmv_krw, expense, expense_krw, currency')
      .eq('shopee_account_id', accountId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (brandId && brandId !== 'all') {
      query = query.eq('brand_id', brandId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []

    // KRW 환산 가능 여부 판정
    const hasKrw = rows.some((r) => r.expense_krw != null)
    const currency = (rows[0]?.currency as string | null) ?? null

    // 날짜별 합산 (ads_type 복수 행)
    const byDate: Record<string, { impressions: number; clicks: number; conversions: number; gmv: number; gmv_krw: number | null; expense: number; expense_krw: number | null }> = {}
    for (const r of rows) {
      if (!byDate[r.date]) {
        byDate[r.date] = { impressions: 0, clicks: 0, conversions: 0, gmv: 0, gmv_krw: null, expense: 0, expense_krw: null }
      }
      const d = byDate[r.date]
      d.impressions += (r.impressions as number | null) ?? 0
      d.clicks += (r.clicks as number | null) ?? 0
      d.conversions += (r.conversions as number | null) ?? 0
      d.gmv += (r.gmv as number | null) ?? 0
      d.expense += (r.expense as number | null) ?? 0
      if (r.gmv_krw != null) d.gmv_krw = (d.gmv_krw ?? 0) + (r.gmv_krw as number)
      if (r.expense_krw != null) d.expense_krw = (d.expense_krw ?? 0) + (r.expense_krw as number)
    }

    // spend = expense_krw (없으면 expense), revenue = gmv_krw (없으면 gmv), purchases = conversions
    const dailyData: SummaryDayData[] = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => {
        const spend = hasKrw ? d.expense_krw : (d.expense || null)
        const revenue = hasKrw ? d.gmv_krw : (d.gmv || null)
        const purchases = d.conversions || null
        const clicks = d.clicks || null
        const impressions = d.impressions || null
        const roas = spend && revenue && spend > 0 ? (revenue / spend) * 100 : null
        const ctr = clicks && impressions && impressions > 0 ? (clicks / impressions) * 100 : null
        const cpc = spend && clicks && clicks > 0 ? spend / clicks : null
        const cpa = spend && purchases && purchases > 0 ? spend / purchases : null
        const conversion_rate = clicks && purchases && clicks > 0 ? (purchases / clicks) * 100 : null
        return {
          date,
          spend,
          revenue,
          purchases,
          clicks,
          impressions,
          reach: null,
          add_to_cart: null,
          video_views: null,
          views_2s: null,
          views_6s: null,
          views_100pct: null,
          roas,
          frequency: null,
          ctr,
          cpc,
          cpa,
          aov: null,
          conversion_rate,
        }
      })

    const sumRaw = Object.values(byDate).reduce(
      (acc, d) => ({
        spend: acc.spend + (hasKrw ? (d.expense_krw ?? 0) : d.expense),
        revenue: acc.revenue + (hasKrw ? (d.gmv_krw ?? 0) : d.gmv),
        purchases: acc.purchases + d.conversions,
        clicks: acc.clicks + d.clicks,
        impressions: acc.impressions + d.impressions,
      }),
      { spend: 0, revenue: 0, purchases: 0, clicks: 0, impressions: 0 }
    )

    const roas = sumRaw.spend > 0 ? (sumRaw.revenue / sumRaw.spend) * 100 : null
    const ctr = sumRaw.impressions > 0 ? (sumRaw.clicks / sumRaw.impressions) * 100 : null
    const cpc = sumRaw.clicks > 0 ? sumRaw.spend / sumRaw.clicks : null
    const cpa = sumRaw.purchases > 0 ? sumRaw.spend / sumRaw.purchases : null
    const conversion_rate = sumRaw.clicks > 0 ? (sumRaw.purchases / sumRaw.clicks) * 100 : null

    const totals: SummaryTotals = {
      spend: sumRaw.spend || null,
      revenue: sumRaw.revenue || null,
      purchases: sumRaw.purchases || null,
      clicks: sumRaw.clicks || null,
      impressions: sumRaw.impressions || null,
      reach: null,
      add_to_cart: null,
      video_views: null,
      views_2s: null,
      views_6s: null,
      views_100pct: null,
      roas,
      frequency: null,
      ctr,
      cpc,
      cpa,
      aov: null,
      conversion_rate,
    }

    return NextResponse.json({ platform: 'shopee_inapp', dailyData, totals, shopeeExtra: { currency, hasKrw } })
  }
}
