'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  OPERATOR_OPTIONS,
  createEmptyFilterCondition,
  type PlatformMetricOption,
} from '@/lib/creative-widget-defaults'
import type {
  CreativeWidgetConfig,
  CreativeWidgetFilterCondition,
  FilterOperator,
} from '@/types/database'
import { MinusCircle, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

interface CreativeWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (config: CreativeWidgetConfig) => void
  initialConfig?: CreativeWidgetConfig
  rankByOptions: PlatformMetricOption[]
  filterMetricOptions: PlatformMetricOption[]
}

export function CreativeWidgetDialog({
  open,
  onOpenChange,
  onApply,
  initialConfig,
  rankByOptions,
  filterMetricOptions,
}: CreativeWidgetDialogProps) {
  const [title, setTitle] = useState('')
  const [rankBy, setRankBy] = useState(rankByOptions[0]?.value ?? '')
  const [filters, setFilters] = useState<CreativeWidgetFilterCondition[]>([])

  useEffect(() => {
    if (open) {
      setTitle(initialConfig?.title ?? '')
      setRankBy(initialConfig?.rankBy ?? rankByOptions[0]?.value ?? '')
      setFilters(initialConfig?.filters ?? [])
    }
  }, [open, initialConfig, rankByOptions])

  const handleAddFilter = () => {
    setFilters((prev) => [...prev, createEmptyFilterCondition(filterMetricOptions)])
  }

  const handleFilterChange = (
    index: number,
    field: keyof CreativeWidgetFilterCondition,
    value: string | number,
  ) => {
    setFilters((prev) =>
      prev.map((f, i) =>
        i === index
          ? {
              ...f,
              [field]: field === 'value' ? (value === '' ? 0 : Number(value)) : value,
            }
          : f,
      ),
    )
  }

  const handleRemoveFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index))
  }

  const handleApply = () => {
    const rankByOption = rankByOptions.find((o) => o.value === rankBy)
    const config: CreativeWidgetConfig = {
      id: initialConfig?.id ?? crypto.randomUUID(),
      title: title.trim() || undefined,
      rankBy,
      sortDirection: rankByOption?.defaultSort ?? 'desc',
      topN: initialConfig?.topN ?? 3,
      filters,
    }
    onApply(config)
    onOpenChange(false)
  }

  const isValid = rankBy !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] gap-0 p-0">
        {/* 헤더 */}
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-lg font-bold">소재 랭킹 위젯 설정</DialogTitle>
        </DialogHeader>

        {/* 본문 */}
        <div className="flex flex-col gap-8 px-8 py-8">
          {/* 위젯 제목 + 정렬 기준 */}
          <div className="grid grid-cols-[1fr_1fr] gap-6">
            <div className="flex min-w-0 flex-col gap-2">
              <label className="text-sm font-semibold">
                위젯 제목 (선택)
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 고효율 소재 Top 3"
                className="h-12 w-full rounded-lg"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <label className="text-sm font-semibold">
                정렬 기준 (Rank By) <span className="text-red-500">*</span>
              </label>
              <Select value={rankBy} onValueChange={setRankBy}>
                <SelectTrigger className="!h-12 w-full rounded-lg">
                  <SelectValue placeholder="정렬 기준 선택" />
                </SelectTrigger>
                <SelectContent>
                  {rankByOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 상세 필터 조건 */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">
                상세 필터 조건 (AND)
              </label>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg px-4 text-sm"
                onClick={handleAddFilter}
              >
                + 조건 추가
              </Button>
            </div>

            <div className="rounded-xl border bg-muted/20">
              {filters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
                  <p>설정된 필터가 없습니다.</p>
                  <p className="text-xs">모든 소재를 대상으로 합니다.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  {filters.map((f, i) => (
                    <div key={i} className="grid grid-cols-[1fr_140px_1fr_36px] items-center gap-3">
                      {/* 지표 */}
                      <Select
                        value={f.metric}
                        onValueChange={(v) => handleFilterChange(i, 'metric', v)}
                      >
                        <SelectTrigger className="!h-11 w-full text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filterMetricOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* 연산자 */}
                      <Select
                        value={f.operator}
                        onValueChange={(v) =>
                          handleFilterChange(i, 'operator', v as FilterOperator)
                        }
                      >
                        <SelectTrigger className="!h-11 w-full text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATOR_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* 값 */}
                      <Input
                        type="number"
                        placeholder="값"
                        value={f.value === 0 ? '' : f.value}
                        onChange={(e) => handleFilterChange(i, 'value', e.target.value)}
                        className="h-11 text-sm"
                      />

                      {/* 삭제 */}
                      <button
                        onClick={() => handleRemoveFilter(i)}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-red-400 transition-colors hover:text-red-600"
                      >
                        <MinusCircle className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <DialogFooter className="border-t px-8 py-5">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 min-w-24 rounded-lg px-6 text-sm font-medium"
          >
            취소
          </Button>
          <Button
            onClick={handleApply}
            disabled={!isValid}
            className="h-11 min-w-28 rounded-lg bg-black px-6 text-sm font-medium text-white hover:bg-black/80 disabled:bg-black/40"
          >
            적용하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
