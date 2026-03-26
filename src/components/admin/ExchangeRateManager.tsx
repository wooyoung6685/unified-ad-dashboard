'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ExchangeRate } from '@/types/database'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// 국가 목록 (순서 고정)
const COUNTRIES = [
  { country: 'kr', currency: 'KRW', disabled: true },
  { country: 'us', currency: 'USD', disabled: false },
  { country: 'jp', currency: 'JPY', disabled: false },
  { country: 'vn', currency: 'VND', disabled: false },
  { country: 'tw', currency: 'TWD', disabled: false },
  { country: 'sg', currency: 'SGD', disabled: false },
  { country: 'ph', currency: 'PHP', disabled: false },
  { country: 'my', currency: 'MYR', disabled: false },
  { country: 'th', currency: 'THB', disabled: false },
  { country: 'id', currency: 'IDR', disabled: false },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function ExchangeRateManager() {
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [rates, setRates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const yearMonth = `${year}-${month}`

  // 연월 변경 시 기존 저장값 로드
  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/exchange-rates?year_month=${yearMonth}`)
      .then((res) => res.json())
      .then((data: { rates?: ExchangeRate[] }) => {
        const map: Record<string, string> = {}
        for (const row of data.rates ?? []) {
          map[row.country] = String(row.rate)
        }
        setRates(map)
      })
      .catch(() => toast.error('환율 데이터 로드에 실패했습니다.'))
      .finally(() => setLoading(false))
  }, [yearMonth])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = COUNTRIES.filter((c) => !c.disabled).map((c) => ({
        country: c.country,
        currency: c.currency,
        rate: parseFloat(rates[c.country] ?? '0') || 0,
      }))

      const res = await fetch('/api/admin/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_month: yearMonth, rates: payload }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '저장 실패')

      toast.success(`${yearMonth} 환율이 저장되었습니다`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {/* 년도 선택 */}
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 월 선택 */}
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={String(m).padStart(2, '0')}>
                {m}월
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">국가</TableHead>
              <TableHead className="w-24">통화</TableHead>
              <TableHead>환율 (1 통화 = ? KRW)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-8 text-center text-sm">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : (
              COUNTRIES.map(({ country, currency, disabled }) => (
                <TableRow key={country} className={disabled ? 'bg-muted/40' : undefined}>
                  <TableCell className="font-medium uppercase">{country}</TableCell>
                  <TableCell>{currency}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="0.0000"
                      disabled={disabled}
                      value={disabled ? '1' : (rates[country] ?? '')}
                      onChange={(e) =>
                        setRates((prev) => ({ ...prev, [country]: e.target.value }))
                      }
                      className="max-w-48"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Button onClick={handleSave} disabled={saving || loading}>
        {saving ? '저장 중...' : '저장'}
      </Button>
    </div>
  )
}
