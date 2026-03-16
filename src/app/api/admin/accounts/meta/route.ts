import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// meta_accounts + brands JOIN 조회
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('meta_accounts')
    .select('*, brands(name)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accounts = (data ?? []).map((row) => ({
    id: row.id,
    brand_id: row.brand_id,
    brand_name: (row.brands as { name: string } | null)?.name ?? '',
    account_id: row.account_id,
    sub_brand: row.sub_brand,
    note: row.note,
    country: row.country,
    is_active: row.is_active,
  }))

  return NextResponse.json({ accounts })
}

// meta_accounts upsert (account_id 충돌 시 덮어쓰기)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { brand_id, account_id, sub_brand, note, country, is_active } = body

  const { data, error } = await supabase
    .from('meta_accounts')
    .upsert({ brand_id, account_id, sub_brand: sub_brand ?? null, note, country, is_active: is_active ?? true }, { onConflict: 'account_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

// meta_accounts 행 삭제 (?id=<uuid>)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 파라미터가 필요합니다.' }, { status: 400 })

  const { error } = await supabase.from('meta_accounts').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
