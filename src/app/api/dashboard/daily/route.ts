import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const brandId = searchParams.get('brand_id') ?? ''
  const accountId = searchParams.get('account_id') ?? ''
  const accountType = searchParams.get('account_type') as 'meta' | 'tiktok' | null
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
      .order('date', { ascending: false })

    if (brandId && brandId !== 'all') {
      query = query.eq('brand_id', brandId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ platform: 'meta', rows: data ?? [] })
  } else {
    let query = supabase
      .from('tiktok_daily_stats')
      .select('*')
      .eq('tiktok_account_id', accountId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (brandId && brandId !== 'all') {
      query = query.eq('brand_id', brandId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ platform: 'tiktok', rows: data ?? [] })
  }
}
