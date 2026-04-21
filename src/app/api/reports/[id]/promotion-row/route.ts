import { requireAdmin } from '@/lib/supabase/auth'
import type { ShopeePromotionRow } from '@/types/database'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const { error: authError, supabase } = await requireAdmin()
  if (authError) return authError

  const body = await req.json()
  const { date_start, date_end, promotion_name } = body

  if (!date_start || !date_end || !promotion_name) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
  }
  if (typeof promotion_name !== 'string' || !promotion_name.trim()) {
    return NextResponse.json({ error: '프로모션 이름이 비어있습니다.' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_start) || !/^\d{4}-\d{2}-\d{2}$/.test(date_end)) {
    return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' }, { status: 400 })
  }
  if (date_start > date_end) {
    return NextResponse.json({ error: '시작일이 종료일보다 늦습니다.' }, { status: 400 })
  }

  // 리포트 조회 — shopee_inapp 플랫폼 + internal_account_id 확인
  const { data: report } = await supabase
    .from('reports')
    .select('platform, internal_account_id, promotion_rows')
    .eq('id', id)
    .single()

  if (!report) {
    return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 })
  }
  if (report.platform !== 'shopee' && report.platform !== 'shopee_inapp') {
    return NextResponse.json({ error: '쇼피 리포트에서만 사용할 수 있습니다.' }, { status: 400 })
  }
  if (!report.internal_account_id) {
    return NextResponse.json({ error: '계정 정보가 없습니다.' }, { status: 400 })
  }

  // inapp 계정에서 brand_id, country 조회
  const { data: inappAccount } = await supabase
    .from('shopee_accounts')
    .select('brand_id, country')
    .eq('id', report.internal_account_id)
    .single()

  if (!inappAccount) {
    return NextResponse.json({ error: '쇼피 계정을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 같은 brand+country의 shopping 계정 ids 조회
  const { data: shoppingAccounts } = await supabase
    .from('shopee_accounts')
    .select('id')
    .eq('brand_id', inappAccount.brand_id)
    .eq('country', inappAccount.country)
    .eq('account_type', 'shopping')

  const shoppingAccountIds = (shoppingAccounts ?? []).map((a: { id: string }) => a.id)

  if (shoppingAccountIds.length === 0) {
    return NextResponse.json({ error: '쇼핑몰 계정 데이터가 없습니다.' }, { status: 404 })
  }

  // 해당 기간 일별 shopee_shopping_stats 조회
  const { data: dailyStats } = await supabase
    .from('shopee_shopping_stats')
    .select('currency, sales, orders, visitors')
    .in('shopee_account_id', shoppingAccountIds)
    .gte('date', date_start)
    .lte('date', date_end)

  if (!dailyStats || dailyStats.length === 0) {
    return NextResponse.json(
      { error: '해당 기간에 데이터가 없습니다. 쇼핑몰 파일이 업로드되었는지 확인하세요.' },
      { status: 404 },
    )
  }

  // 합산
  let totalSales = 0
  let totalOrders = 0
  let totalVisitors = 0
  let currency = ''

  for (const row of dailyStats) {
    totalSales += row.sales ?? 0
    totalOrders += row.orders ?? 0
    totalVisitors += row.visitors ?? 0
    if (!currency && row.currency) currency = row.currency
  }

  const salesPerOrder = totalOrders > 0 ? Math.round(totalSales / totalOrders) : null
  const cvr = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : null

  const newRow: ShopeePromotionRow = {
    row_id: crypto.randomUUID(),
    date_start,
    date_end,
    promotion_name: promotion_name.trim(),
    currency,
    sales: totalSales || null,
    orders: totalOrders || null,
    visitors: totalVisitors || null,
    sales_per_order: salesPerOrder,
    cvr,
    created_at: new Date().toISOString(),
  }

  // 기존 promotion_rows 끝에 append
  const existingRows: ShopeePromotionRow[] = (report.promotion_rows as ShopeePromotionRow[] | null) ?? []
  const updatedRows = [...existingRows, newRow]

  const { error: updateError } = await supabase
    .from('reports')
    .update({ promotion_rows: updatedRows, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ row: newRow })
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const { error: authError, supabase } = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const rowId = searchParams.get('row_id')

  if (!rowId) {
    return NextResponse.json({ error: 'row_id 파라미터가 필요합니다.' }, { status: 400 })
  }

  const { data: report } = await supabase
    .from('reports')
    .select('promotion_rows')
    .eq('id', id)
    .single()

  if (!report) {
    return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 })
  }

  const existingRows: ShopeePromotionRow[] = (report.promotion_rows as ShopeePromotionRow[] | null) ?? []
  const updatedRows = existingRows.filter((r) => r.row_id !== rowId)

  const { error: updateError } = await supabase
    .from('reports')
    .update({ promotion_rows: updatedRows, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
