import { requireAdmin } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTokenForCurrentUser } from '@/lib/tokens'
import { NextRequest, NextResponse } from 'next/server'
import { format, endOfMonth, startOfMonth } from 'date-fns'
import { fetchMetaCreatives } from '@/lib/reports/metaApi'
import { fetchTiktokAdThumbnails } from '@/lib/reports/tiktokApi'
import { fetchOembedData } from '@/lib/tiktok/gmvMax'
import {
  runConcurrent,
  getExistingThumbs,
  uploadThumb,
  uploadTiktokThumb,
  isStorageUrl,
} from '@/lib/reports/thumbnails'
import type { ReportSnapshot, MetaCreativeData, TiktokAdRow, GmvMaxItemRow } from '@/types/database'

// Hobby 플랜 최대 60초
export const maxDuration = 60

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const body = await req.json()
  const section = body?.section as 'meta' | 'tiktok' | 'gmvmax' | undefined
  if (!section || !['meta', 'tiktok', 'gmvmax'].includes(section)) {
    return NextResponse.json({ error: 'section은 meta | tiktok | gmvmax 중 하나여야 합니다.' }, { status: 400 })
  }

  // 리포트 조회 (snapshot 포함)
  const { data: report, error: reportError } = await supabaseAdmin
    .from('reports')
    .select('id, platform, internal_account_id, year, month, snapshot')
    .eq('id', id)
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { platform, internal_account_id, year, month, snapshot } = report as {
    platform: 'meta' | 'shopee_inapp' | 'tiktok' | 'amazon'
    internal_account_id: string | null
    year: number
    month: number
    snapshot: ReportSnapshot | null
  }

  if (!snapshot) {
    return NextResponse.json({ error: '스냅샷이 없습니다. 먼저 스냅샷을 생성해주세요.' }, { status: 400 })
  }

  if (!internal_account_id) {
    return NextResponse.json({ error: '리포트에 연결된 계정이 없습니다.' }, { status: 400 })
  }

  // section↔platform 유효성 검증
  if (section === 'meta' && platform !== 'meta') {
    return NextResponse.json({ error: 'Meta 섹션은 Meta 리포트에서만 복구 가능합니다.' }, { status: 400 })
  }
  if ((section === 'tiktok' || section === 'gmvmax') && platform !== 'tiktok') {
    return NextResponse.json({ error: 'TikTok/GMV Max 섹션은 TikTok 리포트에서만 복구 가능합니다.' }, { status: 400 })
  }

  // 날짜 범위 계산
  const thisMonthBase = new Date(year, month - 1, 1)
  const thisMonthStart = format(thisMonthBase, 'yyyy-MM-dd')
  const thisMonthEnd = format(endOfMonth(thisMonthBase), 'yyyy-MM-dd')

  let updatedCount = 0
  let updatedSnapshot: ReportSnapshot = snapshot

  try {
    if (section === 'meta' && snapshot.platform === 'meta') {
      const { data: metaAccount } = await supabaseAdmin
        .from('meta_accounts')
        .select('account_id')
        .eq('id', internal_account_id)
        .single()

      if (!metaAccount) {
        return NextResponse.json({ error: 'Meta 계정을 찾을 수 없습니다.' }, { status: 404 })
      }

      const accessToken = await getTokenForCurrentUser('meta')
      if (!accessToken) {
        return NextResponse.json({ error: 'Meta 액세스 토큰이 없습니다. 다시 로그인해주세요.' }, { status: 401 })
      }

      // Meta API에서 신규 썸네일 URL 조회
      const freshCreatives = await fetchMetaCreatives(
        metaAccount.account_id,
        accessToken,
        thisMonthStart,
        thisMonthEnd,
      )
      const freshUrlMap = new Map<string, { url: string | null; isFbAdsImage: boolean }>(
        freshCreatives.map((c) => [c.ad_id, { url: c.thumbnail_url, isFbAdsImage: c.is_fb_ads_image ?? false }]),
      )

      const existingPaths = await getExistingThumbs('meta')

      // Storage URL이 아닌 항목만 대상으로 업로드
      const existingCreatives = snapshot.data.creatives as MetaCreativeData[]
      const updatedCreatives = await runConcurrent(existingCreatives, 10, async (c) => {
        if (isStorageUrl(c.thumbnail_url)) return c

        const fresh = freshUrlMap.get(c.ad_id)
        if (!fresh?.url) return c

        const stored = await uploadThumb(
          c.ad_id,
          fresh.url,
          fresh.isFbAdsImage ? accessToken : undefined,
          existingPaths,
        )
        if (stored) {
          updatedCount++
          return { ...c, thumbnail_url: stored }
        }
        return c
      })

      updatedSnapshot = {
        platform: 'meta',
        data: { ...snapshot.data, creatives: updatedCreatives },
      }
    } else if (section === 'tiktok' && snapshot.platform === 'tiktok') {
      const { data: tiktokAccount } = await supabaseAdmin
        .from('tiktok_accounts')
        .select('advertiser_id')
        .eq('id', internal_account_id)
        .single()

      if (!tiktokAccount) {
        return NextResponse.json({ error: 'TikTok 계정을 찾을 수 없습니다.' }, { status: 404 })
      }

      const accessToken = await getTokenForCurrentUser('tiktok')
      if (!accessToken) {
        return NextResponse.json({ error: 'TikTok 액세스 토큰이 없습니다. 다시 로그인해주세요.' }, { status: 401 })
      }

      const existingAds = (snapshot.data.ads ?? []) as TiktokAdRow[]
      const targetAds = existingAds.filter((ad) => !isStorageUrl(ad.thumbnail_url))

      if (targetAds.length > 0) {
        const adIds = targetAds.map((ad) => ad.ad_id)
        const adNameMap = new Map<string, string>(targetAds.map((ad) => [ad.ad_id, ad.ad_name]))

        const thumbnailMap = await fetchTiktokAdThumbnails(
          tiktokAccount.advertiser_id,
          accessToken,
          adIds,
          adNameMap,
        )

        const existingPaths = await getExistingThumbs('tiktok')

        const updatedAds = await runConcurrent(existingAds, 10, async (ad) => {
          if (isStorageUrl(ad.thumbnail_url)) return ad

          const freshUrl = thumbnailMap.get(ad.ad_id)
          if (!freshUrl) return ad

          const stored = await uploadTiktokThumb(ad.ad_id, freshUrl, existingPaths)
          if (stored) {
            updatedCount++
            return { ...ad, thumbnail_url: stored }
          }
          return ad
        })

        updatedSnapshot = {
          platform: 'tiktok',
          data: { ...snapshot.data, ads: updatedAds },
        }
      }
    } else if (section === 'gmvmax' && snapshot.platform === 'tiktok') {
      const existingItems = (snapshot.data.gmvMaxItems ?? []) as GmvMaxItemRow[]
      const targetItems = existingItems.filter((item) => !isStorageUrl(item.thumbnail_url))

      if (targetItems.length > 0) {
        const existingPaths = await getExistingThumbs('tiktok')

        const updatedItems = await runConcurrent(existingItems, 10, async (item) => {
          if (isStorageUrl(item.thumbnail_url)) return item

          const oembed = await fetchOembedData(item.item_id)
          if (!oembed?.thumbnail_url) return item

          const stored = await uploadTiktokThumb(item.item_id, oembed.thumbnail_url, existingPaths)
          if (stored) {
            updatedCount++
            return { ...item, thumbnail_url: stored }
          }
          return item
        })

        updatedSnapshot = {
          platform: 'tiktok',
          data: { ...snapshot.data, gmvMaxItems: updatedItems },
        }
      }
    }
  } catch (err) {
    console.error('[thumbnails repair] 복구 중 오류:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '썸네일 복구 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }

  // 업데이트된 스냅샷 저장
  const { error: updateError } = await supabaseAdmin
    .from('reports')
    .update({ snapshot: updatedSnapshot, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: updatedCount })
}
