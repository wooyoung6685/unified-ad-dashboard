import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// amazon_accounts + brands JOIN 조회
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('amazon_accounts')
    .select('*, brands(name)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accounts = (data ?? []).map((row) => ({
    id: row.id,
    brand_id: row.brand_id,
    brand_name: (row.brands as { name: string } | null)?.name ?? '',
    account_id: row.account_id,
    sub_brand: row.account_name,  // account_name을 sub_brand로 노출 (UI 통일)
    account_type: row.account_type,
    country: row.country,
    is_active: row.is_active,
  }))

  return NextResponse.json({ accounts })
}

// amazon_accounts upsert
// account_type 없으면 organic + ads + asin 3행 동시 upsert (통합 모드)
// account_type 있으면 단건 upsert
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { brand_id, account_id, sub_brand, account_type, country, is_active } = body

  if (account_type) {
    // 단건 upsert
    const { data, error } = await supabase
      .from('amazon_accounts')
      .upsert(
        { brand_id, account_id, account_name: sub_brand ?? '', account_type, country, is_active: is_active ?? true },
        { onConflict: 'account_id,account_type' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ account: data })
  }

  // 통합 모드: organic + ads + asin 3행 동시 upsert
  const [organicResult, adsResult, asinResult] = await Promise.all([
    supabase
      .from('amazon_accounts')
      .upsert(
        { brand_id, account_id, account_name: sub_brand ?? '', account_type: 'organic', country, is_active: is_active ?? true },
        { onConflict: 'account_id,account_type' }
      )
      .select()
      .single(),
    supabase
      .from('amazon_accounts')
      .upsert(
        { brand_id, account_id, account_name: sub_brand ?? '', account_type: 'ads', country, is_active: is_active ?? true },
        { onConflict: 'account_id,account_type' }
      )
      .select()
      .single(),
    supabase
      .from('amazon_accounts')
      .upsert(
        { brand_id, account_id, account_name: sub_brand ?? '', account_type: 'asin', country, is_active: is_active ?? true },
        { onConflict: 'account_id,account_type' }
      )
      .select()
      .single(),
  ])

  if (organicResult.error) return NextResponse.json({ error: organicResult.error.message }, { status: 500 })
  if (adsResult.error) return NextResponse.json({ error: adsResult.error.message }, { status: 500 })
  if (asinResult.error) return NextResponse.json({ error: asinResult.error.message }, { status: 500 })

  return NextResponse.json({ accounts: [organicResult.data, adsResult.data, asinResult.data] })
}

// amazon_accounts 행 삭제
// ?account_id=<외부ID> → 해당 account_id의 모든 행(organic+ads+asin) 삭제
// ?id=<uuid> → 단건 삭제
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const accountIdParam = req.nextUrl.searchParams.get('account_id')
  const id = req.nextUrl.searchParams.get('id')

  if (accountIdParam) {
    const { error } = await supabase
      .from('amazon_accounts')
      .delete()
      .eq('account_id', accountIdParam)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (!id) return NextResponse.json({ error: 'id 또는 account_id 파라미터가 필요합니다.' }, { status: 400 })

  const { error } = await supabase.from('amazon_accounts').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
