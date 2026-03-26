import { getDaysInMonth } from 'date-fns'
import type { GmvMaxWeeklyData, MetaWeeklyData, ShopeeWeeklyData, TiktokWeeklyData } from '@/types/database'
import { divOrNull, sumRows, type ShopeeInappRow, type TiktokDailyRow } from './aggregators'

type MetaDailyRow = {
  date: string
  spend: number | null
  revenue: number | null
  impressions: number | null
  reach: number | null
  clicks: number | null
  purchases: number | null
  add_to_cart: number | null
  add_to_cart_value: number | null
}

type WeekRange = {
  week: number
  start: number
  end: number
  label: string
}

export function getWeekRanges(year: number, month: number): WeekRange[] {
  const lastDay = getDaysInMonth(new Date(year, month - 1))
  return [
    { week: 1, start: 1, end: 7, label: `${month}/1 - ${month}/7` },
    { week: 2, start: 8, end: 14, label: `${month}/8 - ${month}/14` },
    { week: 3, start: 15, end: 21, label: `${month}/15 - ${month}/21` },
    { week: 4, start: 22, end: lastDay, label: `${month}/22 - ${month}/${lastDay}` },
  ]
}

export function getWeekNumber(day: number): number {
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

export function groupMetaByWeek(
  rows: MetaDailyRow[],
  year: number,
  month: number,
): MetaWeeklyData[] {
  const weekRanges = getWeekRanges(year, month)
  const weekMap = new Map<number, MetaDailyRow[]>()
  weekRanges.forEach((w) => weekMap.set(w.week, []))

  for (const row of rows) {
    const day = parseInt(row.date.slice(8, 10), 10)
    weekMap.get(getWeekNumber(day))?.push(row)
  }

  return weekRanges.map(({ week, label }) => {
    const rs = weekMap.get(week) ?? []
    const spend = sumRows(rs.map((r) => r.spend))
    const revenue = sumRows(rs.map((r) => r.revenue))
    const impressions = sumRows(rs.map((r) => r.impressions))
    const reach = sumRows(rs.map((r) => r.reach))
    const clicks = sumRows(rs.map((r) => r.clicks))
    const purchases = sumRows(rs.map((r) => r.purchases))
    const add_to_cart = sumRows(rs.map((r) => r.add_to_cart))
    const add_to_cart_value = sumRows(rs.map((r) => r.add_to_cart_value))
    return {
      week,
      date_range: label,
      spend: spend || null,
      revenue: revenue || null,
      roas: divOrNull(revenue * 100, spend),
      purchases: purchases || null,
      impressions: impressions || null,
      reach: reach || null,
      frequency: divOrNull(impressions, reach),
      cpm: divOrNull(spend * 1000, impressions),
      clicks: clicks || null,
      ctr: divOrNull(clicks * 100, impressions),
      cpc: divOrNull(spend, clicks),
      add_to_cart: add_to_cart || null,
      add_to_cart_value: add_to_cart_value || null,
    }
  })
}

export function groupShopeeByWeek(
  rows: ShopeeInappRow[],
  year: number,
  month: number,
): ShopeeWeeklyData[] {
  // ads_type 복수 행 → 날짜별 합산
  type DayAgg = {
    impressions: number
    clicks: number
    conversions: number
    expense_krw: number
    gmv_krw: number
  }
  const dayMap = new Map<string, DayAgg>()
  for (const row of rows) {
    const existing = dayMap.get(row.date) ?? {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      expense_krw: 0,
      gmv_krw: 0,
    }
    dayMap.set(row.date, {
      impressions: existing.impressions + (row.impressions ?? 0),
      clicks: existing.clicks + (row.clicks ?? 0),
      conversions: existing.conversions + (row.conversions ?? 0),
      expense_krw: existing.expense_krw + (row.expense_krw ?? 0),
      gmv_krw: existing.gmv_krw + (row.gmv_krw ?? 0),
    })
  }

  const weekRanges = getWeekRanges(year, month)
  const weekMap = new Map<number, DayAgg[]>()
  weekRanges.forEach((w) => weekMap.set(w.week, []))

  for (const [date, values] of dayMap) {
    const day = parseInt(date.slice(8, 10), 10)
    weekMap.get(getWeekNumber(day))?.push(values)
  }

  return weekRanges.map(({ week, label }) => {
    const rs = weekMap.get(week) ?? []
    const spend_krw = rs.reduce((acc, r) => acc + r.expense_krw, 0)
    const revenue_krw = rs.reduce((acc, r) => acc + r.gmv_krw, 0)
    const purchases = rs.reduce((acc, r) => acc + r.conversions, 0)
    const clicks = rs.reduce((acc, r) => acc + r.clicks, 0)
    const impressions = rs.reduce((acc, r) => acc + r.impressions, 0)
    return {
      week,
      date_range: label,
      impressions: impressions || null,
      clicks: clicks || null,
      cpc_krw: divOrNull(spend_krw, clicks),
      ctr: divOrNull(clicks * 100, impressions),
      spend_krw: spend_krw || null,
      purchases: purchases || null,
      revenue_krw: revenue_krw || null,
      roas: divOrNull(revenue_krw * 100, spend_krw),
      conversion_rate: divOrNull(purchases * 100, clicks),
    }
  })
}

export function groupTiktokByWeek(
  rows: TiktokDailyRow[],
  year: number,
  month: number,
): TiktokWeeklyData[] {
  const weekRanges = getWeekRanges(year, month)
  const weekMap = new Map<number, TiktokDailyRow[]>()
  weekRanges.forEach((w) => weekMap.set(w.week, []))

  for (const row of rows) {
    const day = parseInt(row.date.slice(8, 10), 10)
    weekMap.get(getWeekNumber(day))?.push(row)
  }

  return weekRanges.map(({ week, label }) => {
    const rs = weekMap.get(week) ?? []
    const spend = sumRows(rs.map((r) => r.spend))
    const revenue = sumRows(rs.map((r) => r.revenue))
    const impressions = sumRows(rs.map((r) => r.impressions))
    const reach = sumRows(rs.map((r) => r.reach))
    const clicks = sumRows(rs.map((r) => r.clicks))
    const purchases = sumRows(rs.map((r) => r.purchases))
    const video_views = sumRows(rs.map((r) => r.video_views))
    const add_to_cart = sumRows(rs.map((r) => r.add_to_cart))
    const add_to_cart_value = sumRows(rs.map((r) => r.add_to_cart_value))
    return {
      week,
      date_range: label,
      spend: spend || null,
      revenue: revenue || null,
      roas: divOrNull(revenue * 100, spend),
      purchases: purchases || null,
      impressions: impressions || null,
      reach: reach || null,
      frequency: divOrNull(impressions, reach),
      cpm: divOrNull(spend * 1000, impressions),
      clicks: clicks || null,
      cpc: divOrNull(spend, clicks),
      ctr: divOrNull(clicks * 100, impressions),
      video_views: video_views || null,
      add_to_cart: add_to_cart || null,
      add_to_cart_value: add_to_cart_value || null,
    }
  })
}

type GmvMaxDailyInput = {
  date: string
  cost: number | null
  gross_revenue: number | null
  orders: number | null
}

export function groupGmvMaxByWeek(
  rows: GmvMaxDailyInput[],
  year: number,
  month: number,
): GmvMaxWeeklyData[] {
  const weekRanges = getWeekRanges(year, month)
  const weekMap = new Map<number, GmvMaxDailyInput[]>()
  weekRanges.forEach((w) => weekMap.set(w.week, []))

  for (const row of rows) {
    const day = parseInt(row.date.slice(8, 10), 10)
    weekMap.get(getWeekNumber(day))?.push(row)
  }

  return weekRanges.map(({ week, label }) => {
    const rs = weekMap.get(week) ?? []
    const cost = sumRows(rs.map((r) => r.cost))
    const gross_revenue = sumRows(rs.map((r) => r.gross_revenue))
    const orders = sumRows(rs.map((r) => r.orders))
    return {
      week,
      date_range: label,
      cost: cost || null,
      gross_revenue: gross_revenue || null,
      roi: divOrNull(gross_revenue * 100, cost),
      orders: orders || null,
      cost_per_order: divOrNull(cost, orders),
    }
  })
}
