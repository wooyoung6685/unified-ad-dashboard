'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtFx, fmtNum, fmtPct } from '@/lib/format'
import type { AmazonAdsStat } from '@/types/database'

interface AmazonAdsTableProps {
  rows: AmazonAdsStat[]
}

type TotalRow = {
  date: string
  currency: string | null
  cost: number
  sales: number
  impressions: number
  clicks: number
  roas: number | null
  cpc: number | null
  ctr: number | null
}

function calcTotal(rows: AmazonAdsStat[]): TotalRow {
  const totalCost = rows.reduce((acc, r) => acc + (r.cost ?? 0), 0)
  const totalSales = rows.reduce((acc, r) => acc + (r.sales ?? 0), 0)
  const totalImpressions = rows.reduce((acc, r) => acc + (r.impressions ?? 0), 0)
  const totalClicks = rows.reduce((acc, r) => acc + (r.clicks ?? 0), 0)

  return {
    date: '합계',
    currency: rows[0]?.currency ?? null,
    cost: totalCost,
    sales: totalSales,
    impressions: totalImpressions,
    clicks: totalClicks,
    roas: totalCost > 0 ? totalSales / totalCost : null,
    cpc: totalClicks > 0 ? totalCost / totalClicks : null,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null,
  }
}

export function AmazonAdsTable({ rows }: AmazonAdsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        조회된 데이터가 없습니다
      </div>
    )
  }

  const totalRow = calcTotal(rows)
  const currency = rows[0]?.currency ?? 'USD'

  const dataRows: TotalRow[] = rows.map((r) => ({
    date: r.date,
    currency: r.currency,
    cost: r.cost ?? 0,
    sales: r.sales ?? 0,
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
    roas: r.roas,
    cpc: r.cpc,
    ctr: r.ctr,
  }))

  const displayRows = [totalRow, ...dataRows]

  return (
    <div>
      <Table
        className="min-w-400"
        containerClassName="overflow-auto max-h-[calc(100vh-280px)]"
      >
        <TableHeader className="bg-background sticky top-0 z-20">
          <TableRow className="[&_th]:bg-background">
            <TableHead className="bg-background sticky left-0 z-30 w-28 min-w-28">날짜</TableHead>
            <TableHead className="min-w-32 text-right">전체 광고비 ({currency})</TableHead>
            <TableHead className="min-w-32 text-right">광고 매출 ({currency})</TableHead>
            <TableHead className="min-w-24 text-right">ROAS (%)</TableHead>
            <TableHead className="min-w-28 text-right">광고 노출수</TableHead>
            <TableHead className="min-w-28 text-right">광고 클릭수</TableHead>
            <TableHead className="min-w-32 text-right">CPC ({currency})</TableHead>
            <TableHead className="min-w-28 text-right">CTR (%)</TableHead>
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
              <TableCell className="text-right">{fmtFx(row.cost)}</TableCell>
              <TableCell className="text-right">{fmtFx(row.sales)}</TableCell>
              <TableCell className="text-right">
                {row.roas != null ? fmtPct(row.roas * 100) : '-'}
              </TableCell>
              <TableCell className="text-right">{fmtNum(row.impressions)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.clicks)}</TableCell>
              <TableCell className="text-right">{fmtFx(row.cpc)}</TableCell>
              <TableCell className="text-right">{fmtPct(row.ctr)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
