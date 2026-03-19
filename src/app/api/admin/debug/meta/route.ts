import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// 임시 디버그용 — Meta API 원본 JSON 확인
// GET /api/admin/debug/meta?account_id=<id>&date=2026-02-01
export async function GET(req: NextRequest) {
  const account_id = req.nextUrl.searchParams.get('account_id')
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
