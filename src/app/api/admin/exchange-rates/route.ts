import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET ?year_month=YYYY-MM → 해당 연월 환율 전체 반환
export async function GET(req: NextRequest) {
  const yearMonth = req.nextUrl.searchParams.get('year_month')
  if (!yearMonth) {
    return NextResponse.json({ error: 'year_month 파라미터가 필요합니다.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('exchange_rates')
    .select('*')
    .eq('year_month', yearMonth)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rates: data ?? [] })
}

// POST → { year_month, rates: [{country, currency, rate}] } upsert
export async function POST(req: NextRequest) {
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
    updated_at: now,
  }))

  const { error } = await supabaseAdmin
    .from('exchange_rates')
    .upsert(rows, { onConflict: 'year_month,country' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
