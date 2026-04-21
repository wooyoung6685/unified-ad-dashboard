'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fmtCurrencyWithSymbol } from '@/lib/format'
import type { ShopeeAdsTopRow, ShopeeAdsTopTotalRow } from '@/types/database'
import type { ReactNode } from 'react'

interface Props {
  rows: ShopeeAdsTopRow[]
  total: ShopeeAdsTopTotalRow
  currency: string
  fxRateKrw: number | null
  headerAction?: ReactNode
}

function fmtNum(v: number | null) {
  return v == null ? '-' : v.toLocaleString()
}

function fmtPct(v: number | null) {
  return v == null ? '-' : `${v.toFixed(2)}%`
}

function fmtKRW(v: number | null) {
  if (v == null) return '-'
  return `₩${Math.round(v).toLocaleString()}`
}

function fmtRoasPct(v: number | null) {
  if (v == null) return '-'
  return `${(v * 100).toFixed(2)}%`
}

function truncateName(name: string, max = 50) {
  if (!name) return { display: '', truncated: false }
  if (name.length <= max) return { display: name, truncated: false }
  return { display: name.slice(0, max) + '...', truncated: true }
}

const STICKY_HEAD =
  'sticky left-0 z-10 bg-background border-r w-[280px] min-w-[280px] max-w-[280px] overflow-hidden whitespace-nowrap font-bold'
const STICKY_CELL =
  'sticky left-0 z-10 bg-background border-r w-[280px] min-w-[280px] max-w-[280px] overflow-hidden whitespace-nowrap'
const ROAS_CELL = 'whitespace-nowrap bg-yellow-100/60'

export function ShopeeAdsRoasTop5Section({ rows, total, currency, fxRateKrw, headerAction }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">🎯 Shopee Ads (ROAS TOP 5)</CardTitle>
        <div className="flex items-center gap-3">
          {headerAction}
          <div className="text-xs text-muted-foreground">
            환율({currency}){' '}
            {fxRateKrw == null
              ? '-'
              : `₩${fxRateKrw.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={STICKY_HEAD}>Product</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Impression</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Clicks</TableHead>
                <TableHead className="whitespace-nowrap font-bold">CTR</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Conversions</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Conversion Rate</TableHead>
                <TableHead className="whitespace-nowrap font-bold">
                  GMV{currency ? `(${currency})` : ''}
                </TableHead>
                <TableHead className="whitespace-nowrap font-bold">
                  Expense{currency ? `(${currency})` : ''}
                </TableHead>
                <TableHead className={`${ROAS_CELL} font-bold`}>ROAS</TableHead>
                <TableHead className="whitespace-nowrap font-bold">GMV(한화)</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Expense(한화)</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    광고 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {rows.map((r) => {
                    const { display, truncated } = truncateName(r.product)
                    return (
                      <TableRow key={r.product}>
                        <TableCell className={STICKY_CELL}>
                          {truncated ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{display}</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md">{r.product}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span>{display}</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{fmtNum(r.impressions)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtNum(r.clicks)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtPct(r.ctr)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtNum(r.conversions)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {fmtPct(r.conversion_rate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {fmtCurrencyWithSymbol(r.gmv, currency)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {fmtCurrencyWithSymbol(r.expense, currency)}
                        </TableCell>
                        <TableCell className={ROAS_CELL}>{fmtRoasPct(r.roas)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtKRW(r.gmv_krw)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {fmtKRW(r.expense_krw)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="bg-yellow-50/60 font-semibold">
                    <TableCell className={STICKY_CELL}>합계</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtNum(total.impressions)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtNum(total.clicks)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtPct(total.ctr)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtNum(total.conversions)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtPct(total.conversion_rate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtCurrencyWithSymbol(total.gmv, currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtCurrencyWithSymbol(total.expense, currency)}
                    </TableCell>
                    <TableCell className={ROAS_CELL}>{fmtRoasPct(total.roas)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtKRW(total.gmv_krw)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtKRW(total.expense_krw)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
