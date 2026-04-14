'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtKRW, fmtNum, fmtPct } from '@/lib/format'

const fmtJPY = (v: number | null) =>
  v == null ? '-' : `¥${Math.round(v).toLocaleString('ko-KR')}`
import type { Qoo10OrganicTransactionStat, Qoo10OrganicVisitorStat } from '@/types/database'
import { useMemo } from 'react'

interface Qoo10OrganicTableProps {
  visitorRows: Qoo10OrganicVisitorStat[]
  transactionRows: Qoo10OrganicTransactionStat[]
  fxRates: Record<string, number>
}

type DailyRow = {
  date: string
  salesJpy: number
  salesKrw: number | null
  qty: number
  sessions: number | null
  cart: number | null
  conversionRate: number | null
  aov: number | null
}

function calcTotal(rows: DailyRow[]): DailyRow {
  const totalSalesJpy = rows.reduce((acc, r) => acc + r.salesJpy, 0)
  const totalSalesKrw = rows.every((r) => r.salesKrw != null)
    ? rows.reduce((acc, r) => acc + (r.salesKrw ?? 0), 0)
    : null
  const totalQty = rows.reduce((acc, r) => acc + r.qty, 0)
  const totalSessions = rows.reduce((acc, r) => acc + (r.sessions ?? 0), 0)
  const totalCart = rows.reduce((acc, r) => acc + (r.cart ?? 0), 0)

  return {
    date: '합계',
    salesJpy: totalSalesJpy,
    salesKrw: totalSalesKrw,
    qty: totalQty,
    sessions: totalSessions > 0 ? totalSessions : null,
    cart: totalCart > 0 ? totalCart : null,
    conversionRate:
      totalSessions > 0 ? (totalQty / totalSessions) * 100 : null,
    aov: totalQty > 0 ? totalSalesJpy / totalQty : null,
  }
}

export function Qoo10OrganicTable({
  visitorRows,
  transactionRows,
  fxRates,
}: Qoo10OrganicTableProps) {
  const rows = useMemo<DailyRow[]>(() => {
    // transaction_rows를 날짜별로 집계
    const txMap = new Map<string, { salesJpy: number; qty: number }>()
    for (const r of transactionRows) {
      const prev = txMap.get(r.date) ?? { salesJpy: 0, qty: 0 }
      txMap.set(r.date, {
        salesJpy: prev.salesJpy + (r.transaction_amount ?? 0),
        qty: prev.qty + (r.transaction_quantity ?? 0),
      })
    }

    // visitor_rows를 날짜별로 맵핑
    const visitorMap = new Map<string, { sessions: number | null; cart: number | null }>()
    for (const r of visitorRows) {
      visitorMap.set(r.date, { sessions: r.visitors, cart: r.add_to_cart })
    }

    // 두 맵의 날짜 합집합 정렬
    const dates = Array.from(
      new Set([...txMap.keys(), ...visitorMap.keys()])
    ).sort()

    return dates.map((date) => {
      const tx = txMap.get(date) ?? { salesJpy: 0, qty: 0 }
      const visitor = visitorMap.get(date) ?? { sessions: null, cart: null }
      const yyyyMM = date.slice(0, 7)
      const rate = fxRates[yyyyMM]
      const salesKrw = rate != null ? tx.salesJpy * rate : null

      return {
        date,
        salesJpy: tx.salesJpy,
        salesKrw,
        qty: tx.qty,
        sessions: visitor.sessions,
        cart: visitor.cart,
        conversionRate:
          (visitor.sessions ?? 0) > 0
            ? (tx.qty / (visitor.sessions ?? 0)) * 100
            : null,
        aov: tx.qty > 0 ? tx.salesJpy / tx.qty : null,
      }
    })
  }, [visitorRows, transactionRows, fxRates])

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        조회된 데이터가 없습니다
      </div>
    )
  }

  const totalRow = calcTotal(rows)
  const displayRows = [totalRow, ...rows]

  return (
    <div>
      <Table
        className="min-w-300"
        containerClassName="overflow-auto max-h-[calc(100vh-280px)]"
      >
        <TableHeader className="bg-background sticky top-0 z-20">
          <TableRow className="[&_th]:bg-background">
            <TableHead className="bg-background sticky left-0 z-30 w-28 min-w-28">날짜</TableHead>
            <TableHead className="min-w-32 text-right">매출 (JPY)</TableHead>
            <TableHead className="min-w-32 text-right">매출 (KRW)</TableHead>
            <TableHead className="min-w-24 text-right">판매수</TableHead>
            <TableHead className="min-w-28 text-right">세션 수</TableHead>
            <TableHead className="min-w-24 text-right">전환율</TableHead>
            <TableHead className="min-w-32 text-right">AOV (JPY)</TableHead>
            <TableHead className="min-w-24 text-right">장바구니</TableHead>
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
              <TableCell className="text-right">{fmtJPY(row.salesJpy)}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.salesKrw)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.qty)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.sessions)}</TableCell>
              <TableCell className="text-right">{fmtPct(row.conversionRate)}</TableCell>
              <TableCell className="text-right">{fmtJPY(row.aov)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.cart)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
