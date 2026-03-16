'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DailyStatRow } from '@/types/database'

interface StatsTableProps {
  data: DailyStatRow[]
  isLoading: boolean
}

function formatKRW(value: number): string {
  return `₩${new Intl.NumberFormat('ko-KR').format(Math.round(value))}`
}

export function StatsTable({ data, isLoading }: StatsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>날짜</TableHead>
            <TableHead className="text-right">총 지출</TableHead>
            <TableHead className="text-right">Meta 지출</TableHead>
            <TableHead className="text-right">TikTok 지출</TableHead>
            <TableHead className="text-right">총 매출</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">구매수</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.date}>
              <TableCell>{row.date}</TableCell>
              <TableCell className="text-right">
                {formatKRW(row.totalSpend)}
              </TableCell>
              <TableCell className="text-right">
                {formatKRW(row.metaSpend)}
              </TableCell>
              <TableCell className="text-right">
                {formatKRW(row.tiktokSpend)}
              </TableCell>
              <TableCell className="text-right">
                {formatKRW(row.totalRevenue)}
              </TableCell>
              <TableCell className="text-right">
                {row.roas.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                {new Intl.NumberFormat('ko-KR').format(Math.round(row.purchases))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
