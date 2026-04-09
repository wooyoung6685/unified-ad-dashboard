import { parseAdsStat } from '@/lib/amazon/parseAdsStat'
import { parseAsinStat } from '@/lib/amazon/parseAsinStat'
import { parseOrganicStat } from '@/lib/amazon/parseOrganicStat'
import { requireAdmin } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = await createClient()

  // multipart/form-data 파싱
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const amazonAccountId = formData.get('amazon_account_id') as string | null
  const accountType = formData.get('account_type') as 'organic' | 'ads' | 'asin' | null

  if (!file || !amazonAccountId || !accountType) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
  }

  // amazon_accounts에서 account_id, brand_id 조회
  const { data: account, error: accountError } = await supabase
    .from('amazon_accounts')
    .select('account_id, brand_id, account_type')
    .eq('id', amazonAccountId)
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

  // 파일명 검증
  if (accountType === 'organic' && !fileName.includes('BusinessReport')) {
    return NextResponse.json(
      { error: '파일명에 "BusinessReport"가 포함되어야 합니다.' },
      { status: 400 },
    )
  }
  if (accountType === 'ads' && !fileName.includes(account.account_id)) {
    return NextResponse.json(
      { error: `파일명에 "${account.account_id}"가 포함되어야 합니다.` },
      { status: 400 },
    )
  }
  if (accountType === 'asin' && !fileName.toLowerCase().includes('asin')) {
    return NextResponse.json(
      { error: '파일명에 "asin"이 포함되어야 합니다.' },
      { status: 400 },
    )
  }

  // account_type별 파서 호출
  if (accountType === 'organic') {
    const result = await parseOrganicStat(fileBuffer, amazonAccountId, account.brand_id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } else if (accountType === 'ads') {
    const result = await parseAdsStat(fileBuffer, amazonAccountId, account.brand_id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } else {
    const result = await parseAsinStat(fileBuffer, amazonAccountId, account.brand_id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  }
}
