'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  Brand,
  DailyFilters,
  MetaAccount,
  TiktokAccount,
} from '@/types/database'
import React from 'react'
import { DateRangePicker } from './date-range-picker'

interface AccountOption {
  id: string
  label: string
  type: 'meta' | 'tiktok'
  brandId: string
}

interface DailyFilterBarProps {
  filters: DailyFilters
  role: 'admin' | 'viewer'
  brands: Brand[]
  metaAccounts: (MetaAccount & { brands: { name: string } | null })[]
  tiktokAccounts: (TiktokAccount & { brands: { name: string } | null })[]
  isFetching: boolean
  onChange: (filters: DailyFilters) => void
  onSearch: () => void
  fetchButton?: React.ReactNode
}

export function DailyFilterBar({
  filters,
  role,
  brands,
  metaAccounts,
  tiktokAccounts,
  isFetching,
  onChange,
  onSearch,
  fetchButton,
}: DailyFilterBarProps) {
  // 선택된 브랜드에 속한 계정 목록 생성 (filter-bar.tsx 패턴 동일)
  const accountOptions: AccountOption[] = [
    ...metaAccounts
      .filter(
        (a) => filters.brandId === 'all' || a.brand_id === filters.brandId
      )
      .map((a) => ({
        id: a.id,
        label: a.sub_brand
          ? [a.sub_brand, '페북/인스타', a.country].filter(Boolean).join('_')
          : ['페북/인스타', a.country].filter(Boolean).join('_'),
        type: 'meta' as const,
        brandId: a.brand_id,
      })),
    ...tiktokAccounts
      .filter(
        (a) => filters.brandId === 'all' || a.brand_id === filters.brandId
      )
      .map((a) => ({
        id: a.id,
        label: a.sub_brand
          ? [a.sub_brand, '틱톡', a.country].filter(Boolean).join('_')
          : ['틱톡', a.country].filter(Boolean).join('_'),
        type: 'tiktok' as const,
        brandId: a.brand_id,
      })),
  ]

  function handleBrandChange(value: string) {
    onChange({ ...filters, brandId: value, accountId: '' })
  }

  function handleAccountChange(value: string) {
    const account = accountOptions.find((a) => a.id === value)
    if (!account) return
    onChange({ ...filters, accountId: value, accountType: account.type })
  }

  function handleDateRangeChange(startDate: string, endDate: string) {
    onChange({ ...filters, startDate, endDate })
  }

  const isSearchDisabled = !filters.accountId || isFetching

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
        {/* 그룹 선택 */}
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            그룹
          </label>
          <Select
            value={filters.brandId}
            onValueChange={handleBrandChange}
            disabled={role === 'viewer'}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="브랜드 선택" />
            </SelectTrigger>
            <SelectContent>
              {role === 'admin' && <SelectItem value="all">전체</SelectItem>}
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 계정 선택 */}
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            계정
          </label>
          <Select
            value={filters.accountId}
            onValueChange={handleAccountChange}
            disabled={isFetching}
          >
            <SelectTrigger className="h-9 w-72">
              <SelectValue placeholder="계정을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {accountOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 기간 선택 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            기간
          </label>
          <DateRangePicker
            startDate={filters.startDate}
            endDate={filters.endDate}
            disabled={isFetching}
            onChange={handleDateRangeChange}
          />
        </div>

        {/* 구분선 (시각적 그룹 분리) */}
        <div className="bg-border/60 my-0.5 hidden w-px self-stretch sm:block" />

        {/* 조회 버튼 + 가져오기 버튼 */}
        <div className="flex items-end gap-2">
          <Button
            onClick={onSearch}
            disabled={isSearchDisabled}
            className="h-9"
          >
            {isFetching ? '조회 중...' : '조회하기'}
          </Button>
          {fetchButton}
        </div>
      </div>
    </div>
  )
}
