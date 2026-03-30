import { requireAdmin } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET ?year_month=YYYY-MM → 현재 어드민의 해당 연월 환율 반환
export async function GET(req: NextRequest) {
  const { error: authError, user } = await requireAdmin()
  if (authError) return authError

  const yearMonth = req.nextUrl.searchParams.get('year_month')
  if (!yearMonth) {
    return NextResponse.json({ error: 'year_month 파라미터가 필요합니다.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('exchange_rates')
    .select('*')
    .eq('year_month', yearMonth)
    .or(`owner_user_id.eq.${user!.id},owner_user_id.is.null`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 어드민 소유 데이터 우선, 없으면 레거시(null) 사용
  const preferOwned: typeof data = []
  const seen = new Set<string>()
  for (const row of (data ?? []).sort((a, b) =>
    a.owner_user_id ? -1 : b.owner_user_id ? 1 : 0,
  )) {
    if (!seen.has(row.country)) {
      preferOwned.push(row)
      seen.add(row.country)
    }
  }

  return NextResponse.json({ rates: preferOwned })
}

// POST → { year_month, rates: [{country, currency, rate}] } upsert (현재 어드민 소유로 저장)
export async function POST(req: NextRequest) {
  const { error: authError, user } = await requireAdmin()
  if (authError) return authError

  const body = await req.json()
  const { year_month, rates } = body

  if (!year_month || !Array.isArray(rates)) {
    return NextResponse.json({ error: 'year_month와 rates 배열이 필요합니다.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const rows = rates.map((r: { country: string; currency: string; rate: number }) => ({
    year_month,
    country: r.country,
    currency: r.currency,
    rate: r.rate,
    owner_user_id: user!.id,
    updated_at: now,
  }))

  // 해당 어드민의 해당 연월 데이터 삭제 후 재삽입
  const { error: delError } = await supabaseAdmin
    .from('exchange_rates')
    .delete()
    .eq('year_month', year_month)
    .eq('owner_user_id', user!.id)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  const { error } = await supabaseAdmin.from('exchange_rates').insert(rows)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
