import { parseInappStat } from '@/lib/shopee/parseInappStat'
import { parseShoppingStat } from '@/lib/shopee/parseShoppingStat'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // 인증 및 admin 권한 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  // multipart/form-data 파싱
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const shopeeAccountId = formData.get('shopee_account_id') as string | null
  const accountType = formData.get('account_type') as 'shopping' | 'inapp' | null

  if (!file || !shopeeAccountId || !accountType) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
  }

  // shopee_accounts에서 account_id, brand_id, country 조회
  const { data: account, error: accountError } = await supabase
    .from('shopee_accounts')
    .select('account_id, brand_id, country, account_type')
    .eq('id', shopeeAccountId)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: '계정 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // account_type 일치 확인
  if (account.account_type !== accountType) {
    return NextResponse.json({ error: '계정 타입이 일치하지 않습니다.' }, { status: 400 })
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const fileName = file.name

  // 파일명 prefix 검증 (쇼핑몰만)
  if (accountType === 'shopping' && !fileName.startsWith(account.account_id)) {
    return NextResponse.json(
      { error: `파일명이 "${account.account_id}"로 시작해야 합니다.` },
      { status: 400 },
    )
  }

  const country = account.country ?? 'sg'

  if (accountType === 'shopping') {
    const result = await parseShoppingStat(
      fileBuffer,
      fileName,
      shopeeAccountId,
      account.brand_id,
      country,
    )
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } else {
    const result = await parseInappStat(fileBuffer, shopeeAccountId, account.account_id, account.brand_id, country)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  }
}
