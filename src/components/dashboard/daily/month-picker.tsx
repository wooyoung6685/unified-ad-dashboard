'use client'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format, isAfter, isSameMonth, startOfMonth, subMonths } from 'date-fns'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'

interface MonthPickerProps {
  value: string // 'YYYY-MM' or ''
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  maxMonth?: Date
}

const MONTH_LABELS = [
  '1월', '2월', '3월', '4월',
  '5월', '6월', '7월', '8월',
  '9월', '10월', '11월', '12월',
]

const PRESETS = [
  {
    label: '이번 달',
    getValue: () => format(startOfMonth(new Date()), 'yyyy-MM'),
  },
  {
    label: '지난달',
    getValue: () => format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM'),
  },
]

export function MonthPicker({
  value,
  onChange,
  disabled,
  placeholder = '업로드 대상 월 선택',
  maxMonth,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())

  const max = maxMonth ?? startOfMonth(new Date())
  const maxYear = max.getFullYear()

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setViewYear(value ? parseInt(value.slice(0, 4), 10) : new Date().getFullYear())
    }
    setOpen(nextOpen)
  }

  function handleMonthClick(monthIndex: number) {
    const selected = new Date(viewYear, monthIndex, 1)
    if (isAfter(selected, max)) return
    onChange(format(selected, 'yyyy-MM'))
    setOpen(false)
  }

  function handlePreset(getValue: () => string) {
    onChange(getValue())
    setOpen(false)
  }

  const triggerLabel = value
    ? format(
        new Date(parseInt(value.slice(0, 4), 10), parseInt(value.slice(5, 7), 10) - 1, 1),
        'yyyy년 M월',
      )
    : null

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          aria-label="업로드 대상 월 선택"
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            'h-9 w-48 justify-start gap-2 font-normal tabular-nums',
            !triggerLabel && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="truncate text-sm">{triggerLabel ?? placeholder}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto overflow-hidden rounded-xl p-0 shadow-lg">
        <div className="flex">
          {/* 좌측: 프리셋 */}
          <div className="border-border/60 flex w-27.5 shrink-0 flex-col gap-0.5 border-r px-2 py-3">
            <p className="text-muted-foreground mb-1.5 px-2 text-[10px] font-semibold tracking-widest uppercase">
              빠른 선택
            </p>
            {PRESETS.map((preset) => {
              const isActive = value === preset.getValue()
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePreset(preset.getValue)}
                  className={cn(
                    'w-full rounded-md px-2 py-1.5 text-left text-[12px] transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                      : 'text-foreground/80 hover:bg-accent hover:text-foreground',
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          {/* 우측: 연도 네비 + 12개월 그리드 */}
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="이전 연도"
                onClick={() => setViewYear((y) => y - 1)}
                className="hover:bg-accent text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
              >
                <ChevronLeftIcon className="size-3.5" />
              </button>
              <span className="text-[13px] font-semibold tracking-tight select-none">
                {viewYear}년
              </span>
              <button
                type="button"
                aria-label="다음 연도"
                onClick={() => setViewYear((y) => y + 1)}
                disabled={viewYear >= maxYear}
                className={cn(
                  'rounded-md p-1 transition-colors',
                  viewYear >= maxYear
                    ? 'text-muted-foreground/30 cursor-not-allowed'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground',
                )}
              >
                <ChevronRightIcon className="size-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_LABELS.map((label, idx) => {
                const monthDate = new Date(viewYear, idx, 1)
                const isFuture = isAfter(monthDate, max)
                const isSelected = value === format(monthDate, 'yyyy-MM')
                const isCurrent = isSameMonth(monthDate, new Date())

                return (
                  <button
                    key={label}
                    type="button"
                    disabled={isFuture}
                    onClick={() => handleMonthClick(idx)}
                    className={cn(
                      'h-9 rounded-md text-[13px] transition-colors',
                      isFuture
                        ? 'text-muted-foreground/40 cursor-not-allowed opacity-50'
                        : isSelected
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : isCurrent
                            ? 'ring-primary/60 font-medium ring-1 ring-inset hover:bg-accent hover:text-accent-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
