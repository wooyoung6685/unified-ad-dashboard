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
