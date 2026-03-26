import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// 임시 디버그용 — Meta API 원본 JSON 확인
// GET /api/admin/debug/meta?account_id=<id>&date=2026-02-01
// GET /api/admin/debug/meta?action=creative_debug&account_id=<id>&since=YYYY-MM-DD&until=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  const account_id = req.nextUrl.searchParams.get('account_id')

  if (action === 'creative_debug') {
    return handleCreativeDebug(req, account_id)
  }

  const date = req.nextUrl.searchParams.get('date')

  if (!account_id || !date) {
    return NextResponse.json(
      { error: 'account_id, date 파라미터가 필요합니다.' },
      { status: 400 },
    )
  }

  // global_settings에서 meta 토큰 조회
  const { data: settings } = await supabaseAdmin
    .from('global_settings')
    .select('access_token')
    .eq('platform', 'meta')
    .single()

  const access_token = settings?.access_token
  if (!access_token) {
    return NextResponse.json({ error: 'Meta 토큰이 없습니다.' }, { status: 400 })
  }

  const fields = [
    'spend',
    'impressions',
    'reach',
    'frequency',
    'clicks',
    'cpm',
    'ctr',
    'cpc',
    'actions',
    'action_values',
    'catalog_segment_actions',
    'catalog_segment_value',
    'cost_per_action_type',
  ].join(',')

  const searchParams = new URLSearchParams({
    fields,
    time_range: JSON.stringify({ since: date, until: date }),
    level: 'account',
    time_increment: '1',
    use_account_attribution_setting: 'true',
    access_token,
  })

  const url = `https://graph.facebook.com/v21.0/act_${account_id}/insights?${searchParams.toString()}`

  const res = await fetch(url)
  const raw = await res.json()

  return NextResponse.json({ url: url.replace(access_token, '***TOKEN***'), raw })
}

async function handleCreativeDebug(req: NextRequest, account_id: string | null) {
  const since = req.nextUrl.searchParams.get('since')
  const until = req.nextUrl.searchParams.get('until')

  if (!account_id || !since || !until) {
    return NextResponse.json(
      { error: 'account_id, since, until 파라미터가 필요합니다.' },
      { status: 400 },
    )
  }

  // global_settings에서 meta 토큰 조회
  const { data: settings } = await supabaseAdmin
    .from('global_settings')
    .select('access_token')
    .eq('platform', 'meta')
    .single()

  const access_token = settings?.access_token
  if (!access_token) {
    return NextResponse.json({ error: 'Meta 토큰이 없습니다.' }, { status: 400 })
  }

  // 1. ad 레벨 insights 조회 (샘플 5개)
  const insightsParams = new URLSearchParams({
    fields: 'ad_id,ad_name',
    time_range: JSON.stringify({ since, until }),
    level: 'ad',
    limit: '5',
    access_token,
  })
  const insightsUrl = `https://graph.facebook.com/v21.0/act_${account_id}/insights?${insightsParams.toString()}`
  const insightsRes = await fetch(insightsUrl)
  const insightsData = await insightsRes.json()

  const adInsights: { ad_id: string; ad_name: string }[] = insightsData.data ?? []

  // 2. 각 ad의 creative 및 video thumbnail 조회
  const ads = await Promise.all(
    adInsights.map(async ({ ad_id, ad_name }) => {
      // creative 정보 조회
      const creativeParams = new URLSearchParams({
        fields:
          'creative{image_hash,image_url,thumbnail_url,object_story_spec{link_data{image_hash,picture,full_picture,child_attachments{image_hash,picture}},video_data{image_url},photo_data{picture}},asset_feed_spec{images{url},videos{thumbnail_url}}}',
        access_token,
      })
      const creativeRes = await fetch(
        `https://graph.facebook.com/v21.0/${ad_id}?${creativeParams.toString()}`,
      )
      const creativeData = await creativeRes.json()
      const creative = creativeData.creative ?? {}

      const result: {
        ad_id: string
        ad_name: string
        creative: {
          image_hash?: string
          image_url?: string
          thumbnail_url?: string
          object_story_spec?: unknown
          asset_feed_spec?: unknown
        }
        image_from_hash?: string | null
        image_128_from_hash?: string | null
        image_permalink?: string | null
        video_data_image_url?: string | null
        link_data_full_picture?: string | null
        asset_feed_image?: string | null
        full_picture?: string | null
        post_media?: unknown
      } = {
        ad_id,
        ad_name,
        creative: {
          image_hash: creative.image_hash,
          image_url: creative.image_url,
          thumbnail_url: creative.thumbnail_url,
          object_story_spec: creative.object_story_spec,
          asset_feed_spec: creative.asset_feed_spec,
        },
        video_data_image_url: creative.object_story_spec?.video_data?.image_url ?? null,
        link_data_full_picture: creative.object_story_spec?.link_data?.full_picture ?? null,
        asset_feed_image: creative.asset_feed_spec?.images?.[0]?.url ?? null,
      }

      // Option 1: image_hash가 있으면 adimages API로 원본 이미지 조회
      if (creative.image_hash) {
        const imagesParams = new URLSearchParams({
          hashes: JSON.stringify([creative.image_hash]),
          fields: 'hash,url,permalink_url',
          access_token,
        })
        const imagesRes = await fetch(
          `https://graph.facebook.com/v21.0/act_${account_id}/adimages?${imagesParams}`,
        )
        const imagesData = await imagesRes.json()
        result.image_from_hash = imagesData.data?.[0]?.url ?? null
        result.image_128_from_hash = imagesData.data?.[0]?.url_128 ?? null
        result.image_permalink = imagesData.data?.[0]?.permalink_url ?? null
      }

      // Option 2: effective_object_story_id가 있으면 page post에서 full_picture 조회
      if (creative.effective_object_story_id) {
        const postParams = new URLSearchParams({
          fields: 'full_picture,attachments{media}',
          access_token,
        })
        const postRes = await fetch(
          `https://graph.facebook.com/v21.0/${creative.effective_object_story_id}?${postParams}`,
        )
        const postData = await postRes.json()
        result.full_picture = postData.full_picture ?? null
        result.post_media = postData.attachments?.data?.[0]?.media ?? null
      }

      return result
    }),
  )

  return NextResponse.json({ ads })
}
