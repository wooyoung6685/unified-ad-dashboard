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

// USD 금액 ($ 기호 포함, 소수 2자리)
export const fmtUSD = (v: number | null) =>
  v == null
    ? '-'
    : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
