'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MetaDailyStatFull, ShopeeShoppingStat } from '@/types/database'

// ── Meta 필드 라벨 ──────────────────────────────────────────────────────────

const META_FIELD_LABELS: Record<string, string> = {
  spend: '지출 (KRW)',
  impressions: '노출수',
  reach: '도달수',
  clicks: '클릭수',
  inline_link_clicks: '링크 클릭수',
  purchases: '구매(전환)수',
  revenue: '매출 (KRW)',
  add_to_cart: '장바구니 담기',
  add_to_cart_value: '장바구니 전환값',
  content_views: '콘텐츠 조회',
  outbound_clicks: '아웃바운드 클릭',
}

const META_EDITABLE_KEYS = Object.keys(META_FIELD_LABELS)

// ── Shopee 쇼핑몰 필드 라벨 (테이블에 보이는 raw 필드만) ───────────────────

const SHOPEE_FIELD_LABELS: Record<string, string> = {
  orders: '구매(전환)수',
  sales: '매출 (현지 통화)',
  visitors: '방문자수',
  product_clicks: '페이지뷰',
  order_conversion_rate: '전환율(%)',
  sales_per_order: '객단가 (현지 통화)',
}

const SHOPEE_EDITABLE_KEYS = Object.keys(SHOPEE_FIELD_LABELS)

// ── 공통 ─────────────────────────────────────────────────────────────────────

type Props =
  | {
      target: 'meta'
      row: MetaDailyStatFull
      open: boolean
      onOpenChange: (open: boolean) => void
      onSaved: () => void
    }
  | {
      target: 'shopee_shopping'
      row: ShopeeShoppingStat
      open: boolean
      onOpenChange: (open: boolean) => void
      onSaved: () => void
    }

export function DailyEditDialog({ target, row, open, onOpenChange, onSaved }: Props) {
  const fieldLabels = target === 'meta' ? META_FIELD_LABELS : SHOPEE_FIELD_LABELS
  const editableKeys = target === 'meta' ? META_EDITABLE_KEYS : SHOPEE_EDITABLE_KEYS

  // 수정 가능한 필드의 현재 값으로 초기화
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const key of editableKeys) {
      const v = (row as Record<string, unknown>)[key]
      init[key] = v == null ? '' : String(v)
    }
    return init
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    // 빈 문자열은 null, 숫자는 number로 변환
    const fields: Record<string, number | null> = {}
    for (const key of editableKeys) {
      const raw = values[key]
      if (raw === '' || raw == null) {
        fields[key] = null
      } else {
        const n = parseFloat(raw)
        if (isNaN(n)) {
          setError(`"${fieldLabels[key]}" 값이 올바른 숫자가 아닙니다.`)
          setSaving(false)
          return
        }
        fields[key] = n
      }
    }

    try {
      const res = await fetch('/api/dashboard/daily/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, id: row.id, fields }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? '저장에 실패했습니다.')
        return
      }

      onSaved()
      onOpenChange(false)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {(row as { date: string }).date} 데이터 수정
          </DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-xs">
          CTR, CPC, ROAS 등 계산 지표는 저장 시 자동 재계산됩니다.
        </p>

        <div className="grid gap-4 py-2">
          {editableKeys.map((key) => (
            <div key={key} className="grid grid-cols-2 items-center gap-3">
              <Label htmlFor={`field-${key}`} className="text-right text-sm">
                {fieldLabels[key]}
              </Label>
              <Input
                id={`field-${key}`}
                type="number"
                step="any"
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder="null"
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-destructive text-xs">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
