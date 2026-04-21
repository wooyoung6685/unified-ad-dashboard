import { parseSalesOverview } from '@/lib/shopee/parseSalesOverview'
import { requireAdmin } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = await createClient()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const shopeeAccountId = formData.get('shopee_account_id') as string | null

  if (!file || !shopeeAccountId) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
  }

  // shopee_accounts에서 account_id, brand_id, country, account_type 조회
  const { data: account, error: accountError } = await supabase
    .from('shopee_accounts')
    .select('account_id, brand_id, country, account_type')
    .eq('id', shopeeAccountId)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: '계정 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 쇼핑몰(shopping) 계정만 허용
  if (account.account_type !== 'shopping') {
    return NextResponse.json({ error: '쇼핑몰(shopping) 계정이 필요합니다.' }, { status: 400 })
  }

  // 파일명 prefix 검증
  if (!file.name.toLowerCase().startsWith('sales_overview')) {
    return NextResponse.json(
      { error: '파일명이 "sales_overview" 로 시작해야 합니다.' },
      { status: 400 },
    )
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const country = account.country ?? 'sg'

  const result = await parseSalesOverview(fileBuffer, shopeeAccountId, account.brand_id, country)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
