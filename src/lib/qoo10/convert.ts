/**
 * JPY → KRW 환산 유틸리티
 * fxRates: { 'YYYY-MM': rate } 형식의 월별 환율 맵
 */
export function jpyToKrw(
  amountJpy: number,
  date: string,
  fxRates: Record<string, number>
): number | null {
  const yyyyMM = date.slice(0, 7)
  const rate = fxRates[yyyyMM]
  if (rate == null) return null
  return amountJpy * rate
}
