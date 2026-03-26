import { fetchGmvMaxStoreId } from '@/lib/tiktok/gmvMax'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// TikTok 액세스 토큰 조회
async function getTiktokAccessToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('global_settings')
    .select('access_token')
    .eq('platform', 'tiktok')
    .single()
  return data?.access_token ?? null
}

// tiktok_accounts + brands JOIN 조회
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tiktok_accounts')
    .select('*, brands(name)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accounts = (data ?? []).map((row) => ({
    id: row.id,
    brand_id: row.brand_id,
    brand_name: (row.brands as { name: string } | null)?.name ?? '',
    account_id: row.advertiser_id,
    sub_brand: row.sub_brand,
    note: row.note,
    country: row.country,
    is_active: row.is_active,
    store_id: row.store_id ?? null,
  }))

  return NextResponse.json({ accounts })
}

// tiktok_accounts upsert (advertiser_id 충돌 시 덮어쓰기)
// 등록 시 GMV Max store_id를 자동 감지하여 저장
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { brand_id, account_id, sub_brand, note, country, is_active } = body

  // GMV Max store_id 자동 감지 (실패 시 null로 저장)
  let store_id: string | null = null
  const accessToken = await getTiktokAccessToken()
  if (accessToken && account_id) {
    store_id = await fetchGmvMaxStoreId(account_id, accessToken)
    if (store_id) {
      console.log(`[TikTok] advertiser_id=${account_id} → store_id=${store_id} 감지`)
    }
  }

  const { data, error } = await supabase
    .from('tiktok_accounts')
    .upsert(
      {
        brand_id,
        advertiser_id: account_id,
        sub_brand: sub_brand ?? null,
        note,
        country,
        is_active: is_active ?? true,
        store_id,
      },
      { onConflict: 'advertiser_id' },
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

// tiktok_accounts 행 삭제 (?id=<uuid>)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 파라미터가 필요합니다.' }, { status: 400 })

  const { error } = await supabase.from('tiktok_accounts').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
