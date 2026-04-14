import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

type ParseResult =
  | { success: true; inserted: number; updated: number }
  | { success: false; error: string }

function parseNum(raw: unknown): number {
  if (raw == null || raw === '') return 0
  if (typeof raw === 'number') return raw
  const str = String(raw).replace(/,/g, '').trim()
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

function parseDate(raw: unknown): string | null {
  if (raw == null) return null
  if (raw instanceof Date) {
    return raw.toISOString().split('T')[0] ?? null
  }
  const str = String(raw).trim()
  if (str === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const d = new Date(str)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0] ?? null
}

export async function parseOrganicTransactionStat(
  fileBuffer: Buffer,
  qoo10AccountId: string,
  brandId: string,
): Promise<ParseResult> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets['data']
    if (!sheet) {
      return { success: false, error: '시트를 찾을 수 없습니다: "data"' }
    }

    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { raw: false })

    const records: Record<string, unknown>[] = []

    for (const row of rows) {
      const date = parseDate(row['시작일'])
      if (!date) continue

      const productName = row['상품명'] ? String(row['상품명']).trim() : null
      if (!productName) continue

      records.push({
        qoo10_account_id: qoo10AccountId,
        brand_id: brandId,
        date,
        product_name: productName,
        transaction_amount: parseNum(row['취소분반영 거래금액']),
        transaction_quantity: Math.round(parseNum(row['취소분반영 거래상품수량'])),
      })
    }

    if (records.length === 0) {
      return { success: false, error: '파싱된 데이터가 없습니다.' }
    }

    const supabase = await createClient()
    const { error, count } = await supabase
      .from('qoo10_organic_transaction_stats')
      .upsert(records, { onConflict: 'qoo10_account_id,date,product_name', count: 'exact' })

    if (error) return { success: false, error: error.message }
    return { success: true, inserted: count ?? records.length, updated: 0 }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '알 수 없는 오류' }
  }
}
