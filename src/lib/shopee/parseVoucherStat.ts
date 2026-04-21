import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { countryToCurrency } from './constants'

type ParseResult =
  | { success: true; inserted: number; updated: number; warning?: string }
  | { success: false; error: string }

// 숫자 파싱: 콤마/% 제거 후 parseFloat, 빈값 → 0
function parseNum(raw: unknown): number {
  if (raw == null || raw === '') return 0
  const str = String(raw).replace(/,/g, '').replace(/%/g, '').trim()
  if (str === '' || str === '-') return 0
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

// case-insensitive contains 방식으로 시트 탐색 (시트명 변경 대응)
function findSheet(workbook: XLSX.WorkBook, targetName: string): XLSX.WorkSheet | null {
  const exact = workbook.Sheets[targetName]
  if (exact) return exact
  const lower = targetName.toLowerCase()
  const found = workbook.SheetNames.find((name) => name.toLowerCase().includes(lower))
  return found ? workbook.Sheets[found] : null
}

export async function parseVoucherStat(
  fileBuffer: Buffer,
  shopeeAccountId: string,
  brandId: string,
  country: string,
  yearMonth: string,
): Promise<ParseResult> {
  try {
    const currency = countryToCurrency(country)

    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false })

    const sheet = findSheet(workbook, 'Performance List')
    if (!sheet) {
      return { success: false, error: '시트를 찾을 수 없습니다: "Performance List"' }
    }

    // 시트를 2차원 배열로 변환
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    })

    if (rows.length < 2) {
      return { success: false, error: '파싱된 데이터가 없습니다' }
    }

    // row 0이 헤더
    const headerRow = rows[0] as string[]
    const colIdx: Record<string, number> = {}
    headerRow.forEach((h, i) => {
      if (h) colIdx[String(h).trim()] = i
    })

    // 컬럼명 후보 중 존재하는 것으로 해결
    // 전각 괄호(） 방어: 헤더 텍스트 부분 매칭 방식 사용
    const resolveColContains = (keyword: string): string | undefined =>
      Object.keys(colIdx).find((k) => k.includes(keyword))

    const voucherNameKey = resolveColContains('Voucher Name')
    const ordersKey = resolveColContains('Orders (Paid')
    const usageRateKey = resolveColContains('Usage Rate (Paid')
    const salesKey = resolveColContains('Sales (Paid')
    const costKey = resolveColContains('Cost (Paid')
    const unitsSoldKey = resolveColContains('Units Sold (Paid')

    if (!voucherNameKey) {
      return { success: false, error: '헤더에서 "Voucher Name" 을 찾을 수 없습니다' }
    }
    if (!ordersKey) {
      return { success: false, error: '헤더에서 "Orders (Paid Order)" 을 찾을 수 없습니다' }
    }
    if (!salesKey) {
      return { success: false, error: '헤더에서 "Sales (Paid Order)" 을 찾을 수 없습니다' }
    }

    const records: Record<string, unknown>[] = []

    // row 1~ 데이터 파싱
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const voucherName = String(row[colIdx[voucherNameKey]] ?? '').trim()
      if (!voucherName) continue

      records.push({
        shopee_account_id: shopeeAccountId,
        brand_id: brandId,
        year_month: yearMonth,
        voucher_name: voucherName,
        currency,
        orders_paid: Math.round(parseNum(row[ordersKey ? colIdx[ordersKey] : -1])),
        usage_rate_paid: usageRateKey !== undefined ? parseNum(row[colIdx[usageRateKey]]) : null,
        sales_paid: salesKey !== undefined ? parseNum(row[colIdx[salesKey]]) : null,
        cost_paid: costKey !== undefined ? parseNum(row[colIdx[costKey]]) : null,
        units_sold_paid: unitsSoldKey !== undefined ? Math.round(parseNum(row[colIdx[unitsSoldKey]])) : null,
      })
    }

    if (records.length === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다' }
    }

    // 환율 조회
    const supabase = await createClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    const { data: rateRows } = await supabase
      .from('exchange_rates')
      .select('rate, owner_user_id')
      .eq('year_month', yearMonth)
      .eq('country', country.toLowerCase())
      .or(`owner_user_id.eq.${currentUser?.id},owner_user_id.is.null`)

    const rateRow =
      (rateRows ?? []).find((r) => r.owner_user_id === currentUser?.id) ??
      (rateRows ?? []).find((r) => r.owner_user_id === null)

    const rate: number | null = (rateRow?.rate as number) ?? null

    // 원화 컬럼 계산
    const recordsWithKrw = records.map((r) => ({
      ...r,
      sales_paid_krw: rate !== null && r.sales_paid !== null ? (r.sales_paid as number) * rate : null,
      cost_paid_krw: rate !== null && r.cost_paid !== null ? (r.cost_paid as number) * rate : null,
    }))

    const warning =
      rate === null
        ? `${yearMonth} 환율이 설정되지 않았습니다.\n관리자 설정 > 환율 설정에서 환율을 입력하면\n원화 데이터가 자동 계산됩니다.`
        : undefined

    const { error, count } = await supabase
      .from('shopee_voucher_stats')
      .upsert(recordsWithKrw, {
        onConflict: 'shopee_account_id,year_month,voucher_name',
        count: 'exact',
      })

    if (error) return { success: false, error: error.message }

    return { success: true, inserted: count ?? records.length, updated: 0, warning }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' }
  }
}
