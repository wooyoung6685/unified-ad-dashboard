import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

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

// 숫자 파싱: 빈값 또는 '-' → null (비율/선택적 지표용)
function parseNumOrNull(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const str = String(raw).replace(/,/g, '').replace(/%/g, '').trim()
  if (str === '' || str === '-') return null
  const n = parseFloat(str)
  return isNaN(n) ? null : n
}

// case-insensitive contains 방식으로 시트 탐색 (시트명 변경 대응)
function findSheet(workbook: XLSX.WorkBook, targetName: string): XLSX.WorkSheet | null {
  const exact = workbook.Sheets[targetName]
  if (exact) return exact
  const lower = targetName.toLowerCase()
  const found = workbook.SheetNames.find((name) => name.toLowerCase().includes(lower))
  return found ? workbook.Sheets[found] : null
}

export async function parseProductPerformance(
  fileBuffer: Buffer,
  shopeeAccountId: string,
  brandId: string,
  country: string,
  yearMonth: string,
): Promise<ParseResult> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false })

    const sheet = findSheet(workbook, 'Top Performing Products')
    if (!sheet) {
      return { success: false, error: '시트를 찾을 수 없습니다: "Top Performing Products"' }
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

    // 컬럼명 후보 중 존재하는 것으로 해결 (부분 매칭 방식)
    const resolveColContains = (keyword: string): string | undefined =>
      Object.keys(colIdx).find((k) => k.includes(keyword))

    // 식별 컬럼
    const itemIdKey = resolveColContains('Item ID')
    const productKey = resolveColContains('Product')
    const variationIdKey = resolveColContains('Variation ID')
    const variationNameKey = resolveColContains('Variation Name')
    const skuKey = Object.keys(colIdx).find((k) => k.trim() === 'SKU')
    const parentSkuKey = resolveColContains('Parent SKU')

    if (!itemIdKey) {
      return { success: false, error: '헤더에서 "Item ID" 을 찾을 수 없습니다' }
    }

    // 수치 컬럼 (contains 매칭)
    const orderConvRateKey = resolveColContains('Order Conversion Rate (Paid')
    const unitsPaidKey = resolveColContains('Units (Paid Order)')
    const buyersPaidKey = resolveColContains('Buyers (Paid Order)')
    const productVisitorsKey = resolveColContains('Product Visitors (Visit)')
    const productPageViewsKey = resolveColContains('Product Page Views')
    const addToCartVisitorsKey = resolveColContains('Product Visitors (Add to Cart)')
    const addToCartUnitsKey = resolveColContains('Units (Add to Cart)')
    const addToCartConvRateKey = resolveColContains('Conversion Rate (Add to Cart)')
    // Sales (Confirmed) — 통화 접미사 변형 허용 (예: "Sales (Paid Order) (SGD)")
    const salesConfirmedKey =
      Object.keys(colIdx).find((k) => k.includes('Sales') && k.includes('Paid Order')) ??
      Object.keys(colIdx).find((k) => k.includes('Sales') && k.includes('Confirmed'))

    const records: Record<string, unknown>[] = []

    // row 1~ 데이터 파싱
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[]

      const itemId = String(row[itemIdKey ? colIdx[itemIdKey] : -1] ?? '').trim()
      if (!itemId) continue

      // variation_id: '-' 또는 빈값 → ''
      const rawVariationId = variationIdKey
        ? String(row[colIdx[variationIdKey]] ?? '').trim()
        : ''
      const variationId = rawVariationId === '-' ? '' : rawVariationId

      records.push({
        shopee_account_id: shopeeAccountId,
        brand_id: brandId,
        year_month: yearMonth,
        item_id: itemId,
        product_name: productKey ? String(row[colIdx[productKey]] ?? '').trim() || null : null,
        variation_id: variationId,
        variation_name: variationNameKey
          ? String(row[colIdx[variationNameKey]] ?? '').trim() || null
          : null,
        sku: skuKey ? String(row[colIdx[skuKey]] ?? '').trim() || null : null,
        parent_sku: parentSkuKey ? String(row[colIdx[parentSkuKey]] ?? '').trim() || null : null,
        order_conv_rate_paid: orderConvRateKey
          ? parseNumOrNull(row[colIdx[orderConvRateKey]])
          : null,
        units_paid: unitsPaidKey
          ? (() => {
              const v = parseNumOrNull(row[colIdx[unitsPaidKey]])
              return v !== null ? Math.round(v) : null
            })()
          : null,
        buyers_paid: buyersPaidKey
          ? (() => {
              const v = parseNumOrNull(row[colIdx[buyersPaidKey]])
              return v !== null ? Math.round(v) : null
            })()
          : null,
        product_visitors: productVisitorsKey
          ? (() => {
              const v = parseNumOrNull(row[colIdx[productVisitorsKey]])
              return v !== null ? Math.round(v) : null
            })()
          : null,
        product_page_views: productPageViewsKey
          ? (() => {
              const v = parseNumOrNull(row[colIdx[productPageViewsKey]])
              return v !== null ? Math.round(v) : null
            })()
          : null,
        add_to_cart_visitors: addToCartVisitorsKey
          ? (() => {
              const v = parseNumOrNull(row[colIdx[addToCartVisitorsKey]])
              return v !== null ? Math.round(v) : null
            })()
          : null,
        add_to_cart_units: addToCartUnitsKey
          ? (() => {
              const v = parseNumOrNull(row[colIdx[addToCartUnitsKey]])
              return v !== null ? Math.round(v) : null
            })()
          : null,
        add_to_cart_conv_rate: addToCartConvRateKey
          ? parseNumOrNull(row[colIdx[addToCartConvRateKey]])
          : null,
        sales_confirmed: salesConfirmedKey
          ? parseNumOrNull(row[colIdx[salesConfirmedKey]])
          : null,
      })
    }

    if (records.length === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다' }
    }

    const supabase = await createClient()

    const { error, count } = await supabase
      .from('shopee_product_performance_stats')
      .upsert(records, {
        onConflict: 'shopee_account_id,year_month,item_id,variation_id',
        count: 'exact',
      })

    if (error) return { success: false, error: error.message }

    // country가 있어도 product performance는 금액 컬럼이 없어 환율 불필요
    // (지시서 §2.3에 환율 언급 없음)
    void country

    return { success: true, inserted: count ?? records.length, updated: 0 }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' }
  }
}
