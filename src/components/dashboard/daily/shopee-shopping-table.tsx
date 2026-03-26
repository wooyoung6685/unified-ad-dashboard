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
import type { ShopeeShoppingStat } from '@/types/database'

interface ShopeeShoppingTableProps {
  rows: ShopeeShoppingStat[]
}

type TotalRow = Omit<ShopeeShoppingStat, 'id' | 'shopee_account_id' | 'brand_id' | 'created_at'>

function calcTotal(rows: ShopeeShoppingStat[]): TotalRow {
  const sum = (key: keyof ShopeeShoppingStat) =>
    rows.reduce((acc, r) => acc + ((r[key] as number | null) ?? 0), 0)

  const hasKrw = rows.some((r) => r.sales_krw != null)

  const totalSales = sum('sales')
  const totalSalesKrw = hasKrw ? sum('sales_krw') : null
  const totalOrders = sum('orders')
  const totalVisitors = sum('visitors')
  const totalBuyers = sum('buyers')
  const totalExistingBuyers = sum('existing_buyers')
  const totalNewBuyers = sum('new_buyers')
  const hasSpend = rows.some((r) => r.spend_krw != null)
  const totalSpendKrw = hasSpend ? rows.reduce((acc, r) => acc + (r.spend_krw ?? 0), 0) : null

  return {
    date: '합계',
    currency: rows[0]?.currency ?? null,
    spend_krw: totalSpendKrw,
    sales: totalSales,
    sales_krw: totalSalesKrw,
    sales_without_rebate: rows.some((r) => r.sales_without_rebate != null)
      ? sum('sales_without_rebate')
      : null,
    sales_without_rebate_krw:
      hasKrw && rows.some((r) => r.sales_without_rebate_krw != null)
        ? sum('sales_without_rebate_krw')
        : null,
    orders: totalOrders,
    sales_per_order: totalOrders > 0 ? totalSales / totalOrders : null,
    sales_per_order_krw:
      hasKrw && totalOrders > 0 && totalSalesKrw != null ? totalSalesKrw / totalOrders : null,
    product_clicks: sum('product_clicks'),
    visitors: totalVisitors,
    order_conversion_rate: totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : null,
    cancelled_orders: sum('cancelled_orders'),
    cancelled_sales: sum('cancelled_sales'),
    cancelled_sales_krw: hasKrw ? sum('cancelled_sales_krw') : null,
    refunded_orders: sum('refunded_orders'),
    refunded_sales: sum('refunded_sales'),
    refunded_sales_krw: hasKrw ? sum('refunded_sales_krw') : null,
    buyers: totalBuyers,
    new_buyers: totalNewBuyers,
    existing_buyers: totalExistingBuyers,
    potential_buyers: sum('potential_buyers'),
    repeat_purchase_rate:
      totalBuyers > 0 ? (totalExistingBuyers / totalBuyers) * 100 : null,
  }
}

export function ShopeeShoppingTable({ rows }: ShopeeShoppingTableProps) {
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
        className="min-w-390"
        containerClassName="overflow-auto max-h-[calc(100vh-280px)]"
      >
        <TableHeader className="bg-background sticky top-0 z-20">
          <TableRow className="[&_th]:bg-background">
            <TableHead className="bg-background sticky left-0 z-30 w-28 min-w-28">날짜</TableHead>
            <TableHead className="min-w-28 text-right">지출 (KRW)</TableHead>
            <TableHead className="min-w-28 text-right">구매(전환)수</TableHead>
            <TableHead className="min-w-32 text-right">매출 ({currency})</TableHead>
            <TableHead className="min-w-32 text-right">매출 (KRW)</TableHead>
            <TableHead className="min-w-24 text-right">ROAS(%)</TableHead>
            <TableHead className="min-w-36 text-right">클릭당 비용 (CPC)</TableHead>
            <TableHead className="min-w-40 text-right">구매(전환)당 비용 (CPA)</TableHead>
            <TableHead className="min-w-24 text-right">방문자수</TableHead>
            <TableHead className="min-w-24 text-right">페이지뷰</TableHead>
            <TableHead className="min-w-28 text-right">전환율(%)</TableHead>
            <TableHead className="min-w-32 text-right">객단가 ({currency})</TableHead>
            <TableHead className="min-w-32 text-right">객단가 (KRW)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map((row, i) => (
            <TableRow
              key={i === 0 ? '__total__' : (row as ShopeeShoppingStat).id}
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
              <TableCell className="text-right">{fmtKRW(row.spend_krw ?? null)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.orders)}</TableCell>
              <TableCell className="text-right">{fmtFx(row.sales)}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.sales_krw)}</TableCell>
              <TableCell className="text-right">
                {row.spend_krw && row.sales_krw
                  ? fmtPct(row.sales_krw / row.spend_krw)
                  : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.spend_krw && row.product_clicks
                  ? fmtKRW(row.spend_krw / row.product_clicks)
                  : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.spend_krw && row.orders
                  ? fmtKRW(row.spend_krw / row.orders)
                  : '-'}
              </TableCell>
              <TableCell className="text-right">{fmtNum(row.visitors)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.product_clicks)}</TableCell>
              <TableCell className="text-right">{fmtPct(row.order_conversion_rate)}</TableCell>
              <TableCell className="text-right">{fmtFx(row.sales_per_order)}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.sales_per_order_krw)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
