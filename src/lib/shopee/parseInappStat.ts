import { createClient } from '@/lib/supabase/server'

type ParseResult =
  | { success: true; inserted: number; updated: number; warning?: string }
  | { success: false; error: string }

// 날짜 DD/MM/YYYY → YYYY-MM-DD
function parseDate(raw: string): string | null {
  const parts = raw.trim().split('/')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts
  if (!dd || !mm || !yyyy) return null
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// 숫자 파싱: 콤마/% 제거
function parseNum(raw: string | undefined): number {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return 0
  const str = raw.replace(/,/g, '').replace(/%/g, '').trim()
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

// ads_type 결정
function determineAdsType(
  adsTypeCol: string,
  adNameCol: string,
): 'product_ad' | 'shop_ad' | 'other' {
  const type = adsTypeCol.trim().toLowerCase()
  if (type) {
    if (type.includes('product')) return 'product_ad'
    if (type.includes('shop')) return 'shop_ad'
    return 'other'
  }

  // ads_type 빈값이면 Ad Name으로 판단
  const name = adNameCol.trim().toLowerCase()
  if (name.includes('automatically select products') || name.includes('product_ad')) {
    return 'product_ad'
  }
  if (name.includes('shop')) return 'shop_ad'
  return 'other'
}

// RFC 4180 준수 CSV 행 파싱 (따옴표 안의 쉼표 처리)
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      // 이중 따옴표 이스케이프 처리
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

// 헤더 컬럼명 (실제 Shopee CSV 기준)
const HEADER_COLS = {
  adsType: 'Ads Type',
  adName: 'Ad Name',
  impressions: 'Impression',          // 파일에서 단수형 사용
  clicks: 'Clicks',
  conversions: 'Conversions',
  directConversions: 'Direct Conversions',
  itemsSold: 'Items Sold',
  directItemsSold: 'Direct Items Sold',
  gmv: 'GMV',
  directGmv: 'Direct GMV',
  expense: 'Expense',
} as const

export async function parseInappStat(
  fileBuffer: Buffer,
  shopeeAccountId: string,
  accountExternalId: string,
  brandId: string,
  country: string,
): Promise<ParseResult> {
  try {
    // UTF-8 BOM 제거
    let text = fileBuffer.toString('utf-8')
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1)
    }

    const lines = text.split(/\r?\n/)

    // Line 2 (index 1): User Name 검증
    // 형식: "User Name,bentoncosmetic.sg"
    const userNameLine = lines[1] ?? ''
    const userNameValue = userNameLine.split(',')[1]?.trim() ?? ''
    if (userNameValue !== accountExternalId) {
      return {
        success: false,
        error: `파일의 User Name(${userNameValue})이 계정 ID(${accountExternalId})와 일치하지 않습니다.`,
      }
    }

    // Line 6 (index 5): Date Period에서 시작일 파싱
    const datePeriodLine = lines[5] ?? ''
    const dateMatch = datePeriodLine.match(/(\d{2}\/\d{2}\/\d{4})/)
    if (!dateMatch) {
      return { success: false, error: 'Date Period 라인에서 날짜를 파싱할 수 없습니다 (Line 6)' }
    }
    const date = parseDate(dateMatch[1])
    if (!date) {
      return { success: false, error: `날짜 형식이 올바르지 않습니다: ${dateMatch[1]}` }
    }

    // 파일 날짜에서 연월 추출 (환율 조회에 사용)
    const yearMonth = date.substring(0, 7)

    // currency 설정
    const currency =
      country.toLowerCase() === 'sg'
        ? 'SGD'
        : country.toUpperCase() === 'PH'
          ? 'PHP'
          : country.toUpperCase()

    // Line 8 (index 7): 헤더 행 - CSV 파싱으로 컬럼 인덱스 확정
    const headerCols = parseCsvLine(lines[7] ?? '')
    const colIdx: Record<string, number> = {}
    headerCols.forEach((h, i) => {
      colIdx[h] = i
    })

    // ads_type별 합산
    type AdsAccum = {
      impressions: number
      clicks: number
      conversions: number
      directConversions: number
      itemsSold: number
      directItemsSold: number
      gmv: number
      directGmv: number
      expense: number
    }
    const accumByType: Record<string, AdsAccum> = {}

    // Line 9부터 (index 8): 데이터 행
    for (let i = 8; i < lines.length; i++) {
      const line = lines[i]?.trim()
      if (!line) continue

      const cols = parseCsvLine(line)
      if (cols.length < 3) continue

      const get = (key: keyof typeof HEADER_COLS) => {
        const idx = colIdx[HEADER_COLS[key]]
        return idx !== undefined ? (cols[idx] ?? '') : ''
      }

      const adsTypeRaw = get('adsType')
      const adNameRaw = get('adName')
      const adsType = determineAdsType(adsTypeRaw, adNameRaw)

      if (!accumByType[adsType]) {
        accumByType[adsType] = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          directConversions: 0,
          itemsSold: 0,
          directItemsSold: 0,
          gmv: 0,
          directGmv: 0,
          expense: 0,
        }
      }
      const acc = accumByType[adsType]
      acc.impressions += parseNum(get('impressions'))
      acc.clicks += parseNum(get('clicks'))
      acc.conversions += parseNum(get('conversions'))
      acc.directConversions += parseNum(get('directConversions'))
      acc.itemsSold += parseNum(get('itemsSold'))
      acc.directItemsSold += parseNum(get('directItemsSold'))
      acc.gmv += parseNum(get('gmv'))
      acc.directGmv += parseNum(get('directGmv'))
      acc.expense += parseNum(get('expense'))
    }

    if (Object.keys(accumByType).length === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다' }
    }

    const supabase = await createClient()

    // 환율 조회
    const { data: rateRow } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('year_month', yearMonth)
      .eq('country', country.toLowerCase())
      .maybeSingle()

    const rate: number | null = (rateRow?.rate as number) ?? null

    const warning =
      rate === null
        ? `${yearMonth} 환율이 설정되지 않았습니다.\n관리자 설정 > 환율 설정에서 환율을 입력하면\n원화 데이터가 자동 계산됩니다.`
        : undefined

    // 비율 재계산 후 레코드 생성 (원화 컬럼 포함)
    const records = Object.entries(accumByType).map(([adsType, acc]) => {
      const ctr = acc.impressions > 0 ? (acc.clicks / acc.impressions) * 100 : null
      const conversionRate = acc.clicks > 0 ? (acc.conversions / acc.clicks) * 100 : null
      const directConversionRate =
        acc.clicks > 0 ? (acc.directConversions / acc.clicks) * 100 : null
      const costPerConversion = acc.conversions > 0 ? acc.expense / acc.conversions : null
      const costPerDirectConversion =
        acc.directConversions > 0 ? acc.expense / acc.directConversions : null
      const roas = acc.expense > 0 ? acc.gmv / acc.expense : null
      const directRoas = acc.expense > 0 ? acc.directGmv / acc.expense : null
      const acos = acc.gmv > 0 ? (acc.expense / acc.gmv) * 100 : null
      const directAcos = acc.directGmv > 0 ? (acc.expense / acc.directGmv) * 100 : null

      return {
        shopee_account_id: shopeeAccountId,
        brand_id: brandId,
        date,
        ads_type: adsType,
        currency,
        impressions: Math.round(acc.impressions),
        clicks: Math.round(acc.clicks),
        ctr,
        conversions: Math.round(acc.conversions),
        direct_conversions: Math.round(acc.directConversions),
        conversion_rate: conversionRate,
        direct_conversion_rate: directConversionRate,
        cost_per_conversion: costPerConversion,
        cost_per_direct_conversion: costPerDirectConversion,
        items_sold: Math.round(acc.itemsSold),
        direct_items_sold: Math.round(acc.directItemsSold),
        gmv: acc.gmv,
        direct_gmv: acc.directGmv,
        expense: acc.expense,
        roas,
        direct_roas: directRoas,
        acos,
        direct_acos: directAcos,
        // 원화 환산 컬럼
        gmv_krw: rate !== null ? acc.gmv * rate : null,
        direct_gmv_krw: rate !== null ? acc.directGmv * rate : null,
        expense_krw: rate !== null ? acc.expense * rate : null,
        cost_per_conversion_krw: rate !== null && costPerConversion !== null ? costPerConversion * rate : null,
        cost_per_direct_conversion_krw:
          rate !== null && costPerDirectConversion !== null ? costPerDirectConversion * rate : null,
      }
    })

    const { error, count } = await supabase
      .from('shopee_inapp_stats')
      .upsert(records, { onConflict: 'shopee_account_id,date,ads_type', count: 'exact' })

    if (error) return { success: false, error: error.message }

    return { success: true, inserted: count ?? records.length, updated: 0, warning }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}
