// Shopee 마켓 country 코드 → ISO 통화 코드 매핑
// shopee_accounts.country 컬럼 기준 (소문자 2자리: sg/my/ph/th/id/vn/tw)
export const SHOPEE_CURRENCY_MAP: Record<string, string> = {
  sg: 'SGD',
  my: 'MYR',
  ph: 'PHP',
  th: 'THB',
  id: 'IDR',
  vn: 'VND',
  tw: 'TWD',
}

export function countryToCurrency(country: string): string {
  return SHOPEE_CURRENCY_MAP[country.toLowerCase()] ?? country.toUpperCase()
}
