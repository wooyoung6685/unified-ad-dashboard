// RFC 4180 준수 CSV 행 파싱 (따옴표 안의 쉼표 처리)
export function parseCsvLine(line: string): string[] {
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

// YY. M. D. → YYYY-MM-DD (오가닉/ASIN 날짜 형식)
export function parseShortDate(raw: string): string | null {
  // "26. 4. 1." 형식
  const cleaned = raw.trim().replace(/\.$/, '')
  const parts = cleaned.split('.').map((p) => p.trim()).filter(Boolean)
  if (parts.length !== 3) return null
  const [yy, mm, dd] = parts
  if (!yy || !mm || !dd) return null
  const year = 2000 + parseInt(yy, 10)
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// YYYY. M. D. → YYYY-MM-DD (광고 날짜 형식)
export function parseLongDate(raw: string): string | null {
  // "2026. 4. 7." 형식
  const cleaned = raw.trim().replace(/\.$/, '')
  const parts = cleaned.split('.').map((p) => p.trim()).filter(Boolean)
  if (parts.length !== 3) return null
  const [yyyy, mm, dd] = parts
  if (!yyyy || !mm || !dd) return null
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// "US$3,620.53" → { value: 3620.53, currency: 'USD' }
export function parseMoney(raw: string): { value: number; currency: string | null } {
  const trimmed = raw.trim()
  // 통화 기호 추출 (예: US$, $ 등)
  const currencyMatch = trimmed.match(/^([A-Z]{2,3})\$/)
  const currency = currencyMatch ? currencyMatch[1] + 'D' : null
  // 통화 기호, 공백, 콤마 제거 후 파싱
  const numStr = trimmed.replace(/[A-Z$,\s]/g, '')
  const value = parseFloat(numStr)
  return { value: isNaN(value) ? 0 : value, currency }
}

// "97.63%" → 97.63
export function parsePct(raw: string): number {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return 0
  return parseFloat(raw.replace('%', '').replace(/,/g, '').trim()) || 0
}

// 숫자 파싱: 콤마/공백 제거
export function parseNum(raw: string | undefined): number {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return 0
  const str = raw.replace(/,/g, '').replace(/%/g, '').trim()
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}
