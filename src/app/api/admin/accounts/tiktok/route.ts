import { fetchGmvMaxStoreId } from '@/lib/tiktok/gmvMax'
import { createClient } from '@/lib/supabase/server'
import { getTokenForCurrentUser } from '@/lib/tokens'
import { NextRequest, NextResponse } from 'next/server'

// tiktok_accounts + brands JOIN 조회 (자기 소유 + 레거시 계정만)
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('tiktok_accounts')
    .select('*, brands(name)')
    .or(`owner_user_id.eq.${user?.id},owner_user_id.is.null`)
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // GMV Max store_id 자동 감지 (실패 시 null로 저장)
  let store_id: string | null = null
  const accessToken = await getTokenForCurrentUser('tiktok')
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
        owner_user_id: user?.id ?? null,
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
