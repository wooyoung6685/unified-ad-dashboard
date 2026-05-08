interface ReportMeta {
  brand_name: string
  platform: string
  country?: string | null
  year: number
  month: number
}

export function makeFileName(report: ReportMeta): string {
  const month = String(report.month).padStart(2, '0')
  const parts = [
    report.brand_name,
    report.platform,
    report.country ?? '',
    `${report.year}-${month}`,
  ].filter(Boolean)
  return `${parts.join('_')}.pdf`
}

export function parseFileNameFromContentDisposition(header: string): string | null {
  // filename*=UTF-8''encoded 형태 파싱
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return null
    }
  }
  // 일반 filename="..." 형태
  const plainMatch = header.match(/filename="([^"]+)"/i)
  return plainMatch ? plainMatch[1] : null
}
