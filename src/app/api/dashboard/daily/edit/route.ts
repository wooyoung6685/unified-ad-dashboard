import { requireAdmin } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  META_EDITABLE_FIELDS,
  SHOPEE_SHOPPING_EDITABLE_FIELDS,
  recomputeMetaRow,
  recomputeShopeeShoppingKrw,
} from '@/lib/daily/recompute'
import type { MetaEditableFields, ShopeeShoppingEditableFields } from '@/lib/daily/recompute'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const { target, id, fields } = body as {
    target: 'meta' | 'shopee_shopping'
    id: string
    fields: Record<string, number | null>
  }

  if (!target || !id || !fields || typeof fields !== 'object') {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  if (target === 'meta') {
    // 화이트리스트 raw 필드만 추출
    const rawUpdate: Partial<MetaEditableFields> = {}
    for (const key of META_EDITABLE_FIELDS) {
      if (key in fields) {
        rawUpdate[key] = fields[key] as number | null
      }
    }

    // 대상 행의 현재 raw 필드 조회 (수정하지 않는 raw 필드 유지)
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from('meta_daily_stats')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !current) {
      return NextResponse.json({ error: '데이터를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 기존값 + 수정값 병합 후 파생 지표 재계산
    const merged = { ...(current as unknown as MetaEditableFields), ...rawUpdate }
    const computed = recomputeMetaRow(merged)

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('meta_daily_stats')
      .update({ ...rawUpdate, ...computed })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ row: updated })
  }

  if (target === 'shopee_shopping') {
    // 화이트리스트 raw 필드만 추출
    const rawUpdate: Partial<ShopeeShoppingEditableFields> = {}
    for (const key of SHOPEE_SHOPPING_EDITABLE_FIELDS) {
      if (key in fields) {
        rawUpdate[key] = fields[key] as number | null
      }
    }

    // 대상 행의 date·shopee_account_id·country 조회 (환율 조회용)
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from('shopee_shopping_stats')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !current) {
      return NextResponse.json({ error: '데이터를 찾을 수 없습니다.' }, { status: 404 })
    }

    const currentTyped = current as unknown as ShopeeShoppingEditableFields & { date: string; shopee_account_id: string }

    // shopee_account_id → country 조회
    const { data: shopeeAcct } = await supabaseAdmin
      .from('shopee_accounts')
      .select('country')
      .eq('id', currentTyped.shopee_account_id)
      .single()

    const country = shopeeAcct?.country ?? null
    const yearMonth = currentTyped.date.substring(0, 7)

    // exchange_rates에서 환율 조회 (parseShoppingStat.ts와 동일 쿼리 구조)
    let rate: number | null = null
    if (country) {
      const { data: rateRows } = await supabaseAdmin
        .from('exchange_rates')
        .select('rate, owner_user_id')
        .eq('year_month', yearMonth)
        .eq('country', country.toLowerCase())

      // 소유자 있는 환율 우선, 없으면 레거시(null) 사용
      const rateRow =
        (rateRows ?? []).find((r) => r.owner_user_id !== null) ??
        (rateRows ?? []).find((r) => r.owner_user_id === null)
      rate = (rateRow?.rate as number) ?? null
    }

    // 기존값 + 수정값 병합 후 _krw 재계산
    const merged = { ...currentTyped, ...rawUpdate } as ShopeeShoppingEditableFields
    const krwFields = recomputeShopeeShoppingKrw(merged, rate)

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('shopee_shopping_stats')
      .update({ ...rawUpdate, ...krwFields })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    const warning =
      rate === null && country
        ? `${yearMonth} 환율이 설정되지 않아 원화 값은 null로 처리됩니다.`
        : undefined

    return NextResponse.json({ row: updated, warning })
  }

  return NextResponse.json({ error: '지원하지 않는 target입니다.' }, { status: 400 })
}
