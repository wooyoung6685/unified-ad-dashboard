'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DateRangePicker } from '@/components/dashboard/daily/date-range-picker'
import { fmtCurrencyWithSymbol } from '@/lib/format'
import type { ShopeePromotionRow } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

interface Props {
  reportId: string
  initialRows: ShopeePromotionRow[]
  canEdit: boolean
}

function formatRange(start: string, end: string): string {
  const s = parseISO(start)
  const e = parseISO(end)
  return `${format(s, 'M/d')}~${format(e, 'M/d')}`
}

function fmtNum(value: number | null): string {
  if (value == null) return '-'
  return value.toLocaleString()
}

function fmtPct(value: number | null): string {
  if (value == null) return '-'
  return `${value.toFixed(2)}%`
}

export function ShopeePromotionSection({ reportId, initialRows, canEdit }: Props) {
  const [rows, setRows] = useState<ShopeePromotionRow[]>(initialRows)
  const [open, setOpen] = useState(false)
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [promotionName, setPromotionName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleOpenDialog() {
    setDateStart('')
    setDateEnd('')
    setPromotionName('')
    setError(null)
    setOpen(true)
  }

  async function handleAdd() {
    if (!dateStart || !dateEnd) {
      setError('날짜 범위를 선택해주세요.')
      return
    }
    if (!promotionName.trim()) {
      setError('프로모션 이름을 입력해주세요.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/promotion-row`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_start: dateStart, date_end: dateEnd, promotion_name: promotionName.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '추가 실패')
        return
      }
      setRows((prev) => [...prev, json.row as ShopeePromotionRow])
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(rowId: string) {
    setDeletingId(rowId)
    try {
      const res = await fetch(`/api/reports/${reportId}/promotion-row?row_id=${rowId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.row_id !== rowId))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const currency = rows[0]?.currency ?? ''

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🏷️ 프로모션 성과 (Shopee)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap text-center" colSpan={2 + (rows.length > 0 ? 5 : 5) + (canEdit ? 1 : 0)}>
                    프로모션 데이터
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="whitespace-nowrap font-bold">일정</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">프로모션</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">
                    Sales{currency ? `(${currency})` : ''}
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-bold">ORDERS</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">VISITORS</TableHead>
                  <TableHead className="whitespace-nowrap font-bold">
                    SALES PER ORDERS{currency ? `(${currency})` : ''}
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-bold">CVR</TableHead>
                  {canEdit && <TableHead className="w-8" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 8 : 7}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      프로모션 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.row_id}>
                      <TableCell className="whitespace-nowrap">
                        {formatRange(row.date_start, row.date_end)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{row.promotion_name}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fmtCurrencyWithSymbol(row.sales, row.currency, 0)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fmtNum(row.orders)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtNum(row.visitors)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fmtCurrencyWithSymbol(row.sales_per_order, row.currency, 0)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fmtPct(row.cvr)}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            disabled={deletingId === row.row_id}
                            onClick={() => handleDelete(row.row_id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {canEdit && (
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={handleOpenDialog}>
                + 행추가
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>프로모션 행 추가</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>일정</Label>
              <DateRangePicker
                startDate={dateStart}
                endDate={dateEnd}
                onChange={(s, e) => {
                  setDateStart(s)
                  setDateEnd(e)
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promotion-name">프로모션 이름</Label>
              <Input
                id="promotion-name"
                placeholder="예: Pay day"
                value={promotionName}
                onChange={(e) => setPromotionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSubmitting) handleAdd()
                }}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              취소
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? '추가 중...' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
