import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { countryToCurrency } from './constants'

type ParseResult =
  | { success: true; inserted: number; updated: number; warning?: string }
  | { success: false; error: string }

// xlsx 매직 바이트(ZIP) 감지
function isXlsxBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04
  )
}

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

// ratio 컬럼용: 빈값/-는 null 반환
function parseNumOrNull(raw: string | undefined): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null
  const str = raw.replace(/,/g, '').replace(/%/g, '').trim()
  const n = parseFloat(str)
  return isNaN(n) ? null : n
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
  impressions: 'Impression',
  clicks: 'Clicks',
  conversions: 'Conversions',
  directConversions: 'Direct Conversions',
  itemsSold: 'Items Sold',
  directItemsSold: 'Direct Items Sold',
  gmv: 'GMV',
  directGmv: 'Direct GMV',
  expense: 'Expense',
  productId: 'Product ID',
  bidding: 'Bidding Method',
  ctr: 'CTR',
  conversionRate: 'Conversion Rate',
  roas: 'ROAS',
  directRoas: 'Direct ROAS',
  acos: 'ACOS',
  directAcos: 'Direct ACOS',
} as const

export async function parseInappStat(
  fileBuffer: Buffer,
  shopeeAccountId: string,
  accountExternalId: string,
  brandId: string,
  country: string,
): Promise<ParseResult> {
  try {
    // xlsx면 첫 시트를 CSV 텍스트로 변환, 아니면 CSV 원문 사용
    let text: string
    if (isXlsxBuffer(fileBuffer)) {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        return { success: false, error: 'xlsx 파일에 시트가 없습니다' }
      }
      const sheet = workbook.Sheets[firstSheetName]
      text = XLSX.utils.sheet_to_csv(sheet, { blankrows: true, strip: false })
    } else {
      text = fileBuffer.toString('utf-8')
      if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1)
      }
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

    // Line 6 (index 5): Date Period에서 시작일·종료일 파싱 후 동일성 검증
    const datePeriodLine = lines[5] ?? ''
    const dateTokens = [...datePeriodLine.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map((m) => m[0])
    if (dateTokens.length < 2) {
      return { success: false, error: 'Date Period 라인에서 날짜를 파싱할 수 없습니다 (Line 6)' }
    }
    const [startRaw, endRaw] = dateTokens
    const startDate = parseDate(startRaw!)
    const endDate = parseDate(endRaw!)
    if (!startDate || !endDate) {
      return { success: false, error: `날짜 형식이 올바르지 않습니다: ${startRaw} - ${endRaw}` }
    }
    if (startDate !== endDate) {
      return {
        success: false,
        error: `업로드 불가: Date Period 시작일(${startRaw})과 종료일(${endRaw})이 동일해야 합니다. 하루치 데이터 파일만 업로드해 주세요.`,
      }
    }
    const date = startDate

    // 파일 날짜에서 연월 추출 (환율 조회에 사용)
    const yearMonth = date.substring(0, 7)

    // currency 설정
    const currency = countryToCurrency(country)

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

    // per-ad 레코드 (ad_name 기준 중복 병합)
    type AdAccum = {
      ad_name: string
      ads_type_raw: string
      ads_type: string
      product_id: string | null
      bidding_method: string | null
      impressions: number
      clicks: number
      conversions: number
      direct_conversions: number
      items_sold: number
      direct_items_sold: number
      gmv: number
      direct_gmv: number
      expense: number
    }
    const adAccumMap = new Map<string, AdAccum>()

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

      // per-ad 레코드 병합 (ad_name 빈값 skip)
      const adName = adNameRaw.trim()
      if (adName) {
        const existing = adAccumMap.get(adName)
        if (existing) {
          existing.impressions += parseNum(get('impressions'))
          existing.clicks += parseNum(get('clicks'))
          existing.conversions += parseNum(get('conversions'))
          existing.direct_conversions += parseNum(get('directConversions'))
          existing.items_sold += parseNum(get('itemsSold'))
          existing.direct_items_sold += parseNum(get('directItemsSold'))
          existing.gmv += parseNum(get('gmv'))
          existing.direct_gmv += parseNum(get('directGmv'))
          existing.expense += parseNum(get('expense'))
        } else {
          const rawProductId = get('productId').trim()
          adAccumMap.set(adName, {
            ad_name: adName,
            ads_type_raw: adsTypeRaw,
            ads_type: adsType,
            product_id: rawProductId && rawProductId !== '-' ? rawProductId : null,
            bidding_method: get('bidding').trim() || null,
            impressions: parseNum(get('impressions')),
            clicks: parseNum(get('clicks')),
            conversions: parseNum(get('conversions')),
            direct_conversions: parseNum(get('directConversions')),
            items_sold: parseNum(get('itemsSold')),
            direct_items_sold: parseNum(get('directItemsSold')),
            gmv: parseNum(get('gmv')),
            direct_gmv: parseNum(get('directGmv')),
            expense: parseNum(get('expense')),
          })
        }
      }
    }

    if (Object.keys(accumByType).length === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다' }
    }

    const supabase = await createClient()

    // 현재 어드민의 환율 우선 조회 (없으면 레거시 null 환율 사용)
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

    // per-ad 두 번째 upsert
    if (adAccumMap.size > 0) {
      const adRows = Array.from(adAccumMap.values()).map((a) => {
        const ctr = a.impressions > 0 ? (a.clicks / a.impressions) * 100 : null
        const conversionRate = a.clicks > 0 ? (a.conversions / a.clicks) * 100 : null
        const roas = a.expense > 0 ? a.gmv / a.expense : null
        const directRoas = a.expense > 0 ? a.direct_gmv / a.expense : null
        const acos = a.gmv > 0 ? (a.expense / a.gmv) * 100 : null
        const directAcos = a.direct_gmv > 0 ? (a.expense / a.direct_gmv) * 100 : null
        return {
          shopee_account_id: shopeeAccountId,
          brand_id: brandId,
          date: date,
          ad_name: a.ad_name,
          ads_type_raw: a.ads_type_raw,
          ads_type: a.ads_type,
          product_id: a.product_id,
          bidding_method: a.bidding_method,
          currency,
          impressions: Math.round(a.impressions),
          clicks: Math.round(a.clicks),
          ctr,
          conversions: Math.round(a.conversions),
          conversion_rate: conversionRate,
          direct_conversions: Math.round(a.direct_conversions),
          items_sold: Math.round(a.items_sold),
          direct_items_sold: Math.round(a.direct_items_sold),
          gmv: a.gmv,
          direct_gmv: a.direct_gmv,
          expense: a.expense,
          roas,
          direct_roas: directRoas || null,
          acos: acos || null,
          direct_acos: directAcos || null,
          gmv_krw: rate !== null ? a.gmv * rate : null,
          direct_gmv_krw: rate !== null ? a.direct_gmv * rate : null,
          expense_krw: rate !== null ? a.expense * rate : null,
        }
      })

      const { error: adErr } = await supabase
        .from('shopee_inapp_ad_stats')
        .upsert(adRows, { onConflict: 'shopee_account_id,date,ad_name' })

      if (adErr) return { success: false, error: `per-ad 저장 실패: ${adErr.message}` }
    }

    return { success: true, inserted: count ?? records.length, updated: 0, warning }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}
