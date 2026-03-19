'use client'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  isToday,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths,
  isBefore,
  endOfDay,
  startOfDay,
} from 'date-fns'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState, useCallback } from 'react'

// ────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────

interface DateRangePickerProps {
  startDate: string // 'yyyy-MM-dd'
  endDate: string // 'yyyy-MM-dd'
  disabled?: boolean
  onChange: (startDate: string, endDate: string) => void
}

interface DateRange {
  start: Date | null
  end: Date | null
}

// ────────────────────────────────────────────
// 빠른 선택 프리셋
// ────────────────────────────────────────────

const PRESETS = [
  {
    label: '오늘',
    getDates: (): DateRange => {
      const today = new Date()
      return { start: startOfDay(today), end: endOfDay(today) }
    },
  },
  {
    label: '어제',
    getDates: (): DateRange => {
      const yesterday = addDays(new Date(), -1)
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
    },
  },
  {
    label: '최근 7일',
    getDates: (): DateRange => ({
      start: startOfDay(addDays(new Date(), -6)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: '최근 30일',
    getDates: (): DateRange => ({
      start: startOfDay(addDays(new Date(), -29)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: '이번 달',
    getDates: (): DateRange => ({
      start: startOfMonth(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: '지난달',
    getDates: (): DateRange => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      }
    },
  },
]

// ────────────────────────────────────────────
// 컴팩트 달력 컴포넌트
// ────────────────────────────────────────────

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface CompactCalendarProps {
  /** 표시할 월 */
  month: Date
  /** 현재 선택 중인 임시 범위 */
  range: DateRange
  /** hover 미리보기 날짜 */
  hoverDate: Date | null
  /** 첫 번째 날짜 선택 완료 후 두 번째 대기 상태 */
  isSelectingEnd: boolean
  onDayClick: (date: Date) => void
  onDayHover: (date: Date) => void
  onDayLeave: () => void
}

function CompactCalendar({
  month,
  range,
  hoverDate,
  isSelectingEnd,
  onDayClick,
  onDayHover,
  onDayLeave,
}: CompactCalendarProps) {
  // 6주 × 7일 그리드 생성 (해당 달만 표시, 나머지는 빈 칸)
  const firstOfMonth = startOfMonth(month)
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn: 0 })
  const days: (Date | null)[] = []

  for (let i = 0; i < 42; i++) {
    const day = addDays(gridStart, i)
    // 해당 월에 속한 날짜만 표시, 그 외는 null(빈 칸)
    if (day.getMonth() === month.getMonth()) {
      days.push(day)
    } else {
      days.push(null)
    }
  }

  // 프리뷰 범위 계산: 선택 중일 때 hover 날짜를 end로 사용
  const previewEnd =
    isSelectingEnd && range.start
      ? hoverDate
        ? isBefore(hoverDate, range.start)
          ? range.start // hover가 start보다 앞이면 start를 end로
          : hoverDate
        : null
      : range.end

  const previewStart =
    isSelectingEnd &&
    range.start &&
    hoverDate &&
    isBefore(hoverDate, range.start)
      ? hoverDate
      : range.start

  // 날짜가 범위 내에 있는지 판단
  const isInRange = useCallback(
    (day: Date): boolean => {
      if (!previewStart || !previewEnd) return false
      if (isBefore(previewEnd, previewStart)) return false
      return isWithinInterval(day, {
        start: startOfDay(previewStart),
        end: endOfDay(previewEnd),
      })
    },
    [previewStart, previewEnd]
  )

  const isRangeStart = useCallback(
    (day: Date): boolean => {
      if (!previewStart) return false
      return isSameDay(day, previewStart)
    },
    [previewStart]
  )

  const isRangeEnd = useCallback(
    (day: Date): boolean => {
      if (!previewEnd) return false
      return isSameDay(day, previewEnd)
    },
    [previewEnd]
  )

  const isSingleDay =
    previewStart && previewEnd && isSameDay(previewStart, previewEnd)

  return (
    <div className="w-full">
      {/* 요일 헤더 */}
      <div className="mb-1 grid grid-cols-7">
        {WEEK_LABELS.map((label) => (
          <div
            key={label}
            className="text-muted-foreground py-1 text-center text-[11px] font-medium select-none"
          >
            {label}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7" onMouseLeave={onDayLeave}>
        {days.map((day, idx) => {
          // null이면 빈 칸
          if (!day) {
            return <div key={`empty-${idx}`} className="h-8" />
          }

          const _isStart = isRangeStart(day)
          const _isEnd = isRangeEnd(day)
          const _isInRange = isInRange(day)
          const _isToday = isToday(day)
          const _isSingle = Boolean(isSingleDay)

          // 범위 시작/끝의 배경 pill 형태를 위해 좌우 반쪽 배경 처리
          const showLeftHalf = _isEnd && !_isSingle && _isInRange
          const showRightHalf = _isStart && !_isSingle && _isInRange

          return (
            <div key={idx} className="relative h-8">
              {/* 범위 중간 배경 (전체 셀 너비) */}
              {_isInRange && !_isStart && !_isEnd && (
                <div className="bg-primary/12 absolute inset-x-0 inset-y-0.5" />
              )}
              {/* 시작점 오른쪽 절반 배경 */}
              {showRightHalf && (
                <div className="bg-primary/12 absolute inset-y-0.5 right-0 left-1/2" />
              )}
              {/* 끝점 왼쪽 절반 배경 */}
              {showLeftHalf && (
                <div className="bg-primary/12 absolute inset-y-0.5 right-1/2 left-0" />
              )}

              <button
                type="button"
                onClick={() => onDayClick(day)}
                onMouseEnter={() => onDayHover(day)}
                aria-label={format(day, 'yyyy년 M월 d일')}
                aria-pressed={_isStart || _isEnd}
                data-in-range={_isInRange || _isStart || _isEnd}
                className={cn(
                  // 기본: 셀 중앙 정렬, 크기, 전환 효과
                  'relative z-10 flex h-8 w-full items-center justify-center rounded-full text-[13px] transition-colors',
                  // 선택 안된 일반 날짜 hover
                  !_isStart && !_isEnd && !_isInRange
                    ? 'hover:bg-accent hover:text-accent-foreground cursor-pointer'
                    : '',
                  // 범위 중간
                  _isInRange && !_isStart && !_isEnd
                    ? 'text-foreground cursor-pointer rounded-none'
                    : '',
                  // 범위 시작/끝 (pill 스타일)
                  (_isStart || _isEnd) && !_isSingle
                    ? 'bg-primary text-primary-foreground cursor-pointer font-semibold'
                    : '',
                  // 단일 날짜 선택
                  _isSingle && (_isStart || _isEnd)
                    ? 'bg-primary text-primary-foreground cursor-pointer font-semibold'
                    : '',
                  // 오늘 날짜 테두리 (선택되지 않은 경우에만)
                  _isToday && !_isStart && !_isEnd
                    ? 'ring-primary/60 font-medium ring-1 ring-inset'
                    : ''
                )}
              >
                {format(day, 'd')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────
// 메인 DateRangePicker
// ────────────────────────────────────────────

export function DateRangePicker({
  startDate,
  endDate,
  disabled,
  onChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  // 내부 임시 상태 (팝오버 열린 동안 사용)
  const [tempRange, setTempRange] = useState<DateRange>({
    start: null,
    end: null,
  })
  const [isSelectingEnd, setIsSelectingEnd] = useState(false)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  // 두 달 표시: 왼쪽/오른쪽
  const [rightMonth, setRightMonth] = useState(() => startOfMonth(new Date()))
  const leftMonth = subMonths(rightMonth, 1)

  // ── 팝오버 열기/닫기 ──
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      // 현재 props 값으로 초기화
      setTempRange({
        start: startDate ? parseISO(startDate) : null,
        end: endDate ? parseISO(endDate) : null,
      })
      setIsSelectingEnd(false)
      setHoverDate(null)
      // 현재 endDate가 있으면 해당 달로 이동
      if (endDate) {
        setRightMonth(startOfMonth(parseISO(endDate)))
      } else {
        setRightMonth(startOfMonth(new Date()))
      }
    }
    setOpen(nextOpen)
  }

  // ── 날짜 클릭 ──
  function handleDayClick(date: Date) {
    if (!isSelectingEnd) {
      // 1차 클릭: 시작일 설정, 종료일 대기
      setTempRange({ start: date, end: null })
      setIsSelectingEnd(true)
      setHoverDate(null)
    } else {
      // 2차 클릭: 종료일 확정 (날짜 순서 보정)
      const start = tempRange.start!
      if (isBefore(date, start)) {
        setTempRange({ start: date, end: start })
      } else {
        setTempRange({ start, end: date })
      }
      setIsSelectingEnd(false)

      // 선택 완료 즉시 적용 후 팝오버 닫기
      const finalStart = isBefore(date, start) ? date : start
      const finalEnd = isBefore(date, start) ? start : date
      onChange(format(finalStart, 'yyyy-MM-dd'), format(finalEnd, 'yyyy-MM-dd'))
      setOpen(false)
    }
  }

  // ── 프리셋 선택 ──
  function handlePreset(preset: (typeof PRESETS)[0]) {
    const { start, end } = preset.getDates()
    setTempRange({ start, end })
    setIsSelectingEnd(false)
    setHoverDate(null)

    // 프리셋 달력 월 업데이트
    if (end) setRightMonth(startOfMonth(end))

    // 즉시 적용 후 팝오버 닫기
    if (start && end) {
      onChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
      setOpen(false)
    }
  }

  // ── 트리거 레이블 ──
  const triggerLabel =
    startDate && endDate
      ? startDate === endDate
        ? startDate
        : `${startDate} ~ ${endDate}`
      : '날짜 범위 선택'

  const hasValue = Boolean(startDate && endDate)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {/* 트리거: 인풋처럼 보이는 버튼 */}
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          aria-label="날짜 범위 선택"
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            'h-9 w-60 justify-start gap-2 font-normal tabular-nums',
            !hasValue && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="truncate text-sm">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>

      {/* 팝오버 내용 */}
      <PopoverContent
        align="start"
        className="w-auto overflow-hidden rounded-xl p-0 shadow-lg"
        onInteractOutside={() => {
          // 선택 중 외부 클릭 시 초기화
          if (isSelectingEnd) {
            setIsSelectingEnd(false)
            setTempRange({
              start: startDate ? parseISO(startDate) : null,
              end: endDate ? parseISO(endDate) : null,
            })
          }
        }}
      >
        <div className="flex">
          {/* ── 왼쪽: 빠른 선택 프리셋 ── */}
          <div className="border-border/60 flex w-27.5 shrink-0 flex-col gap-0.5 border-r px-2 py-3">
            <p className="text-muted-foreground mb-1.5 px-2 text-[10px] font-semibold tracking-widest uppercase">
              빠른 선택
            </p>
            {PRESETS.map((preset) => {
              // 현재 선택된 프리셋 하이라이트
              const { start: pStart, end: pEnd } = preset.getDates()
              const isActive =
                hasValue &&
                pStart &&
                pEnd &&
                isSameDay(pStart, parseISO(startDate)) &&
                isSameDay(pEnd, parseISO(endDate))

              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={cn(
                    'w-full rounded-md px-2 py-1.5 text-left text-[12px] transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                      : 'text-foreground/80 hover:bg-accent hover:text-foreground'
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          {/* ── 오른쪽: 달력 두 개 ── */}
          <div className="flex flex-col gap-3 p-4">
            {/* 선택 상태 안내 배지 */}
            <div className="flex h-6 items-center">
              {isSelectingEnd ? (
                <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                  종료일을 선택하세요
                </span>
              ) : tempRange.start && tempRange.end ? (
                <span className="text-muted-foreground text-[12px] font-medium tabular-nums">
                  {format(tempRange.start, 'yyyy.MM.dd')}
                  <span className="text-border mx-1.5">—</span>
                  {format(tempRange.end, 'yyyy.MM.dd')}
                </span>
              ) : (
                <span className="text-muted-foreground/60 text-[11px]">
                  시작일을 선택하세요
                </span>
              )}
            </div>

            {/* 달력 2개 나란히 */}
            <div className="flex gap-5">
              {/* 이전 달 */}
              <div className="w-49">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="이전 달"
                    onClick={() => setRightMonth((m) => subMonths(m, 1))}
                    className="hover:bg-accent text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
                  >
                    <ChevronLeftIcon className="size-3.5" />
                  </button>
                  <span className="text-[13px] font-semibold tracking-tight select-none">
                    {format(leftMonth, 'yyyy년 M월')}
                  </span>
                  {/* 오른쪽 공간 확보 */}
                  <div className="size-5.5" />
                </div>
                <CompactCalendar
                  month={leftMonth}
                  range={tempRange}
                  hoverDate={hoverDate}
                  isSelectingEnd={isSelectingEnd}
                  onDayClick={handleDayClick}
                  onDayHover={(d) => isSelectingEnd && setHoverDate(d)}
                  onDayLeave={() => setHoverDate(null)}
                />
              </div>

              {/* 가운데 구분선 */}
              <div className="border-border/30 w-px self-stretch border-r" />

              {/* 이번 달 */}
              <div className="w-49">
                <div className="mb-2 flex items-center justify-between">
                  <div className="size-5.5" />
                  <span className="text-[13px] font-semibold tracking-tight select-none">
                    {format(rightMonth, 'yyyy년 M월')}
                  </span>
                  <button
                    type="button"
                    aria-label="다음 달"
                    onClick={() => setRightMonth((m) => addMonths(m, 1))}
                    className="hover:bg-accent text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
                  >
                    <ChevronRightIcon className="size-3.5" />
                  </button>
                </div>
                <CompactCalendar
                  month={rightMonth}
                  range={tempRange}
                  hoverDate={hoverDate}
                  isSelectingEnd={isSelectingEnd}
                  onDayClick={handleDayClick}
                  onDayHover={(d) => isSelectingEnd && setHoverDate(d)}
                  onDayLeave={() => setHoverDate(null)}
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
