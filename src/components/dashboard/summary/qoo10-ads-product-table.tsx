'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtKRW, fmtNum } from '@/lib/format'
import type { Qoo10AdsProductRow } from '@/types/database'

const fmtJPY = (v: number | null) =>
  v == null ? '-' : `¥${Math.round(v).toLocaleString('ko-KR')}`

interface Props {
  rows: Qoo10AdsProductRow[]
  extra?: { hasKrw: boolean }
}

export function Qoo10AdsProductTable({ rows, extra }: Props) {
  const hasKrw = extra?.hasKrw ?? false

  if (!rows.length) {
    return (
      <div className="text-muted-foreground rounded-lg border py-8 text-center text-sm">
        상품별 광고 데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        상품별 광고성과 TOP 10
      </h3>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead>상품코드</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead className="text-right">광고비 (JPY)</TableHead>
              {hasKrw && <TableHead className="text-right">광고비 (KRW)</TableHead>}
              <TableHead className="text-right">광고매출 (JPY)</TableHead>
              {hasKrw && <TableHead className="text-right">광고매출 (KRW)</TableHead>}
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">구매수</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.product_code}>
                <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-mono text-xs">{r.product_code}</TableCell>
                <TableCell className="max-w-48 truncate" title={r.product_name}>
                  {r.product_name_ko || r.product_name || '-'}
                </TableCell>
                <TableCell className="text-right">{fmtJPY(r.cost)}</TableCell>
                {hasKrw && <TableCell className="text-right">{fmtKRW(r.cost_krw)}</TableCell>}
                <TableCell className="text-right">{fmtJPY(r.sales)}</TableCell>
                {hasKrw && <TableCell className="text-right">{fmtKRW(r.sales_krw)}</TableCell>}
                <TableCell className="text-right">
                  {r.roas != null ? `${(r.roas * 100).toFixed(0)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">{fmtNum(r.purchases)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
