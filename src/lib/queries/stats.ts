import { createClient } from '@/lib/supabase/client'
import type {
  DailyStatRow,
  DashboardFilters,
  KpiSummary,
  MetaDailyStat,
  TiktokDailyStat,
} from '@/types/database'
import { format, subDays } from 'date-fns'

// 날짜 범위 계산
export function resolveDateRange(filters: DashboardFilters): {
  from: string
  to: string
} {
  const today = new Date()
  const toStr = format(today, 'yyyy-MM-dd')

  switch (filters.range) {
    case '1d':
      return { from: toStr, to: toStr }
    case '7d':
      return { from: format(subDays(today, 6), 'yyyy-MM-dd'), to: toStr }
    case '30d':
      return { from: format(subDays(today, 29), 'yyyy-MM-dd'), to: toStr }
    case 'custom':
      return {
        from: filters.from ?? format(subDays(today, 6), 'yyyy-MM-dd'),
        to: filters.to ?? toStr,
      }
    default:
      return { from: format(subDays(today, 6), 'yyyy-MM-dd'), to: toStr }
  }
}

// Supabase numeric 타입을 number로 변환하는 헬퍼
function toNum(v: number | null | undefined): number {
  if (v == null) return 0
  return parseFloat(String(v))
}

// Meta + TikTok 통계를 날짜별로 합산
export function mergeStats(
  meta: MetaDailyStat[],
  tiktok: TiktokDailyStat[],
): DailyStatRow[] {
  const map = new Map<string, DailyStatRow>()

  const ensureDate = (date: string) => {
    if (!map.has(date)) {
      map.set(date, {
        date,
        totalSpend: 0,
        metaSpend: 0,
        tiktokSpend: 0,
        totalRevenue: 0,
        metaRevenue: 0,
        tiktokRevenue: 0,
        roas: 0,
        purchases: 0,
      })
    }
    return map.get(date)!
  }

  for (const s of meta) {
    const row = ensureDate(s.date)
    row.metaSpend += toNum(s.spend)
    row.metaRevenue += toNum(s.revenue)
    row.purchases += toNum(s.purchases)
  }

  for (const s of tiktok) {
    const row = ensureDate(s.date)
    row.tiktokSpend += toNum(s.spend)
    row.tiktokRevenue += toNum(s.revenue)
    row.purchases += toNum(s.purchases)
  }

  // totalSpend / totalRevenue / roas 계산
  for (const row of map.values()) {
    row.totalSpend = row.metaSpend + row.tiktokSpend
    row.totalRevenue = row.metaRevenue + row.tiktokRevenue
    row.roas = row.totalSpend > 0 ? row.totalRevenue / row.totalSpend : 0
  }

  // 날짜 오름차순 정렬
  return Array.from(map.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  )
}

// KPI 집계
export function calcKpi(rows: DailyStatRow[]): KpiSummary {
  const totalSpend = rows.reduce((acc, r) => acc + r.totalSpend, 0)
  const totalRevenue = rows.reduce((acc, r) => acc + r.totalRevenue, 0)
  const totalPurchases = rows.reduce((acc, r) => acc + r.purchases, 0)
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0

  return { totalSpend, totalRevenue, roas, totalPurchases }
}

// 대시보드 통계 fetch (브라우저 Supabase 클라이언트 사용, RLS 자동 적용)
export async function fetchDashboardStats(filters: DashboardFilters) {
  const supabase = createClient()
  const { from, to } = resolveDateRange(filters)

  let metaQuery = supabase
    .from('meta_daily_stats')
    .select('*')
    .gte('date', from)
    .lte('date', to)

  let tiktokQuery = supabase
    .from('tiktok_daily_stats')
    .select('*')
    .gte('date', from)
    .lte('date', to)

  // 특정 계정 필터 (플랫폼별)
  if (filters.platform === 'meta' && filters.accountId !== 'all') {
    metaQuery = metaQuery.eq('meta_account_id', filters.accountId)
    // TikTok 쿼리는 빈 결과 반환을 위해 불가능한 조건 추가
    tiktokQuery = tiktokQuery.eq('id', 'none')
  } else if (filters.platform === 'tiktok' && filters.accountId !== 'all') {
    tiktokQuery = tiktokQuery.eq('tiktok_account_id', filters.accountId)
    metaQuery = metaQuery.eq('id', 'none')
  } else if (filters.platform === 'meta') {
    // 플랫폼이 meta인 경우 tiktok 데이터 제외
    tiktokQuery = tiktokQuery.eq('id', 'none')
  } else if (filters.platform === 'tiktok') {
    // 플랫폼이 tiktok인 경우 meta 데이터 제외
    metaQuery = metaQuery.eq('id', 'none')
  }

  const [metaResult, tiktokResult] = await Promise.all([metaQuery, tiktokQuery])

  const metaStats = (metaResult.data ?? []) as MetaDailyStat[]
  const tiktokStats = (tiktokResult.data ?? []) as TiktokDailyStat[]

  return mergeStats(metaStats, tiktokStats)
}
