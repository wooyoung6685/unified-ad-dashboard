'use client'

import { fmtDec, fmtKRW, fmtNum } from '@/lib/format'
import type { GmvMaxDailyRow } from '@/types/database'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Props {
  rows: GmvMaxDailyRow[]
}

// 합계행 계산
function calcTotal(rows: GmvMaxDailyRow[]): Omit<GmvMaxDailyRow, 'date' | 'campaign_id' | 'campaign_name'> {
  const cost = rows.reduce((s, r) => s + (r.cost ?? 0), 0)
  const gross_revenue = rows.reduce((s, r) => s + (r.gross_revenue ?? 0), 0)
  const orders = rows.reduce((s, r) => s + (r.orders ?? 0), 0)
  const roi = cost > 0 && gross_revenue > 0 ? gross_revenue / cost : null
  const cost_per_order = orders > 0 ? cost / orders : null

  return { cost, gross_revenue, roi, orders, cost_per_order }
}

export function TiktokGmvMaxDailyTable({ rows }: Props) {
  if (rows.length === 0) return null

  // 날짜별로 집계 (캠페인 여러 개가 같은 날짜에 있을 수 있음)
  const byDate: Record<string, GmvMaxDailyRow[]> = {}
  for (const row of rows) {
    if (!byDate[row.date]) byDate[row.date] = []
    byDate[row.date].push(row)
  }

  // 날짜별 합산 행
  const dateRows = Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayRows]) => {
      const cost = dayRows.reduce((s, r) => s + (r.cost ?? 0), 0)
      const gross_revenue = dayRows.reduce((s, r) => s + (r.gross_revenue ?? 0), 0)
      const orders = dayRows.reduce((s, r) => s + (r.orders ?? 0), 0)
      const roi = cost > 0 && gross_revenue > 0 ? gross_revenue / cost : null
      const cost_per_order = orders > 0 ? cost / orders : null
      return { date, cost, gross_revenue, roi, orders, cost_per_order }
    })

  const total = calcTotal(rows)

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">GMV Max 캠페인</h3>
      <div className="rounded-md border">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-background min-w-[100px]">날짜</TableHead>
                <TableHead className="text-right min-w-[120px]">비용</TableHead>
                <TableHead className="text-right min-w-[120px]">매출</TableHead>
                <TableHead className="text-right min-w-[90px]">ROI</TableHead>
                <TableHead className="text-right min-w-[90px]">주문수</TableHead>
                <TableHead className="text-right min-w-[120px]">주문당 비용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* 합계행 */}
              <TableRow className="bg-muted/50 font-semibold sticky top-0 z-10">
                <TableCell className="sticky left-0 z-20 bg-muted/50 font-semibold">합계</TableCell>
                <TableCell className="text-right">{fmtKRW(total.cost)}</TableCell>
                <TableCell className="text-right">{fmtKRW(total.gross_revenue)}</TableCell>
                <TableCell className="text-right">{fmtDec(total.roi)}</TableCell>
                <TableCell className="text-right">{fmtNum(total.orders)}</TableCell>
                <TableCell className="text-right">{fmtKRW(total.cost_per_order)}</TableCell>
              </TableRow>

              {/* 날짜별 데이터 행 */}
              {dateRows.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="sticky left-0 z-10 bg-background">{row.date.slice(0, 10)}</TableCell>
                  <TableCell className="text-right">{fmtKRW(row.cost)}</TableCell>
                  <TableCell className="text-right">{fmtKRW(row.gross_revenue)}</TableCell>
                  <TableCell className="text-right">{fmtDec(row.roi)}</TableCell>
                  <TableCell className="text-right">{fmtNum(row.orders)}</TableCell>
                  <TableCell className="text-right">{fmtKRW(row.cost_per_order)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
