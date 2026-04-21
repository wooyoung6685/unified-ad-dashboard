import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

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

// case-insensitive contains 방식으로 시트 탐색 (시트명 변경 대응)
function findSheet(workbook: XLSX.WorkBook, targetName: string): XLSX.WorkSheet | null {
  const exact = workbook.Sheets[targetName]
  if (exact) return exact
  const lower = targetName.toLowerCase()
  const found = workbook.SheetNames.find((name) => name.toLowerCase().includes(lower))
  return found ? workbook.Sheets[found] : null
}

export async function parseSalesOverview(
  fileBuffer: Buffer,
  shopeeAccountId: string,
  brandId: string,
  country: string,
): Promise<ParseResult> {
  try {
    const isSg = country.toLowerCase() === 'sg'

    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false })

    const sheet = findSheet(workbook, 'Sales Overview')
    if (!sheet) {
      return { success: false, error: '시트를 찾을 수 없습니다: "Sales Overview"' }
    }

    // 시트를 2차원 배열로 변환
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    })

    // 'Date' 컬럼이 있는 행을 동적으로 탐색
    // 구조: 요약 헤더 → 요약 데이터 → 빈 행 → 실제 헤더 → 일별 데이터
    // 두 번째로 나타나는 'Date' 행이 실제 데이터 헤더
    let headerRowIdx = -1
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i] as string[]
      if (String(row[0] ?? '').trim() === 'Date') {
        if (headerRowIdx === -1) {
          headerRowIdx = i // 첫 번째 Date 행 임시 저장
        } else {
          headerRowIdx = i // 두 번째 Date 행이 진짜 헤더
          break
        }
      }
    }

    if (headerRowIdx === -1) {
      return { success: false, error: '헤더에서 날짜 컬럼을 찾을 수 없습니다' }
    }

    const headerRow = rows[headerRowIdx] as string[]
    const colIdx: Record<string, number> = {}
    headerRow.forEach((h, i) => {
      if (h) colIdx[String(h).trim()] = i
    })

    // 컬럼명 후보 중 존재하는 것으로 해결 (버전별 컬럼명 차이 대응)
    const resolveCol = (...candidates: string[]): string | undefined =>
      candidates.find((c) => colIdx[c] !== undefined)

    const unitsKey = resolveCol('Units (Paid Order)', 'Units (Paid Orders)', 'Units(Paid Order)')
    if (!unitsKey) {
      return { success: false, error: '헤더에서 "Units (Paid Order)" 을 찾을 수 없습니다' }
    }

    const records: Record<string, unknown>[] = []

    // 헤더 다음 행부터 데이터 파싱
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const dateRaw = String(row[colIdx['Date']] ?? '').trim()
      if (!dateRaw || dateRaw === '') continue

      const date = parseDate(dateRaw, isSg)
      if (!date) continue

      records.push({
        shopee_account_id: shopeeAccountId,
        brand_id: brandId,
        date,
        units_paid_order: Math.round(parseNum(row[colIdx[unitsKey]])),
      })
    }

    if (records.length === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다' }
    }

    const supabase = await createClient()

    const { error, count } = await supabase
      .from('shopee_sales_overview_stats')
      .upsert(records, { onConflict: 'shopee_account_id,date', count: 'exact' })

    if (error) return { success: false, error: error.message }

    return { success: true, inserted: count ?? records.length, updated: 0 }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' }
  }
}
