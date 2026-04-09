'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useEffect, useState } from 'react'

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  items: { id: string; name: string }[]
  selectedIds: string[] | null // null = 전체 표시
  onApply: (ids: string[] | null) => void
}

export function FilterDialog({
  open,
  onOpenChange,
  title,
  items,
  selectedIds,
  onApply,
}: FilterDialogProps) {
  // 다이얼로그 내부 임시 선택 상태 (null이면 전체 선택으로 취급)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  // 다이얼로그 열릴 때 초기화
  useEffect(() => {
    if (open) {
      if (selectedIds === null) {
        setChecked(new Set(items.map((i) => i.id)))
      } else {
        setChecked(new Set(selectedIds))
      }
    }
  }, [open, selectedIds, items])

  const allSelected = checked.size === items.length
  const noneSelected = checked.size === 0

  const toggleItem = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setChecked(new Set())
    } else {
      setChecked(new Set(items.map((i) => i.id)))
    }
  }

  const handleApply = () => {
    // 전체 선택 = null (필터 없음), 일부 선택 = 해당 ID 배열
    if (allSelected) {
      onApply(null)
    } else {
      onApply(Array.from(checked))
    }
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* 전체 선택/해제 */}
        <div className="flex items-center gap-2 border-b pb-3">
          <Checkbox
            id="filter-select-all"
            checked={allSelected}
            onCheckedChange={toggleAll}
          />
          <label
            htmlFor="filter-select-all"
            className="cursor-pointer text-sm font-medium"
          >
            전체 선택
          </label>
        </div>

        {/* 항목 목록 */}
        <div className="max-h-72 overflow-y-auto">
          <div className="flex flex-col gap-3 py-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox
                  id={`filter-item-${item.id}`}
                  checked={checked.has(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                />
                <label
                  htmlFor={`filter-item-${item.id}`}
                  className="cursor-pointer text-sm leading-tight"
                >
                  {item.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {allSelected ? '전체' : `${checked.size}개`} 선택됨
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              취소
            </Button>
            <Button size="sm" onClick={handleApply} disabled={noneSelected}>
              적용하기
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
