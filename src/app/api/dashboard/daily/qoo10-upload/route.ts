import { parseQoo10AdsStat } from '@/lib/qoo10/parseAdsStat'
import { parseOrganicTransactionStat } from '@/lib/qoo10/parseOrganicTransactionStat'
import { parseOrganicVisitorStat } from '@/lib/qoo10/parseOrganicVisitorStat'
import { requireAdmin } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = await createClient()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const qoo10AccountId = formData.get('qoo10_account_id') as string | null
  const accountType = formData.get('account_type') as 'ads' | 'organic' | null
  // organic 업로드 시 파일 종류 구분: 'visitor' (CVR) 또는 'transaction' (DateGoods)
  const fileType = formData.get('file_type') as 'visitor' | 'transaction' | null

  if (!file || !qoo10AccountId || !accountType) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
  }

  // qoo10_accounts에서 brand_id, account_type 조회
  const { data: account, error: accountError } = await supabase
    .from('qoo10_accounts')
    .select('account_id, brand_id, account_type')
    .eq('id', qoo10AccountId)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: '계정 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (account.account_type !== accountType) {
    return NextResponse.json({ error: '계정 타입이 일치하지 않습니다.' }, { status: 400 })
  }

  // 파일명 패턴 검증
  // macOS는 한글 파일명을 NFD(분해형)로 저장하므로 NFC로 정규화 후 비교
  const fileName = file.name.normalize('NFC')
  if (accountType === 'ads') {
    if (!fileName.includes('새 광고 성과 보고서'.normalize('NFC'))) {
      return NextResponse.json(
        { error: '파일명에 "새 광고 성과 보고서"가 포함되어야 합니다.' },
        { status: 400 },
      )
    }
  } else {
    // organic: file_type으로 visitor/transaction 구분
    if (!fileType) {
      return NextResponse.json(
        { error: 'organic 업로드 시 file_type(visitor/transaction)이 필요합니다.' },
        { status: 400 },
      )
    }
    if (fileType === 'visitor' && !fileName.includes('Qoo10_CVR')) {
      return NextResponse.json(
        { error: '파일명에 "Qoo10_CVR"이 포함되어야 합니다.' },
        { status: 400 },
      )
    }
    if (fileType === 'transaction' && !fileName.includes('Qoo10_Transaction')) {
      return NextResponse.json(
        { error: '파일명에 "Qoo10_Transaction"이 포함되어야 합니다.' },
        { status: 400 },
      )
    }
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  if (accountType === 'ads') {
    const result = await parseQoo10AdsStat(fileBuffer, qoo10AccountId, account.brand_id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } else {
    if (fileType === 'visitor') {
      const result = await parseOrganicVisitorStat(fileBuffer, qoo10AccountId, account.brand_id)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json(result)
    } else {
      const result = await parseOrganicTransactionStat(
        fileBuffer,
        qoo10AccountId,
        account.brand_id,
      )
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json(result)
    }
  }
}
