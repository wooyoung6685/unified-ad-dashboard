import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchStats as fetchMetaStats } from '@/lib/meta/fetchStats'
import { fetchStats as fetchTiktokStats } from '@/lib/tiktok/fetchStats'
import { eachDayOfInterval, format, differenceInDays, parseISO } from 'date-fns'
import { NextRequest } from 'next/server'

export const maxDuration = 300

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { platform, accountId, startDate, endDate } = body as {
    platform: 'meta' | 'tiktok' | 'all'
    accountId: string
    startDate: string
    endDate: string
  }

  // 날짜 범위 검증
  const start = parseISO(startDate)
  const end = parseISO(endDate)

  if (start > end) {
    return new Response(
      JSON.stringify({ error: 'startDate는 endDate보다 이전이어야 합니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (differenceInDays(end, start) > 30) {
    return new Response(
      JSON.stringify({ error: '날짜 범위는 최대 30일입니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // global_settings 조회
  const { data: settings } = await supabaseAdmin
    .from('global_settings')
    .select('platform, access_token')
    .in('platform', ['meta', 'tiktok'])

  const metaToken =
    settings?.find((s) => s.platform === 'meta')?.access_token ?? null
  const tiktokToken =
    settings?.find((s) => s.platform === 'tiktok')?.access_token ?? null

  // 대상 계정 목록 조회
  type MetaAccount = { id: string; brand_id: string; account_id: string }
  type TiktokAccount = { id: string; brand_id: string; advertiser_id: string }

  let metaAccounts: MetaAccount[] = []
  let tiktokAccounts: TiktokAccount[] = []

  if ((platform === 'meta' || platform === 'all') && metaToken) {
    let query = supabaseAdmin
      .from('meta_accounts')
      .select('id, brand_id, account_id')
      .eq('is_active', true)

    if (accountId !== 'all') {
      query = query.eq('id', accountId)
    }

    const { data } = await query
    metaAccounts = (data ?? []) as MetaAccount[]
  }

  if ((platform === 'tiktok' || platform === 'all') && tiktokToken) {
    let query = supabaseAdmin
      .from('tiktok_accounts')
      .select('id, brand_id, advertiser_id')
      .eq('is_active', true)

    if (accountId !== 'all') {
      query = query.eq('id', accountId)
    }

    const { data } = await query
    tiktokAccounts = (data ?? []) as TiktokAccount[]
  }

  // 날짜 배열 생성
  const dates = eachDayOfInterval({ start, end }).map((d) =>
    format(d, 'yyyy-MM-dd'),
  )

  const total =
    (metaAccounts.length + tiktokAccounts.length) * dates.length
  let current = 0
  let successCount = 0
  let failCount = 0

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          )
        } catch {
          // 클라이언트 연결 끊김 무시
        }
      }

      // Meta 수집 루프
      for (const account of metaAccounts) {
        for (const date of dates) {
          current++
          try {
            const result = await fetchMetaStats({
              account_id: account.account_id,
              access_token: metaToken!,
              date,
            })
            await delay(200)

            if (result !== null) {
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
                failCount++
                send({
                  total,
                  current,
                  status: 'failed',
                  date,
                  platform: 'meta',
                  accountId: account.id,
                  error: error.message,
                })
              } else {
                successCount++
                send({
                  total,
                  current,
                  status: 'success',
                  date,
                  platform: 'meta',
                  accountId: account.id,
                })
              }
            } else {
              // 데이터 없음 = 성공으로 처리 (광고 미집행일)
              successCount++
              send({
                total,
                current,
                status: 'success',
                date,
                platform: 'meta',
                accountId: account.id,
              })
            }
          } catch (err) {
            failCount++
            send({
              total,
              current,
              status: 'failed',
              date,
              platform: 'meta',
              accountId: account.id,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
      }

      // TikTok 수집 루프
      for (const account of tiktokAccounts) {
        for (const date of dates) {
          current++
          try {
            const result = await fetchTiktokStats({
              advertiser_id: account.advertiser_id,
              access_token: tiktokToken!,
              date,
            })
            await delay(500)

            if (result !== null) {
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
                failCount++
                send({
                  total,
                  current,
                  status: 'failed',
                  date,
                  platform: 'tiktok',
                  accountId: account.id,
                  error: error.message,
                })
              } else {
                successCount++
                send({
                  total,
                  current,
                  status: 'success',
                  date,
                  platform: 'tiktok',
                  accountId: account.id,
                })
              }
            } else {
              successCount++
              send({
                total,
                current,
                status: 'success',
                date,
                platform: 'tiktok',
                accountId: account.id,
              })
            }
          } catch (err) {
            failCount++
            send({
              total,
              current,
              status: 'failed',
              date,
              platform: 'tiktok',
              accountId: account.id,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
      }

      // 완료 이벤트
      send({ type: 'complete', totalDays: dates.length, successCount, failCount })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
