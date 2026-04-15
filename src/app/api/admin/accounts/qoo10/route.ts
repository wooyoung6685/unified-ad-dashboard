import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: qoo10_accounts + brands JOIN 조회
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qoo10_accounts')
    .select('*, brands(name)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accounts = (data ?? []).map((row) => ({
    id: row.id,
    brand_id: row.brand_id,
    brand_name: (row.brands as { name: string } | null)?.name ?? '',
    account_id: row.account_id,
    sub_brand: row.account_name,
    account_type: row.account_type,
    country: row.country,
    is_active: row.is_active,
  }))

  return NextResponse.json({ accounts })
}

// POST: upsert (account_type 없으면 ads + organic 2행 동시 생성)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { brand_id, account_id, sub_brand, account_type, country, is_active } = body

  if (account_type) {
    // 단건 upsert
    const { data, error } = await supabase
      .from('qoo10_accounts')
      .upsert(
        {
          brand_id,
          account_id,
          account_name: sub_brand ?? '',
          account_type,
          country,
          is_active: is_active ?? true,
        },
        { onConflict: 'account_id,account_type' },
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ account: data })
  }

  // 통합 모드: ads + organic 2행 동시 upsert
  const [adsResult, organicResult] = await Promise.all([
    supabase
      .from('qoo10_accounts')
      .upsert(
        {
          brand_id,
          account_id,
          account_name: sub_brand ?? '',
          account_type: 'ads',
          country,
          is_active: is_active ?? true,
        },
        { onConflict: 'account_id,account_type' },
      )
      .select()
      .single(),
    supabase
      .from('qoo10_accounts')
      .upsert(
        {
          brand_id,
          account_id,
          account_name: sub_brand ?? '',
          account_type: 'organic',
          country,
          is_active: is_active ?? true,
        },
        { onConflict: 'account_id,account_type' },
      )
      .select()
      .single(),
  ])

  if (adsResult.error) return NextResponse.json({ error: adsResult.error.message }, { status: 500 })
  if (organicResult.error)
    return NextResponse.json({ error: organicResult.error.message }, { status: 500 })

  return NextResponse.json({ accounts: [adsResult.data, organicResult.data] })
}

// DELETE: account_id 기준 모든 행 삭제 또는 단건 삭제
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const accountIdParam = req.nextUrl.searchParams.get('account_id')
  const id = req.nextUrl.searchParams.get('id')

  if (accountIdParam) {
    const { error } = await supabase
      .from('qoo10_accounts')
      .delete()
      .eq('account_id', accountIdParam)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (!id)
    return NextResponse.json(
      { error: 'id 또는 account_id 파라미터가 필요합니다.' },
      { status: 400 },
    )

  const { error } = await supabase.from('qoo10_accounts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
