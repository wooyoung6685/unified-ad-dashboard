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
import type { AmazonOrganicStat } from '@/types/database'

interface AmazonOrganicTableProps {
  rows: AmazonOrganicStat[]
}

type TotalRow = {
  date: string
  currency: string | null
  ordered_product_sales: number
  orders: number
  sessions: number
  conversion_rate: number | null
  aov: number | null
}

function calcTotal(rows: AmazonOrganicStat[]): TotalRow {
  const totalSales = rows.reduce((acc, r) => acc + (r.ordered_product_sales ?? 0), 0)
  const totalOrders = rows.reduce((acc, r) => acc + (r.orders ?? 0), 0)
  const totalSessions = rows.reduce((acc, r) => acc + (r.sessions ?? 0), 0)

  return {
    date: '합계',
    currency: rows[0]?.currency ?? null,
    ordered_product_sales: totalSales,
    orders: totalOrders,
    sessions: totalSessions,
    conversion_rate: totalSessions > 0 ? (totalOrders / totalSessions) * 100 : null,
    aov: totalOrders > 0 ? totalSales / totalOrders : null,
  }
}

export function AmazonOrganicTable({ rows }: AmazonOrganicTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        조회된 데이터가 없습니다
      </div>
    )
  }

  const totalRow = calcTotal(rows)
  const currency = rows[0]?.currency ?? 'USD'

  // 각 데이터 행을 TotalRow 형태로 변환
  const dataRows: TotalRow[] = rows.map((r) => ({
    date: r.date,
    currency: r.currency,
    ordered_product_sales: r.ordered_product_sales ?? 0,
    orders: r.orders ?? 0,
    sessions: r.sessions ?? 0,
    conversion_rate: (r.sessions ?? 0) > 0
      ? ((r.orders ?? 0) / (r.sessions ?? 0)) * 100
      : null,
    aov: (r.orders ?? 0) > 0
      ? (r.ordered_product_sales ?? 0) / (r.orders ?? 0)
      : null,
  }))

  const displayRows = [totalRow, ...dataRows]

  return (
    <div>
      <Table
        className="min-w-300"
        containerClassName="overflow-auto max-h-[calc(100vh-280px)]"
      >
        <TableHeader className="bg-background sticky top-0 z-20">
          <TableRow className="[&_th]:bg-background">
            <TableHead className="bg-background sticky left-0 z-30 w-28 min-w-28">날짜</TableHead>
            <TableHead className="min-w-32 text-right">전체 매출 ({currency})</TableHead>
            <TableHead className="min-w-24 text-right">구매수</TableHead>
            <TableHead className="min-w-28 text-right">전체 세션수</TableHead>
            <TableHead className="min-w-28 text-right">전환율 (%)</TableHead>
            <TableHead className="min-w-32 text-right">AOV ({currency})</TableHead>
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
              <TableCell className="text-right">{fmtFx(row.ordered_product_sales)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.orders)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.sessions)}</TableCell>
              <TableCell className="text-right">{fmtPct(row.conversion_rate)}</TableCell>
              <TableCell className="text-right">{fmtFx(row.aov)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
