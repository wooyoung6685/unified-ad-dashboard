import { createClient } from '@/lib/supabase/server'
import { parseCsvLine, parseLongDate, parseNum } from './csv-utils'

type ParseResult =
  | { success: true; inserted: number; updated: number }
  | { success: false; error: string }

// 광고 CSV 헤더 컬럼명 (한국어)
const HEADER = {
  date: '날짜',
  impressions: '노출수',
  viewableImpressions: '조회 가능 노출수',
  clicks: '클릭수',
  cost: '총 비용',
  purchases: '구매수',
  purchasesNewToBrand: '구매(신규 브랜드 고객)',
  sales: '매출',
  longTermSales: '장기 판매',
} as const

// 캠페인 ID 정리: ="229476204339956" → 229476204339956
function cleanCampaignId(raw: string): string {
  return raw.replace(/^="?/, '').replace(/"?$/, '').trim()
}

type DayAccum = {
  impressions: number
  viewable_impressions: number
  clicks: number
  cost: number
  purchases: number
  purchases_new_to_brand: number
  sales: number
  long_term_sales: number
}

export async function parseAdsStat(
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

    // 헤더 행 찾기 (첫 번째 행)
    const headerLine = lines[0] ?? ''
    const headerCols = parseCsvLine(headerLine)
    const colIdx: Record<string, number> = {}
    headerCols.forEach((h, i) => {
      colIdx[h] = i
    })

    // 헤더 검증
    if (colIdx[HEADER.date] === undefined) {
      return { success: false, error: '올바른 Sponsored Products CSV 파일이 아닙니다. (날짜 컬럼 없음)' }
    }

    const get = (cols: string[], key: keyof typeof HEADER) => {
      const idx = colIdx[HEADER[key]]
      return idx !== undefined ? (cols[idx] ?? '') : ''
    }

    // 날짜별 합산
    const accumByDate = new Map<string, DayAccum>()

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim()
      if (!line) continue

      const cols = parseCsvLine(line)
      if (cols.length < 3) continue

      const rawDate = get(cols, 'date')
      const date = parseLongDate(rawDate)
      if (!date) continue

      // 캠페인 ID 정리 (사용 목적으로 읽기만 함, DB엔 저장 안 함)
      const campaignIdCol = colIdx['캠페인 ID']
      if (campaignIdCol !== undefined && cols[campaignIdCol]) {
        cleanCampaignId(cols[campaignIdCol] ?? '')
      }

      if (!accumByDate.has(date)) {
        accumByDate.set(date, {
          impressions: 0,
          viewable_impressions: 0,
          clicks: 0,
          cost: 0,
          purchases: 0,
          purchases_new_to_brand: 0,
          sales: 0,
          long_term_sales: 0,
        })
      }

      const acc = accumByDate.get(date)!
      acc.impressions += parseNum(get(cols, 'impressions'))
      acc.viewable_impressions += parseNum(get(cols, 'viewableImpressions'))
      acc.clicks += parseNum(get(cols, 'clicks'))
      acc.cost += parseNum(get(cols, 'cost'))
      acc.purchases += parseNum(get(cols, 'purchases'))
      acc.purchases_new_to_brand += parseNum(get(cols, 'purchasesNewToBrand'))
      acc.sales += parseNum(get(cols, 'sales'))
      acc.long_term_sales += parseNum(get(cols, 'longTermSales'))
    }

    if (accumByDate.size === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다.' }
    }

    // 집계 후 계산 지표 추가
    const records = Array.from(accumByDate.entries()).map(([date, acc]) => ({
      amazon_account_id: amazonAccountId,
      brand_id: brandId,
      date,
      currency: 'USD',
      impressions: Math.round(acc.impressions),
      viewable_impressions: Math.round(acc.viewable_impressions),
      clicks: Math.round(acc.clicks),
      cost: acc.cost,
      purchases: Math.round(acc.purchases),
      purchases_new_to_brand: Math.round(acc.purchases_new_to_brand),
      sales: acc.sales,
      long_term_sales: acc.long_term_sales,
      // 계산 필드
      ctr: acc.impressions > 0 ? (acc.clicks / acc.impressions) * 100 : null,
      cpc: acc.clicks > 0 ? acc.cost / acc.clicks : null,
      roas: acc.cost > 0 ? acc.sales / acc.cost : null,
      long_term_roas: acc.cost > 0 ? acc.long_term_sales / acc.cost : null,
      cost_per_purchase: acc.purchases > 0 ? acc.cost / acc.purchases : null,
    }))

    const supabase = await createClient()
    const { error, count } = await supabase
      .from('amazon_ads_stats')
      .upsert(records, { onConflict: 'amazon_account_id,date', count: 'exact' })

    if (error) return { success: false, error: error.message }

    return { success: true, inserted: count ?? records.length, updated: 0 }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}
