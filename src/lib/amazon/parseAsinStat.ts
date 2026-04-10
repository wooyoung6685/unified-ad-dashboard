import { createClient } from '@/lib/supabase/server'
import { parseCsvLine, parseMoney, parseNum, parsePct, parseShortDate } from './csv-utils'

type ParseResult =
  | { success: true; inserted: number; updated: number }
  | { success: false; error: string }

// ASIN Report CSV 헤더 컬럼명 (한국어)
const HEADER = {
  date: '날짜',
  parentAsin: '(상위) ASIN',
  childAsin: '(하위) ASIN',
  title: '제목',
  sessions: '세션 - 합계',
  sessionsB2b: '세션 - 총계 - B2B',
  sessionPercentage: '세션 비율 - 총계',
  sessionPercentageB2b: '세션 비율 - 합계 - B2B',
  pageViews: '페이지 조회수 - 합계',
  pageViewsB2b: '페이지 조회수 - 총계 - B2B',
  pageViewsPercentage: '페이지 조회수 비율 - 총계',
  pageViewsPercentageB2b: '페이지 조회수 비율 - 총계 - B2B',
  buyBoxPercentage: '추천 오퍼(바이 박스) 비율',
  buyBoxPercentageB2b: '추천 오퍼(바이 박스) 비율 - B2B',
  orders: '주문 수량',
  ordersB2b: '주문 수량 - B2B',
  unitSessionPercentage: '상품 세션 비율',
  unitSessionPercentageB2b: '단위 세션 비율 - B2B',
  orderedProductSales: '주문 상품 판매량',
  orderedProductSalesB2b: '주문 상품 판매 - B2B',
  totalOrderItems: '총 주문 아이템',
  totalOrderItemsB2b: '총 주문 아이템 - B2B',
} as const

export async function parseAsinStat(
  fileBuffer: Buffer,
  amazonAccountId: string,
  brandId: string,
): Promise<ParseResult> {
  try {
    // UTF-8 BOM 제거
    let text = fileBuffer.toString('utf-8')
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1)
    }

    const lines = text.split(/\r?\n/)

    // 헤더 행 (첫 번째 행)
    const headerLine = lines[0] ?? ''
    const headerCols = parseCsvLine(headerLine)
    const colIdx: Record<string, number> = {}
    headerCols.forEach((h, i) => {
      colIdx[h] = i
    })

    // 헤더 검증
    if (colIdx[HEADER.date] === undefined) {
      return { success: false, error: '올바른 ASIN Report CSV 파일이 아닙니다. (날짜 컬럼 없음)' }
    }

    const get = (cols: string[], key: keyof typeof HEADER) => {
      const idx = colIdx[HEADER[key]]
      return idx !== undefined ? (cols[idx] ?? '') : ''
    }

    let currency: string | null = null
    const records: Record<string, unknown>[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim()
      if (!line) continue

      const cols = parseCsvLine(line)
      if (cols.length < 3) continue

      const rawDate = get(cols, 'date')
      const date = parseShortDate(rawDate)
      if (!date) continue

      const childAsin = get(cols, 'childAsin')
      if (!childAsin) continue

      // 금액 파싱
      const salesRaw = get(cols, 'orderedProductSales')
      const { value: orderedProductSales, currency: cur } = parseMoney(salesRaw)
      if (cur && !currency) currency = cur

      const { value: orderedProductSalesB2b } = parseMoney(get(cols, 'orderedProductSalesB2b'))

      records.push({
        amazon_account_id: amazonAccountId,
        brand_id: brandId,
        date,
        currency: currency ?? 'USD',
        parent_asin: get(cols, 'parentAsin') || null,
        child_asin: childAsin,
        title: get(cols, 'title') || null,
        sessions: Math.round(parseNum(get(cols, 'sessions'))),
        sessions_b2b: Math.round(parseNum(get(cols, 'sessionsB2b'))),
        session_percentage: parsePct(get(cols, 'sessionPercentage')),
        session_percentage_b2b: parsePct(get(cols, 'sessionPercentageB2b')),
        page_views: Math.round(parseNum(get(cols, 'pageViews'))),
        page_views_b2b: Math.round(parseNum(get(cols, 'pageViewsB2b'))),
        page_views_percentage: parsePct(get(cols, 'pageViewsPercentage')),
        page_views_percentage_b2b: parsePct(get(cols, 'pageViewsPercentageB2b')),
        buy_box_percentage: parsePct(get(cols, 'buyBoxPercentage')),
        buy_box_percentage_b2b: parsePct(get(cols, 'buyBoxPercentageB2b')),
        orders: Math.round(parseNum(get(cols, 'orders'))),
        orders_b2b: Math.round(parseNum(get(cols, 'ordersB2b'))),
        unit_session_percentage: parsePct(get(cols, 'unitSessionPercentage')),
        unit_session_percentage_b2b: parsePct(get(cols, 'unitSessionPercentageB2b')),
        ordered_product_sales: orderedProductSales,
        ordered_product_sales_b2b: orderedProductSalesB2b,
        total_order_items: Math.round(parseNum(get(cols, 'totalOrderItems'))),
        total_order_items_b2b: Math.round(parseNum(get(cols, 'totalOrderItemsB2b'))),
      })
    }

    if (records.length === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다.' }
    }

    const supabase = await createClient()
    const { error, count } = await supabase
      .from('amazon_asin_stats')
      .upsert(records, { onConflict: 'amazon_account_id,date,child_asin', count: 'exact' })

    if (error) return { success: false, error: error.message }

    return { success: true, inserted: count ?? records.length, updated: 0 }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}
