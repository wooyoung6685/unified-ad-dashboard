// 숫자 포맷 유틸
export const fmtKRW = (v: number | null) =>
  v == null ? '-' : `₩${Math.round(v).toLocaleString('ko-KR')}`

export const fmtNum = (v: number | null) =>
  v == null ? '-' : Math.round(v).toLocaleString('ko-KR')

export const fmtPct = (v: number | null) =>
  v == null ? '-' : `${v.toFixed(2)}%`

export const fmtDec = (v: number | null) => (v == null ? '-' : v.toFixed(2))

export const fmtKRWDec = (v: number | null) =>
  v == null ? '-' : `₩${v.toFixed(2)}`

// 외화 금액 (소수 2자리, 통화 기호 없음 - 헤더에 명시)
export const fmtFx = (v: number | null) =>
  v == null
    ? '-'
    : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// JPY 금액 (¥ 기호 포함, 정수)
export const fmtJPY = (v: number | null) =>
  v == null ? '-' : `¥${Math.round(v).toLocaleString('ja-JP')}`

// USD 금액 ($ 기호 포함, 소수 2자리)
export const fmtUSD = (v: number | null) =>
  v == null
    ? '-'
    : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// 통화 코드 → 현지 심볼 매핑 (쇼피 7개 마켓 + 기타)
const CURRENCY_SYMBOLS: Record<string, string> = {
  SGD: '$',
  MYR: 'RM',
  IDR: 'Rp',
  THB: '฿',
  PHP: '₱',
  VND: '₫',
  TWD: 'NT$',
  USD: '$',
  JPY: '¥',
  KRW: '₩',
}

// 통화별 기본 소수 자리수 (Shopee 데이터 기준)
const CURRENCY_DEFAULT_DECIMALS: Record<string, number> = {
  IDR: 0,
  VND: 0,
  JPY: 0,
  KRW: 0,
}

// 외화 금액을 통화 코드에 맞는 심볼과 함께 포맷 (예: "RM20.00", "฿20.00").
// 통화 정체성은 테이블 헤더(예: "Sales(MYR)")에서 ISO 코드로 명시하는 것을 전제로 함.
// decimals 미지정 시 통화별 기본값(없으면 2) 사용.
export function fmtCurrencyWithSymbol(
  v: number | null,
  currency: string,
  decimals?: number,
): string {
  if (v == null) return '-'
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `
  const d = decimals ?? CURRENCY_DEFAULT_DECIMALS[currency] ?? 2
  return `${symbol}${v.toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })}`
}

// 지표 포맷 타입별 공용 포맷 함수
export function formatMetricValue(v: number | null, format: 'krw' | 'pct' | 'num'): string {
  const val = v ?? 0
  if (format === 'krw') return fmtKRW(val)
  if (format === 'pct') return fmtPct(val)
  return fmtNum(val)
}
