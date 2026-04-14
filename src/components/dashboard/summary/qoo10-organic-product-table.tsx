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
import type { Qoo10OrganicProductRow } from '@/types/database'

const fmtJPY = (v: number | null) =>
  v == null ? '-' : `¥${Math.round(v).toLocaleString('ko-KR')}`

interface Props {
  rows: Qoo10OrganicProductRow[]
  extra?: { hasKrw: boolean }
}

export function Qoo10OrganicProductTable({ rows, extra }: Props) {
  const hasKrw = extra?.hasKrw ?? false

  if (!rows.length) {
    return (
      <div className="text-muted-foreground rounded-lg border py-8 text-center text-sm">
        상품 데이터가 없습니다
      </div>
    )
  }

  // 총합 행 계산
  const totalAmtJpy = rows.reduce((s, r) => s + (r.transaction_amount_jpy ?? 0), 0)
  const totalAmtKrw = hasKrw ? rows.reduce((s, r) => s + (r.transaction_amount_krw ?? 0), 0) : null
  const totalQty = rows.reduce((s, r) => s + (r.transaction_quantity ?? 0), 0)

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        상품별 오가닉 매출 TOP 10
      </h3>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead className="text-right">거래금액 (JPY)</TableHead>
              {hasKrw && <TableHead className="text-right">거래금액 (KRW)</TableHead>}
              <TableHead className="text-right">거래수량</TableHead>
              <TableHead className="text-right">AOV (JPY)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* 합계 행 */}
            <TableRow className="bg-muted/50 font-bold">
              <TableCell className="text-center text-muted-foreground">합계</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-right">{fmtJPY(totalAmtJpy)}</TableCell>
              {hasKrw && <TableCell className="text-right">{fmtKRW(totalAmtKrw)}</TableCell>}
              <TableCell className="text-right">{fmtNum(totalQty)}</TableCell>
              <TableCell className="text-right">
                {totalQty > 0 ? fmtJPY(totalAmtJpy / totalQty) : '-'}
              </TableCell>
            </TableRow>
            {rows.map((r, i) => (
              <TableRow key={r.product_name}>
                <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="max-w-64 truncate" title={r.product_name}>
                  {r.product_name}
                </TableCell>
                <TableCell className="text-right">{fmtJPY(r.transaction_amount_jpy)}</TableCell>
                {hasKrw && <TableCell className="text-right">{fmtKRW(r.transaction_amount_krw)}</TableCell>}
                <TableCell className="text-right">{fmtNum(r.transaction_quantity)}</TableCell>
                <TableCell className="text-right">{fmtJPY(r.aov_jpy)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
