// TikTok API 응답 파싱 유틸

export function floatOrNull(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  if (value === '-') return 0
  const n = typeof value === 'number' ? value : parseFloat(value as string)
  return isNaN(n) ? null : n
}

export function roundOrNull(value: string | number | null | undefined): number | null {
  const n = floatOrNull(value)
  return n === null ? null : Math.round(n)
}
