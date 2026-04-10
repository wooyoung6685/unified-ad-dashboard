import { createClient } from '@/lib/supabase/server'
import { parseCsvLine, parseMoney, parseNum, parsePct, parseShortDate } from './csv-utils'

type ParseResult =
  | { success: true; inserted: number; updated: number }
  | { success: false; error: string }

// 오가닉 CSV 헤더 컬럼명 (한국어)
const HEADER = {
  date: '날짜',
  orderedProductSales: '주문 상품 판매량',
  orderedProductSalesB2b: '주문 상품 판매 - B2B',
  orders: '주문 수량',
  ordersB2b: '주문 수량 - B2B',
  totalOrderItems: '총 주문 아이템',
  totalOrderItemsB2b: '총 주문 아이템 - B2B',
  pageViews: '페이지 조회수 - 합계',
  pageViewsB2b: '페이지 조회수 - 총계 - B2B',
  sessions: '세션 - 합계',
  sessionsB2b: '세션 - 총계 - B2B',
  buyBoxPercentage: '추천 오퍼(바이 박스) 비율',
  buyBoxPercentageB2b: '추천 오퍼(바이 박스) 비율 - B2B',
  unitSessionPercentage: '상품 세션 비율',
  unitSessionPercentageB2b: '단위 세션 비율 - B2B',
  averageOfferCount: '평균 오퍼 개수',
  averageParentItems: '평균 상위 아이템',
} as const

export async function parseOrganicStat(
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

    // 헤더 행 찾기 (첫 번째 행이 헤더)
    const headerLine = lines[0] ?? ''
    const headerCols = parseCsvLine(headerLine)
    const colIdx: Record<string, number> = {}
    headerCols.forEach((h, i) => {
      colIdx[h] = i
    })

    // 헤더 검증
    if (colIdx[HEADER.date] === undefined) {
      return { success: false, error: '올바른 BusinessReport CSV 파일이 아닙니다. (날짜 컬럼 없음)' }
    }

    const get = (cols: string[], key: keyof typeof HEADER) => {
      const idx = colIdx[HEADER[key]]
      return idx !== undefined ? (cols[idx] ?? '') : ''
    }

    // 통화 코드 (첫 번째 데이터 행에서 추출)
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

      // 금액 파싱 (통화 추출)
      const salesRaw = get(cols, 'orderedProductSales')
      const { value: orderedProductSales, currency: cur } = parseMoney(salesRaw)
      if (cur && !currency) currency = cur

      const { value: orderedProductSalesB2b } = parseMoney(get(cols, 'orderedProductSalesB2b'))

      records.push({
        amazon_account_id: amazonAccountId,
        brand_id: brandId,
        date,
        currency: currency ?? 'USD',
        ordered_product_sales: orderedProductSales,
        ordered_product_sales_b2b: orderedProductSalesB2b,
        orders: Math.round(parseNum(get(cols, 'orders'))),
        orders_b2b: Math.round(parseNum(get(cols, 'ordersB2b'))),
        total_order_items: Math.round(parseNum(get(cols, 'totalOrderItems'))),
        total_order_items_b2b: Math.round(parseNum(get(cols, 'totalOrderItemsB2b'))),
        page_views: Math.round(parseNum(get(cols, 'pageViews'))),
        page_views_b2b: Math.round(parseNum(get(cols, 'pageViewsB2b'))),
        sessions: Math.round(parseNum(get(cols, 'sessions'))),
        sessions_b2b: Math.round(parseNum(get(cols, 'sessionsB2b'))),
        buy_box_percentage: parsePct(get(cols, 'buyBoxPercentage')),
        buy_box_percentage_b2b: parsePct(get(cols, 'buyBoxPercentageB2b')),
        unit_session_percentage: parsePct(get(cols, 'unitSessionPercentage')),
        unit_session_percentage_b2b: parsePct(get(cols, 'unitSessionPercentageB2b')),
        average_offer_count: Math.round(parseNum(get(cols, 'averageOfferCount'))),
        average_parent_items: Math.round(parseNum(get(cols, 'averageParentItems'))),
      })
    }

    if (records.length === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다.' }
    }

    const supabase = await createClient()
    const { error, count } = await supabase
      .from('amazon_organic_stats')
      .upsert(records, { onConflict: 'amazon_account_id,date', count: 'exact' })

    if (error) return { success: false, error: error.message }

    return { success: true, inserted: count ?? records.length, updated: 0 }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}
