import { createClient } from '@/lib/supabase/server'
import type { SummaryDayData, SummaryTotals } from '@/types/database'
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
  } else {
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
      ...calcMetrics(
        sum.spend || null,
        sum.revenue || null,
        sum.impressions || null,
        sum.reach || null,
        sum.clicks || null,
        sum.purchases || null
      ),
    }

    return NextResponse.json({ platform: 'tiktok', dailyData, totals })
  }
}
