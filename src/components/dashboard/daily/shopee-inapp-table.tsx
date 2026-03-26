'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtFx, fmtKRW, fmtNum, fmtPct } from '@/lib/format'
import type { ShopeeInappDayRow } from '@/types/database'

interface ShopeeInappTableProps {
  rows: ShopeeInappDayRow[]
}

function calcTotal(rows: ShopeeInappDayRow[]): ShopeeInappDayRow {
  const sum = (key: keyof ShopeeInappDayRow) =>
    rows.reduce((acc, r) => acc + ((r[key] as number | null) ?? 0), 0)

  const hasKrw = rows.some((r) => r.gmv_krw != null)

  const impressions = sum('impressions')
  const clicks = sum('clicks')
  const conversions = sum('conversions')
  const gmv = sum('gmv')
  const expense = sum('expense')

  const gmvKrw = hasKrw ? sum('gmv_krw') : null
  const expenseKrw = hasKrw ? sum('expense_krw') : null

  return {
    date: '합계',
    currency: rows[0]?.currency ?? null,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    conversions,
    direct_conversions: 0,
    conversion_rate: null,
    direct_conversion_rate: null,
    cost_per_conversion: conversions > 0 ? expense / conversions : null,
    cost_per_conversion_krw: null,
    cost_per_direct_conversion: null,
    cost_per_direct_conversion_krw: null,
    items_sold: 0,
    direct_items_sold: 0,
    gmv,
    gmv_krw: gmvKrw,
    direct_gmv: 0,
    direct_gmv_krw: null,
    expense,
    expense_krw: expenseKrw,
    roas: expense > 0 ? gmv / expense : null,
    direct_roas: null,
    acos: null,
    direct_acos: null,
  }
}

export function ShopeeInappTable({ rows }: ShopeeInappTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        조회된 데이터가 없습니다
      </div>
    )
  }

  const totalRow = calcTotal(rows)
  const displayRows = [totalRow, ...rows]
  const currency = rows[0]?.currency ?? ''

  return (
    <div>
      <Table
        className="min-w-400"
        containerClassName="overflow-auto max-h-[calc(100vh-280px)]"
      >
        <TableHeader className="bg-background sticky top-0 z-20">
          <TableRow className="[&_th]:bg-background">
            <TableHead className="bg-background sticky left-0 z-30 w-28 min-w-28">날짜</TableHead>
            <TableHead className="min-w-28 text-right">지출 ({currency})</TableHead>
            <TableHead className="min-w-28 text-right">지출 (KRW)</TableHead>
            <TableHead className="min-w-24 text-right">노출수</TableHead>
            <TableHead className="min-w-24 text-right">클릭수</TableHead>
            <TableHead className="min-w-36 text-right">클릭당 비용 (CPC)</TableHead>
            <TableHead className="min-w-36 text-right">클릭률 (CTR)(%)</TableHead>
            <TableHead className="min-w-28 text-right">구매(전환)수</TableHead>
            <TableHead className="min-w-28 text-right">매출 ({currency})</TableHead>
            <TableHead className="min-w-28 text-right">매출 (KRW)</TableHead>
            <TableHead className="min-w-24 text-right">ROAS(%)</TableHead>
            <TableHead className="min-w-40 text-right">구매(전환)당 비용 (CPA)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map((row, i) => (
            <TableRow
              key={i === 0 ? '__total__' : row.date + i}
              className={
                i === 0
                  ? '[&_td]:bg-muted sticky top-10.25 z-10 font-bold'
                  : undefined
              }
            >
              <TableCell
                className={
                  i === 0
                    ? 'bg-muted sticky left-0 z-20'
                    : 'bg-background sticky left-0 z-1'
                }
              >
                {row.date}
              </TableCell>
              <TableCell className="text-right">{fmtFx(row.expense)}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.expense_krw)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.impressions)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.clicks)}</TableCell>
              <TableCell className="text-right">
                {fmtFx(row.clicks != null && row.clicks > 0 ? row.expense / row.clicks : null)}
              </TableCell>
              <TableCell className="text-right">{fmtPct(row.ctr)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.conversions)}</TableCell>
              <TableCell className="text-right">{fmtFx(row.gmv)}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.gmv_krw)}</TableCell>
              <TableCell className="text-right">
                {fmtPct(row.roas != null ? row.roas * 100 : null)}
              </TableCell>
              <TableCell className="text-right">{fmtFx(row.cost_per_conversion)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
