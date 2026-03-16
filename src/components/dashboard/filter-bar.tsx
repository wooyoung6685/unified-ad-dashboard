'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  DateRange,
  DashboardFilters,
  MetaAccount,
  Platform,
  TiktokAccount,
} from '@/types/database'

interface FilterBarProps {
  filters: DashboardFilters
  metaAccounts: MetaAccount[]
  tiktokAccounts: TiktokAccount[]
  onChange: (filters: DashboardFilters) => void
}

const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: '오늘', value: '1d' },
  { label: '7일', value: '7d' },
  { label: '30일', value: '30d' },
  { label: '직접입력', value: 'custom' },
]

const PLATFORM_OPTIONS: { label: string; value: Platform }[] = [
  { label: '전체', value: 'all' },
  { label: 'Meta', value: 'meta' },
  { label: 'TikTok', value: 'tiktok' },
]

export function FilterBar({
  filters,
  metaAccounts,
  tiktokAccounts,
  onChange,
}: FilterBarProps) {
  // 플랫폼에 따른 계정 목록 필터링
  const accountOptions: { label: string; value: string }[] = [
    { label: '전체 계정', value: 'all' },
    ...(filters.platform !== 'tiktok'
      ? metaAccounts
          .filter((a) => a.is_active)
          .map((a) => ({
            label: a.sub_brand
              ? [a.sub_brand, '페북/인스타', a.country].filter(Boolean).join('_')
              : ['페북/인스타', a.country].filter(Boolean).join('_'),
            value: a.id,
          }))
      : []),
    ...(filters.platform !== 'meta'
      ? tiktokAccounts
          .filter((a) => a.is_active)
          .map((a) => ({
            label: a.sub_brand
              ? [a.sub_brand, '틱톡', a.country].filter(Boolean).join('_')
              : ['틱톡', a.country].filter(Boolean).join('_'),
            value: a.id,
          }))
      : []),
  ]

  const handlePlatformChange = (platform: Platform) => {
    // 플랫폼 변경 시 계정 초기화
    onChange({ ...filters, platform, accountId: 'all' })
  }

  const handleRangeChange = (range: DateRange) => {
    onChange({ ...filters, range })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 날짜 범위 버튼 그룹 */}
      <div className="flex rounded-md border">
        {DATE_RANGE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filters.range === opt.value ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none first:rounded-l-md last:rounded-r-md"
            onClick={() => handleRangeChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* 직접입력 날짜 선택 */}
      {filters.range === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className="w-36"
          />
          <span className="text-muted-foreground text-sm">~</span>
          <Input
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className="w-36"
          />
        </div>
      )}

      {/* 플랫폼 버튼 그룹 */}
      <div className="flex rounded-md border">
        {PLATFORM_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filters.platform === opt.value ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none first:rounded-l-md last:rounded-r-md"
            onClick={() => handlePlatformChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* 계정 드롭다운 */}
      <Select
        value={filters.accountId}
        onValueChange={(v) => onChange({ ...filters, accountId: v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="계정 선택" />
        </SelectTrigger>
        <SelectContent>
          {accountOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
