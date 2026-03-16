import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchMetaStats } from '@/lib/ads/meta'
import { fetchTikTokStats } from '@/lib/ads/tiktok'
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

  // 3. global_settings 조회
  const { data: settings } = await supabaseAdmin
    .from('global_settings')
    .select('platform, access_token')
    .in('platform', ['meta', 'tiktok'])

  const metaToken =
    settings?.find((s) => s.platform === 'meta')?.access_token ?? null
  const tiktokToken =
    settings?.find((s) => s.platform === 'tiktok')?.access_token ?? null

  let success = 0
  let failed = 0

  // 4. Meta 수집 루프
  if (!metaToken) {
    console.warn('[cron/collect] Meta access_token 없음, 수집 스킵')
  } else {
    const { data: metaAccounts } = await supabaseAdmin
      .from('meta_accounts')
      .select('id, brand_id, account_id')
      .eq('is_active', true)

    for (const account of metaAccounts ?? []) {
      for (const date of dates) {
        try {
          const result = await fetchMetaStats(account.account_id, date, metaToken)
          await delay(200)
          if (result === null) continue

          const { error } = await supabaseAdmin
            .from('meta_daily_stats')
            .upsert(
              {
                meta_account_id: account.id, // UUID
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
  }

  // 5. TikTok 수집 루프
  if (!tiktokToken) {
    console.warn('[cron/collect] TikTok access_token 없음, 수집 스킵')
  } else {
    const { data: tiktokAccounts } = await supabaseAdmin
      .from('tiktok_accounts')
      .select('id, brand_id, advertiser_id')
      .eq('is_active', true)

    for (const account of tiktokAccounts ?? []) {
      for (const date of dates) {
        try {
          const result = await fetchTikTokStats(account.advertiser_id, date, tiktokToken)
          await delay(200)
          if (result === null) continue

          const { error } = await supabaseAdmin
            .from('tiktok_daily_stats')
            .upsert(
              {
                tiktok_account_id: account.id, // UUID
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
    }
  }

  // 6. 결과 반환
  return NextResponse.json({ success, failed })
}
