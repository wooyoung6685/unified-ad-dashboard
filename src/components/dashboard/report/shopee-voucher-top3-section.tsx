'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtCurrencyWithSymbol } from '@/lib/format'
import type { ShopeeVoucherTopRow } from '@/types/database'

interface Props {
  rows: ShopeeVoucherTopRow[]
}

function fmtNum(value: number | null): string {
  if (value == null) return '-'
  return value.toLocaleString()
}

function fmtPct(value: number | null): string {
  if (value == null) return '-'
  return `${value.toFixed(2)}%`
}

export function ShopeeVoucherTop3Section({ rows }: Props) {
  const currency = rows[0]?.currency ?? ''

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🎟️ 바우처 데이터 Top 3 (Shopee)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap font-bold">바우처 명</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Order</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Usage Rate</TableHead>
                <TableHead className="whitespace-nowrap font-bold">
                  Sales{currency ? `(${currency})` : ''}
                </TableHead>
                <TableHead className="whitespace-nowrap font-bold">
                  Cost{currency ? `(${currency})` : ''}
                </TableHead>
                <TableHead className="whitespace-nowrap font-bold">Units Sold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    바우처 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.voucher_name}>
                    <TableCell className="whitespace-nowrap">{row.voucher_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtNum(row.orders_paid)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtPct(row.usage_rate_paid)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtCurrencyWithSymbol(row.sales_paid, row.currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtCurrencyWithSymbol(row.cost_paid, row.currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtNum(row.units_sold_paid)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
