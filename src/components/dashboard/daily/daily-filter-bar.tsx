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
  AmazonAccount,
  Brand,
  DailyFilters,
  MetaAccount,
  Qoo10Account,
  ShopeeAccount,
  TiktokAccount,
} from '@/types/database'
import React from 'react'
import { DateRangePicker } from './date-range-picker'

interface AccountOption {
  id: string
  label: string
  type: 'meta' | 'tiktok' | 'shopee_shopping' | 'shopee_inapp' | 'amazon_organic' | 'qoo10_ads'
  brandId: string
}

interface DailyFilterBarProps {
  filters: DailyFilters
  role: 'admin' | 'viewer'
  brands: Brand[]
  metaAccounts: (MetaAccount & { brands: { name: string } | null })[]
  tiktokAccounts: (TiktokAccount & { brands: { name: string } | null })[]
  shopeeAccounts: (ShopeeAccount & { brands: { name: string } | null })[]
  amazonAccounts: (AmazonAccount & { brands: { name: string } | null })[]
  qoo10Accounts: (Qoo10Account & { brands: { name: string } | null })[]
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
  shopeeAccounts,
  amazonAccounts,
  qoo10Accounts,
  isFetching,
  onChange,
  onSearch,
  fetchButton,
}: DailyFilterBarProps) {
  const brandFilter = (a: { brand_id: string }) =>
    a.brand_id === filters.brandId

  // 계정 옵션 그룹별 생성
  const metaOptions: AccountOption[] = metaAccounts.filter(brandFilter).map((a) => ({
    id: a.id,
    label: a.sub_brand
      ? [a.sub_brand, '페북/인스타', a.country].filter(Boolean).join('_')
      : ['페북/인스타', a.country].filter(Boolean).join('_'),
    type: 'meta',
    brandId: a.brand_id,
  }))

  const tiktokOptions: AccountOption[] = tiktokAccounts.filter(brandFilter).map((a) => ({
    id: a.id,
    label: a.sub_brand
      ? [a.sub_brand, '틱톡', a.country].filter(Boolean).join('_')
      : ['틱톡', a.country].filter(Boolean).join('_'),
    type: 'tiktok',
    brandId: a.brand_id,
  }))

  // account_id 기준 중복 제거 (shopping 행 우선)
  const shopeeOptions: AccountOption[] = (() => {
    const seen = new Set<string>()
    const result: AccountOption[] = []
    const sorted = [...shopeeAccounts.filter(brandFilter)].sort((a) =>
      a.account_type === 'shopping' ? -1 : 1
    )
    for (const a of sorted) {
      if (seen.has(a.account_id)) continue
      seen.add(a.account_id)
      result.push({
        id: a.id,
        label: [a.sub_brand, '쇼피', a.country].filter(Boolean).join('_'),
        type: a.account_type === 'shopping' ? 'shopee_shopping' : 'shopee_inapp',
        brandId: a.brand_id,
      })
    }
    return result
  })()

  // account_id 기준 중복 제거 (organic 행 우선)
  const amazonOptions: AccountOption[] = (() => {
    const seen = new Set<string>()
    const result: AccountOption[] = []
    const sorted = [...amazonAccounts.filter(brandFilter)].sort((a) =>
      a.account_type === 'organic' ? -1 : 1
    )
    for (const a of sorted) {
      if (seen.has(a.account_id)) continue
      seen.add(a.account_id)
      result.push({
        id: a.id,
        label: [a.account_name, '아마존', a.country].filter(Boolean).join('_'),
        type: 'amazon_organic',
        brandId: a.brand_id,
      })
    }
    return result
  })()

  // account_id 기준 중복 제거 (ads 행 우선)
  const qoo10Options: AccountOption[] = (() => {
    const seen = new Set<string>()
    const result: AccountOption[] = []
    const sorted = [...qoo10Accounts.filter(brandFilter)].sort((a) =>
      a.account_type === 'ads' ? -1 : 1
    )
    for (const a of sorted) {
      if (seen.has(a.account_id)) continue
      seen.add(a.account_id)
      result.push({
        id: a.id,
        label: [a.account_name || a.account_id, '큐텐', a.country].filter(Boolean).join('_'),
        type: 'qoo10_ads',
        brandId: a.brand_id,
      })
    }
    return result
  })()

  const allOptions = [...metaOptions, ...tiktokOptions, ...shopeeOptions, ...amazonOptions, ...qoo10Options]

  function handleBrandChange(value: string) {
    onChange({ ...filters, brandId: value, accountId: '' })
  }

  function handleAccountChange(value: string) {
    const account = allOptions.find((a) => a.id === value)
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
            disabled={role === 'viewer' && brands.length <= 1}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="브랜드 선택" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 계정 선택 (그룹핑) */}
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            계정
          </label>
          <Select
            value={filters.accountId}
            onValueChange={handleAccountChange}
            disabled={isFetching || !filters.brandId}
          >
            <SelectTrigger className="h-9 w-72">
              <SelectValue placeholder="계정을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {allOptions.map((a) => (
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

        {/* 구분선 */}
        <div className="bg-border/60 my-0.5 hidden w-px self-stretch sm:block" />

        {/* 조회 버튼 + 가져오기/업로드 버튼 */}
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
