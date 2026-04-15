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
import type { Qoo10AdTypeRow } from '@/types/database'

const fmtJPY = (v: number | null) =>
  v == null ? '-' : `¥${Math.round(v).toLocaleString('ko-KR')}`

interface Props {
  rows: Qoo10AdTypeRow[]
  extra?: { hasKrw: boolean }
}

export function Qoo10AdTypeTable({ rows, extra }: Props) {
  const hasKrw = extra?.hasKrw ?? false

  if (!rows.length) {
    return (
      <div className="text-muted-foreground rounded-lg border py-8 text-center text-sm">
        광고 유형 데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        광고 유형별 성과
      </h3>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>광고 유형</TableHead>
              <TableHead className="text-right">광고비 (JPY)</TableHead>
              {hasKrw && <TableHead className="text-right">광고비 (KRW)</TableHead>}
              <TableHead className="text-right">광고매출 (JPY)</TableHead>
              {hasKrw && <TableHead className="text-right">광고매출 (KRW)</TableHead>}
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">노출수</TableHead>
              <TableHead className="text-right">클릭수</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">구매수</TableHead>
              <TableHead className="text-right">구매전환율</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.ad_name}>
                <TableCell className="font-medium">{r.ad_name}</TableCell>
                <TableCell className="text-right">{fmtJPY(r.cost)}</TableCell>
                {hasKrw && <TableCell className="text-right">{fmtKRW(r.cost_krw)}</TableCell>}
                <TableCell className="text-right">{fmtJPY(r.sales)}</TableCell>
                {hasKrw && <TableCell className="text-right">{fmtKRW(r.sales_krw)}</TableCell>}
                <TableCell className="text-right">
                  {r.roas != null ? `${(r.roas * 100).toFixed(0)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">{fmtNum(r.impressions)}</TableCell>
                <TableCell className="text-right">{fmtNum(r.clicks)}</TableCell>
                <TableCell className="text-right">{fmtPct(r.ctr)}</TableCell>
                <TableCell className="text-right">{fmtNum(r.purchases)}</TableCell>
                <TableCell className="text-right">{fmtPct(r.purchase_conversion_rate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
