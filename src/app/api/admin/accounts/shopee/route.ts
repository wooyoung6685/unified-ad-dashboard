import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// shopee_accounts + brands JOIN 조회
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shopee_accounts')
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

// shopee_accounts upsert (account_id + account_type 충돌 시 덮어쓰기)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { brand_id, account_id, sub_brand, account_type, country, is_active } = body

  const { data, error } = await supabase
    .from('shopee_accounts')
    .upsert(
      { brand_id, account_id, account_name: sub_brand ?? '', account_type, country, is_active: is_active ?? true },
      { onConflict: 'account_id,account_type' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

// shopee_accounts 행 삭제 (?id=<uuid>)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 파라미터가 필요합니다.' }, { status: 400 })

  const { error } = await supabase.from('shopee_accounts').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
