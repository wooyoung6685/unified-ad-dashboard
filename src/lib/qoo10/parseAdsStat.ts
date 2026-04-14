import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

type ParseResult =
  | { success: true; inserted: number; updated: number }
  | { success: false; error: string }

// 숫자 파싱: 문자열 또는 숫자 → number
function parseNum(raw: unknown): number {
  if (raw == null || raw === '') return 0
  if (typeof raw === 'number') return raw
  const str = String(raw).replace(/,/g, '').replace(/%/g, '').trim()
  if (str === '' || str === 'NaN') return 0
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

// 퍼센트 파싱
function parsePct(raw: unknown): number | null {
  if (raw == null || raw === '' || raw === 'NaN') return null
  if (typeof raw === 'number') return raw
  const str = String(raw).replace(/%/g, '').replace(/,/g, '').trim()
  if (str === '') return null
  const n = parseFloat(str)
  return isNaN(n) ? null : n
}

// 날짜 파싱: "2026. 03. 31" → "2026-03-31"
function parseDate(raw: unknown): string | null {
  if (raw == null) return null
  const str = String(raw).trim()
  if (str === '총합' || str === '') return null
  // "2026. 03. 31" 형식 (마지막 점 포함 가능)
  const cleaned = str.replace(/\.$/, '')
  const parts = cleaned.split('.').map((p) => p.trim()).filter(Boolean)
  if (parts.length !== 3) return null
  const [yyyy, mm, dd] = parts
  if (!yyyy || !mm || !dd) return null
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

export async function parseQoo10AdsStat(
  fileBuffer: Buffer,
  qoo10AccountId: string,
  brandId: string,
): Promise<ParseResult> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheet = workbook.Sheets['Report']
    if (!sheet) {
      return { success: false, error: '시트를 찾을 수 없습니다: "Report"' }
    }

    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    })

    if (rows.length < 2) {
      return { success: false, error: '데이터가 부족합니다.' }
    }

    // 첫 번째 행이 헤더
    const headerRow = rows[0] as string[]
    const colIdx: Record<string, number> = {}
    headerRow.forEach((h, i) => {
      if (h) colIdx[String(h).trim()] = i
    })

    // 필수 컬럼 검증
    if (colIdx['날짜'] === undefined) {
      return { success: false, error: '올바른 광고 성과 보고서가 아닙니다. (날짜 컬럼 없음)' }
    }

    const records: Record<string, unknown>[] = []

    // index 1부터 순회 (index 0은 헤더)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const dateRaw = row[colIdx['날짜']]
      const date = parseDate(dateRaw)
      if (!date) continue // "총합" 행 및 빈 행 스킵

      const productCode = row[colIdx['상품코드']]
      const adName = row[colIdx['광고명']]

      records.push({
        qoo10_account_id: qoo10AccountId,
        brand_id: brandId,
        date,
        product_name: row[colIdx['상품명']] || null,
        // 상품코드 과학적 표기법 방지: raw:false로 문자열 변환
        product_code: productCode ? String(productCode) : null,
        ad_name: adName ? String(adName).trim() : null,
        cost: parseNum(row[colIdx['광고비 (Qcash)']]),
        sales: parseNum(row[colIdx['광고 매출']]) || null,
        roas: parsePct(row[colIdx['ROAS']]),
        impressions: Math.round(parseNum(row[colIdx['노출수']])),
        clicks: Math.round(parseNum(row[colIdx['클릭수(PV)']])),
        ctr: parsePct(row[colIdx['클릭률']]),
        carts: Math.round(parseNum(row[colIdx['카트수']])) || null,
        cart_conversion_rate: parsePct(row[colIdx['카트 전환율']]),
        purchases: Math.round(parseNum(row[colIdx['구매수']])) || null,
        purchase_conversion_rate: parsePct(row[colIdx['구매 전환율']]),
      })
    }

    if (records.length === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다.' }
    }

    const supabase = await createClient()
    const { error, count } = await supabase
      .from('qoo10_ads_stats')
      .upsert(records, { onConflict: 'qoo10_account_id,date,product_code,ad_name', count: 'exact' })

    if (error) return { success: false, error: error.message }
    return { success: true, inserted: count ?? records.length, updated: 0 }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}
