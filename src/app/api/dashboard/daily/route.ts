import { fetchGmvMaxDailyReport } from '@/lib/tiktok/gmvMax'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTokenForCurrentUser } from '@/lib/tokens'
import type { ShopeeInappStat, ShopeeInappDayRow, ShopeeShoppingStat } from '@/types/database'
import { NextRequest, NextResponse } from 'next/server'

// 인앱 stats를 날짜별로 합산
function aggregateInappByDate(rows: ShopeeInappStat[]): ShopeeInappDayRow[] {
  const byDate: Record<string, ShopeeInappStat[]> = {}
  for (const row of rows) {
    if (!byDate[row.date]) byDate[row.date] = []
    byDate[row.date].push(row)
  }

  return Object.entries(byDate)
    .map(([date, dayRows]) => {
      const impressions = dayRows.reduce((s, r) => s + (r.impressions ?? 0), 0)
      const clicks = dayRows.reduce((s, r) => s + (r.clicks ?? 0), 0)
      const conversions = dayRows.reduce((s, r) => s + (r.conversions ?? 0), 0)
      const directConversions = dayRows.reduce((s, r) => s + (r.direct_conversions ?? 0), 0)
      const itemsSold = dayRows.reduce((s, r) => s + (r.items_sold ?? 0), 0)
      const directItemsSold = dayRows.reduce((s, r) => s + (r.direct_items_sold ?? 0), 0)
      const gmv = dayRows.reduce((s, r) => s + (r.gmv ?? 0), 0)
      const directGmv = dayRows.reduce((s, r) => s + (r.direct_gmv ?? 0), 0)
      const expense = dayRows.reduce((s, r) => s + (r.expense ?? 0), 0)

      // KRW 집계 (하나라도 null이 아닌 값이 있으면 합산, 전부 null이면 null)
      const hasKrw = dayRows.some((r) => r.gmv_krw != null)
      const gmvKrw = hasKrw ? dayRows.reduce((s, r) => s + (r.gmv_krw ?? 0), 0) : null
      const directGmvKrw = hasKrw ? dayRows.reduce((s, r) => s + (r.direct_gmv_krw ?? 0), 0) : null
      const expenseKrw = hasKrw ? dayRows.reduce((s, r) => s + (r.expense_krw ?? 0), 0) : null

      return {
        date,
        currency: dayRows[0]?.currency ?? null,
        impressions,
        clicks,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
        conversions,
        direct_conversions: directConversions,
        conversion_rate: clicks > 0 ? (conversions / clicks) * 100 : null,
        direct_conversion_rate: clicks > 0 ? (directConversions / clicks) * 100 : null,
        cost_per_conversion: conversions > 0 ? expense / conversions : null,
        cost_per_conversion_krw: conversions > 0 && expenseKrw != null ? expenseKrw / conversions : null,
        cost_per_direct_conversion: directConversions > 0 ? expense / directConversions : null,
        cost_per_direct_conversion_krw:
          directConversions > 0 && expenseKrw != null ? expenseKrw / directConversions : null,
        items_sold: itemsSold,
        direct_items_sold: directItemsSold,
        gmv,
        gmv_krw: gmvKrw,
        direct_gmv: directGmv,
        direct_gmv_krw: directGmvKrw,
        expense,
        expense_krw: expenseKrw,
        roas: expense > 0 ? gmv / expense : null,
        direct_roas: expense > 0 ? directGmv / expense : null,
        acos: gmv > 0 ? (expense / gmv) * 100 : null,
        direct_acos: directGmv > 0 ? (expense / directGmv) * 100 : null,
      } satisfies ShopeeInappDayRow
    })
    .sort((a, b) => a.date.localeCompare(b.date))
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
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
  }

  const supabase = await createClient()

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ platform: 'meta', rows: data ?? [] })
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 해당 계정의 store_id 조회 (GMV Max 데이터 유무 판단)
    const { data: tiktokAcct } = await supabase
      .from('tiktok_accounts')
      .select('store_id')
      .eq('id', accountId)
      .single()

    const storeId = tiktokAcct?.store_id ?? null

    // store_id가 있으면 GMV Max 데이터 조회 (DB 캐시 우선, 없으면 API 호출 후 저장)
    let gmvMaxRows = null
    if (storeId) {
      try {
        // 1. DB 캐시 확인
        const { data: cached } = await supabase
          .from('gmv_max_daily_stats')
          .select('date, cost, gross_revenue, roi, orders, cost_per_order')
          .eq('tiktok_account_id', accountId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true })

        // 캐시된 데이터 중 최대 날짜가 요청 endDate 이상이어야 완전 캐시 히트
        const maxCachedDate =
          cached && cached.length > 0
            ? cached.reduce((max, r) => (r.date > max ? r.date : max), '')
            : ''
        if (cached && cached.length > 0 && maxCachedDate >= endDate) {
          // 캐시 히트: GmvMaxDailyRow 형태로 변환
          gmvMaxRows = cached.map((r) => ({
            date: r.date as string,
            campaign_id: null,
            campaign_name: null,
            cost: r.cost as number | null,
            gross_revenue: r.gross_revenue as number | null,
            roi: r.roi as number | null,
            orders: r.orders as number | null,
            cost_per_order: r.cost_per_order as number | null,
          }))
        } else {
          // 2. 캐시 미스: TikTok API 호출
          const tiktokToken = await getTokenForCurrentUser('tiktok')

          const { data: acctInfo } = await supabase
            .from('tiktok_accounts')
            .select('advertiser_id, brand_id')
            .eq('id', accountId)
            .single()

          if (tiktokToken && acctInfo?.advertiser_id) {
            const apiRows = await fetchGmvMaxDailyReport({
              advertiser_id: acctInfo.advertiser_id,
              access_token: tiktokToken,
              store_ids: [storeId],
              start_date: startDate,
              end_date: endDate,
            })

            // 3. 날짜별 합산 후 DB에 upsert
            const byDate: Record<string, { cost: number; gross_revenue: number; orders: number }> = {}
            for (const r of apiRows) {
              if (!byDate[r.date]) byDate[r.date] = { cost: 0, gross_revenue: 0, orders: 0 }
              byDate[r.date].cost += r.cost ?? 0
              byDate[r.date].gross_revenue += r.gross_revenue ?? 0
              byDate[r.date].orders += r.orders ?? 0
            }

            const upsertRows = Object.entries(byDate).map(([date, agg]) => ({
              tiktok_account_id: accountId,
              brand_id: acctInfo.brand_id,
              date,
              cost: agg.cost,
              gross_revenue: agg.gross_revenue,
              roi: agg.cost > 0 ? agg.gross_revenue / agg.cost : null,
              orders: agg.orders,
              // cost_per_order는 합산 후 재계산 (API 값의 단순 평균 방지)
              cost_per_order: agg.orders > 0 ? agg.cost / agg.orders : null,
            }))

            if (upsertRows.length > 0) {
              await supabaseAdmin
                .from('gmv_max_daily_stats')
                .upsert(upsertRows, { onConflict: 'tiktok_account_id,date' })
            }

            gmvMaxRows = apiRows
          }
        }
      } catch (err) {
        console.error('[GMV Max] 일별 리포트 조회 실패:', err)
        // 실패해도 기존 tiktok 데이터는 반환
      }
    }

    return NextResponse.json({ platform: 'tiktok', rows: data ?? [], gmvMaxRows })
  } else if (accountType === 'shopee') {
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

    const shoppingIds = (allShopeeAccts ?? []).filter((a) => a.account_type === 'shopping').map((a) => a.id)
    const inappIds = (allShopeeAccts ?? []).filter((a) => a.account_type === 'inapp').map((a) => a.id)

    // 쇼핑몰 데이터 조회
    let shopping_rows: ShopeeShoppingStat[] = []
    if (shoppingIds.length > 0) {
      let shopQuery = supabase
        .from('shopee_shopping_stats')
        .select('*')
        .in('shopee_account_id', shoppingIds)
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
      const metaAccountIds = (metaAccts ?? []).map((a) => a.id)

      if (metaAccountIds.length > 0) {
        const { data: metaStats } = await supabase
          .from('meta_daily_stats')
          .select('date, spend')
          .in('meta_account_id', metaAccountIds)
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

      shopping_rows = shopRows.map((row) => ({
        ...row,
        spend_krw: spendByDate[row.date] ?? null,
      })) as ShopeeShoppingStat[]
    }

    // 인앱 데이터 조회
    let inapp_rows: ShopeeInappDayRow[] = []
    if (inappIds.length > 0) {
      let inappQuery = supabase
        .from('shopee_inapp_stats')
        .select('*')
        .in('shopee_account_id', inappIds)
        .gte('date', startDate)
        .lte('date', endDate)
      if (brandId && brandId !== 'all') inappQuery = inappQuery.eq('brand_id', brandId)

      const { data: inappData } = await inappQuery
      inapp_rows = aggregateInappByDate((inappData ?? []) as ShopeeInappStat[])
    }

    return NextResponse.json({ platform: 'shopee', shopping_rows, inapp_rows })
  }
}
