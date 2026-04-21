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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { fmtCurrencyWithSymbol } from '@/lib/format'
import type { ShopeeProductTopRow } from '@/types/database'

interface Props {
  rows: ShopeeProductTopRow[]
}

function fmtNum(value: number | null): string {
  if (value == null) return '-'
  return value.toLocaleString()
}

function fmtPct(value: number | null): string {
  if (value == null) return '-'
  return `${value.toFixed(2)}%`
}

function truncateName(name: string, max = 50): { display: string; truncated: boolean } {
  if (name.length <= max) return { display: name, truncated: false }
  return { display: name.slice(0, max) + '...', truncated: true }
}

const STICKY_HEAD = 'sticky left-0 z-10 bg-background border-r w-[280px] min-w-[280px] max-w-[280px] overflow-hidden whitespace-nowrap font-bold'
const STICKY_CELL = 'sticky left-0 z-10 bg-background border-r w-[280px] min-w-[280px] max-w-[280px] overflow-hidden whitespace-nowrap'

export function ShopeeProductTop5Section({ rows }: Props) {
  const currency = rows[0]?.currency ?? ''

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🛍️ 프로덕트 퍼포먼스 Sales TOP 5 (Shopee)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={STICKY_HEAD}>Product</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Product Visitors (Visit)</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Product Page Views</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Product Visitors (Add)</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Units (Add to Cart)</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Conversion Rate (Add to Cart)</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Buyers (Confirmed Order)</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Units (Confirmed)</TableHead>
                <TableHead className="whitespace-nowrap font-bold">
                  Sales{currency ? `(${currency})` : ''}
                </TableHead>
                <TableHead className="whitespace-nowrap font-bold">Conversion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                    프로덕트 퍼포먼스 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const { display, truncated } = truncateName(row.product_name ?? '')
                  return (
                    <TableRow key={row.product_name}>
                      <TableCell className={STICKY_CELL}>
                        {truncated ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{display}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">{row.product_name}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span>{display}</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fmtNum(row.product_visitors)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtNum(row.product_page_views)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtNum(row.add_to_cart_visitors)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtNum(row.add_to_cart_units)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtPct(row.add_to_cart_conv_rate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtNum(row.buyers_paid)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtNum(row.units_paid)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fmtCurrencyWithSymbol(row.sales_confirmed, row.currency)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fmtPct(row.order_conv_rate_paid)}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
