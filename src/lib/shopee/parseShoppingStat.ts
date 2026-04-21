import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { countryToCurrency } from './constants'

type ParseResult =
  | { success: true; inserted: number; updated: number; warning?: string }
  | { success: false; error: string }

// 날짜 문자열을 YYYY-MM-DD 형식으로 변환
function parseDate(raw: string, isSg: boolean): string | null {
  // SG: DD-MM-YYYY, 그 외: DD/MM/YYYY
  const sep = isSg ? '-' : '/'
  const parts = raw.split(sep)
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts
  if (!dd || !mm || !yyyy) return null
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// 숫자 파싱: 콤마/% 제거 후 parseFloat, 빈값 → 0
function parseNum(raw: unknown): number {
  if (raw == null || raw === '') return 0
  const str = String(raw).replace(/,/g, '').replace(/%/g, '').trim()
  if (str === '') return 0
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

export async function parseShoppingStat(
  fileBuffer: Buffer,
  fileName: string,
  shopeeAccountId: string,
  brandId: string,
  country: string,
): Promise<ParseResult> {
  try {
    const isSg = country.toLowerCase() === 'sg'

    // 파일명 prefix 검증은 호출부에서 account_id 기반으로 처리
    // (파일명에 account_id prefix가 있는지는 upload route에서 검증)

    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false })

    // 탭 선택: SG → 'Paid Order', 그 외 → 'Confirmed Order'
    const sheetName = isSg ? 'Paid Order' : 'Confirmed Order'
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      return { success: false, error: `시트를 찾을 수 없습니다: "${sheetName}"` }
    }

    // 시트를 2차원 배열로 변환
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    })

    // 'Date' 컬럼이 있는 행을 동적으로 탐색 (파일 포맷 버전 차이 대응)
    // 구조: 요약 헤더 → 요약 데이터 → 빈 행 → 실제 헤더 → 일별 데이터
    let headerRowIdx = -1
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i] as string[]
      if (String(row[0] ?? '').trim() === 'Date') {
        // 두 번째 'Date' 행이 실제 데이터 헤더 (첫 번째는 요약 헤더)
        if (headerRowIdx === -1) {
          headerRowIdx = i // 첫 번째 Date 행 임시 저장
        } else {
          headerRowIdx = i // 두 번째 Date 행이 진짜 헤더
          break
        }
      }
    }

    if (headerRowIdx === -1) {
      return { success: false, error: `헤더에서 날짜 컬럼을 찾을 수 없습니다` }
    }

    const headerRow = rows[headerRowIdx] as string[]
    const colIdx: Record<string, number> = {}
    headerRow.forEach((h, i) => {
      if (h) colIdx[String(h).trim()] = i
    })

    // currency 설정
    const currency = countryToCurrency(country)

    // 컬럼명 후보 중 존재하는 것으로 값 조회 (버전별 컬럼명 차이 대응)
    const resolveCol = (...candidates: string[]): string | undefined =>
      candidates.find((c) => colIdx[c] !== undefined)

    const salesKey = resolveCol('Sales', `Sales (${currency})`, 'Sales (PHP)', 'Sales (SGD)', 'Sales (VND)', 'Sales (MYR)', 'Sales (THB)', 'Sales (IDR)')
    const salesPerOrderKey = resolveCol('Sales / Order', 'Sales per Order')
    const refundedOrdersKey = resolveCol('Refunded Orders', 'Returned/Refunded Orders')
    const refundedSalesKey = resolveCol('Refunded Sales', 'Returned/Refunded Sales')
    const buyersKey = resolveCol('Buyers', '# of buyers')
    const newBuyersKey = resolveCol('New Buyers', '# of new buyers')
    const existingBuyersKey = resolveCol('Existing Buyers', '# of existing buyers')
    const potentialBuyersKey = resolveCol('Potential Buyers', '# of potential buyers')

    const records: Record<string, unknown>[] = []

    // 헤더 다음 행부터 데이터 파싱
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const dateRaw = String(row[colIdx['Date']] ?? '').trim()
      if (!dateRaw || dateRaw === '') continue

      const date = parseDate(dateRaw, isSg)
      if (!date) continue

      const get = (key: string | undefined) => (key !== undefined ? row[colIdx[key] ?? -1] : undefined)

      // SG 전용 컬럼 처리
      const salesWithoutRebateKey = isSg ? resolveCol('Sales (Excl. Rebates)') : undefined
      const salesWithoutRebate =
        salesWithoutRebateKey !== undefined ? parseNum(get(salesWithoutRebateKey)) : null

      records.push({
        shopee_account_id: shopeeAccountId,
        brand_id: brandId,
        date,
        currency,
        sales: parseNum(get(salesKey)),
        sales_without_rebate: salesWithoutRebate,
        orders: Math.round(parseNum(get('Orders'))),
        sales_per_order: parseNum(get(salesPerOrderKey)),
        product_clicks: Math.round(parseNum(get('Product Clicks'))),
        visitors: Math.round(parseNum(get('Visitors'))),
        order_conversion_rate: parseNum(get('Order Conversion Rate')),
        cancelled_orders: Math.round(parseNum(get('Cancelled Orders'))),
        cancelled_sales: parseNum(get('Cancelled Sales')),
        refunded_orders: Math.round(parseNum(get(refundedOrdersKey))),
        refunded_sales: parseNum(get(refundedSalesKey)),
        buyers: Math.round(parseNum(get(buyersKey))),
        new_buyers: Math.round(parseNum(get(newBuyersKey))),
        existing_buyers: Math.round(parseNum(get(existingBuyersKey))),
        potential_buyers: Math.round(parseNum(get(potentialBuyersKey))),
        repeat_purchase_rate: parseNum(get('Repeat Purchase Rate')),
      })
    }

    if (records.length === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다' }
    }

    const supabase = await createClient()

    // 첫 번째 레코드의 날짜에서 연월 추출 후 현재 어드민 환율 조회 (없으면 레거시 사용)
    const yearMonth = (records[0].date as string).substring(0, 7)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    const { data: rateRows } = await supabase
      .from('exchange_rates')
      .select('rate, owner_user_id')
      .eq('year_month', yearMonth)
      .eq('country', country.toLowerCase())
      .or(`owner_user_id.eq.${currentUser?.id},owner_user_id.is.null`)

    // 소유자 있는 환율 우선, 없으면 레거시(null) 사용
    const rateRow =
      (rateRows ?? []).find((r) => r.owner_user_id === currentUser?.id) ??
      (rateRows ?? []).find((r) => r.owner_user_id === null)

    const rate: number | null = (rateRow?.rate as number) ?? null

    // 원화 컬럼 계산 (환율 없으면 null)
    const recordsWithKrw = records.map((r) => ({
      ...r,
      sales_krw: rate !== null ? (r.sales as number) * rate : null,
      sales_without_rebate_krw:
        rate !== null && r.sales_without_rebate !== null
          ? (r.sales_without_rebate as number) * rate
          : null,
      cancelled_sales_krw: rate !== null ? (r.cancelled_sales as number) * rate : null,
      refunded_sales_krw: rate !== null ? (r.refunded_sales as number) * rate : null,
      sales_per_order_krw: rate !== null ? (r.sales_per_order as number) * rate : null,
    }))

    const warning =
      rate === null
        ? `${yearMonth} 환율이 설정되지 않았습니다.\n관리자 설정 > 환율 설정에서 환율을 입력하면\n원화 데이터가 자동 계산됩니다.`
        : undefined

    const { error, count } = await supabase
      .from('shopee_shopping_stats')
      .upsert(recordsWithKrw, { onConflict: 'shopee_account_id,date', count: 'exact' })

    if (error) return { success: false, error: error.message }

    return { success: true, inserted: count ?? records.length, updated: 0, warning }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}
