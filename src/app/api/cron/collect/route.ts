import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchMetaStats } from '@/lib/ads/meta'
import { fetchTikTokStats } from '@/lib/ads/tiktok'
import { fetchGmvMaxDailyReport } from '@/lib/tiktok/gmvMax'
import { getTokenForUser } from '@/lib/tokens'
import { format, subDays } from 'date-fns'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function GET(req: NextRequest) {
  // 1. 인증 검증
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. KST 날짜 배열 생성 (어제~7일 전)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const kstToday = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate())
  const dates = Array.from({ length: 7 }, (_, i) =>
    format(subDays(kstToday, i + 1), 'yyyy-MM-dd'),
  )

  let success = 0
  let failed = 0

  // Meta 수집 루프 (owner_user_id별 토큰 사용)
  const { data: metaAccounts } = await supabaseAdmin
    .from('meta_accounts')
    .select('id, brand_id, account_id, owner_user_id')
    .eq('is_active', true)

  for (const account of metaAccounts ?? []) {
    const metaToken = await getTokenForUser('meta', account.owner_user_id)
    if (!metaToken) {
      console.warn(`[cron/collect] Meta 토큰 없음 (account=${account.id}, owner=${account.owner_user_id}), 스킵`)
      failed++
      continue
    }

    for (const date of dates) {
      try {
        const result = await fetchMetaStats(account.account_id, date, metaToken)
        await delay(200)
        if (result === null) continue

        const { error } = await supabaseAdmin
          .from('meta_daily_stats')
          .upsert(
            {
              meta_account_id: account.id,
              brand_id: account.brand_id,
              date,
              ...result,
            },
            { onConflict: 'meta_account_id,date' },
          )

        if (error) {
          console.error('[cron/collect] meta upsert 오류', error)
          failed++
        } else {
          success++
        }
      } catch (err) {
        console.error('[cron/collect] meta 수집 오류', { account: account.id, date, err })
        failed++
      }
    }
  }

  // TikTok 수집 루프 (owner_user_id별 토큰 사용)
  const { data: tiktokAccounts } = await supabaseAdmin
    .from('tiktok_accounts')
    .select('id, brand_id, advertiser_id, owner_user_id, store_id')
    .eq('is_active', true)

  for (const account of tiktokAccounts ?? []) {
    const tiktokToken = await getTokenForUser('tiktok', account.owner_user_id)
    if (!tiktokToken) {
      console.warn(`[cron/collect] TikTok 토큰 없음 (account=${account.id}, owner=${account.owner_user_id}), 스킵`)
      failed++
      continue
    }

    for (const date of dates) {
      try {
        const result = await fetchTikTokStats(account.advertiser_id, date, tiktokToken)
        await delay(200)
        if (result === null) continue

        const { error } = await supabaseAdmin
          .from('tiktok_daily_stats')
          .upsert(
            {
              tiktok_account_id: account.id,
              brand_id: account.brand_id,
              date,
              ...result,
            },
            { onConflict: 'tiktok_account_id,date' },
          )

        if (error) {
          console.error('[cron/collect] tiktok upsert 오류', error)
          failed++
        } else {
          success++
        }
      } catch (err) {
        console.error('[cron/collect] tiktok 수집 오류', { account: account.id, date, err })
        failed++
      }
    }

    // store_id가 있는 계정은 GMV Max 데이터도 수집
    if (account.store_id) {
      try {
        const apiRows = await fetchGmvMaxDailyReport({
          advertiser_id: account.advertiser_id,
          access_token: tiktokToken,
          store_ids: [account.store_id],
          start_date: dates[dates.length - 1], // 7일 전
          end_date: dates[0],                  // 어제
        })

        // 날짜별로 캠페인 행을 합산 (캠페인×날짜 → 날짜별 1행)
        const byDate: Record<string, { cost: number; gross_revenue: number; orders: number }> = {}
        for (const r of apiRows) {
          if (!r.date) continue
          if (!byDate[r.date]) byDate[r.date] = { cost: 0, gross_revenue: 0, orders: 0 }
          byDate[r.date].cost += r.cost ?? 0
          byDate[r.date].gross_revenue += r.gross_revenue ?? 0
          byDate[r.date].orders += r.orders ?? 0
        }

        const upsertRows = Object.entries(byDate).map(([date, agg]) => ({
          tiktok_account_id: account.id,
          brand_id: account.brand_id,
          date,
          cost: agg.cost,
          gross_revenue: agg.gross_revenue,
          roi: agg.cost > 0 ? agg.gross_revenue / agg.cost : null,
          orders: agg.orders,
          cost_per_order: agg.orders > 0 ? agg.cost / agg.orders : null,
        }))

        if (upsertRows.length > 0) {
          const { error } = await supabaseAdmin
            .from('gmv_max_daily_stats')
            .upsert(upsertRows, { onConflict: 'tiktok_account_id,date' })

          if (error) {
            console.error('[cron/collect] gmv_max upsert 오류', error)
            failed++
          } else {
            success += upsertRows.length
          }
        }
      } catch (err) {
        console.error('[cron/collect] GMV Max 수집 오류', { account: account.id, err })
        failed++
      }
    }
  }

  // 6. 결과 반환
  return NextResponse.json({ success, failed })
}
