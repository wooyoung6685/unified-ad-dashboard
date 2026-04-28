'use client'

import {
  toggleAmazonAccount,
  toggleMetaAccount,
  toggleQoo10Account,
  toggleShopeeAccount,
  toggleTiktokAccount,
} from '@/app/dashboard/admin/actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Brand } from '@/types/database'
import { useCallback, useEffect, useState } from 'react'

type PlatformType = 'meta' | 'tiktok' | 'shopee' | 'amazon' | 'qoo10'

interface PendingRow {
  _key: string
  brand_id: string
  platform: PlatformType | ''
  account_id: string
  sub_brand: string
  note: string
  country: string
  is_active: boolean
}

interface RegisteredAccount {
  id: string
  brand_id: string
  brand_name: string
  platform: PlatformType
  account_id: string
  sub_brand: string | null
  note: string | null
  country: string | null
  is_active: boolean
  store_id?: string | null  // TikTok GMV Max용 Store ID (자동 감지)
  _shopeeRowIds?: string[]  // 쇼피 통합: shopping+inapp 두 행의 DB PK
  _amazonRowIds?: string[]  // 아마존 통합: organic+ads+asin 세 행의 DB PK
  _qoo10RowIds?: string[]   // 큐텐 통합: ads+organic 두 행의 DB PK
}

interface EditingValues {
  account_id: string
  sub_brand: string
  note: string
  country: string
}

interface AccountManagerProps {
  brands: Brand[]
}

const PLATFORM_LABEL: Record<PlatformType, string> = {
  meta: '페북/인스타',
  tiktok: '틱톡',
  shopee: '쇼피',
  amazon: '아마존',
  qoo10: '큐텐',
}

const COUNTRY_OPTIONS = [
  { code: 'KR', flag: '🇰🇷' },
  { code: 'US', flag: '🇺🇸' },
  { code: 'JP', flag: '🇯🇵' },
  { code: 'VN', flag: '🇻🇳' },
  { code: 'TW', flag: '🇹🇼' },
  { code: 'SG', flag: '🇸🇬' },
  { code: 'PH', flag: '🇵🇭' },
  { code: 'MY', flag: '🇲🇾' },
  { code: 'TH', flag: '🇹🇭' },
  { code: 'ID', flag: '🇮🇩' },
]

function getSubBrandPlaceholder(platform: PlatformType | ''): string {
  if (platform === 'shopee') return 'Shopee_국가'
  return '광고계정명'
}

function getAccountIdPlaceholder(platform: PlatformType | ''): string {
  if (platform === 'shopee') return 'User Name'
  if (platform === 'qoo10') return '브랜드명을 입력하세요'
  return '광고계정ID'
}

function isShopee(platform: PlatformType | ''): boolean {
  return platform === 'shopee'
}

function isAmazon(platform: PlatformType | ''): boolean {
  return platform === 'amazon'
}

function isQoo10(platform: PlatformType | ''): boolean {
  return platform === 'qoo10'
}

function getApiEndpoint(platform: PlatformType): string {
  if (isShopee(platform)) return '/api/admin/accounts/shopee'
  if (isAmazon(platform)) return '/api/admin/accounts/amazon'
  if (isQoo10(platform)) return '/api/admin/accounts/qoo10'
  return `/api/admin/accounts/${platform}`
}

function CountrySelect({
  value,
  onValueChange,
  placeholder = '국가 선택',
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-28">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {COUNTRY_OPTIONS.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.flag} {c.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function AccountManager({ brands }: AccountManagerProps) {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(
    brands[0]?.id ?? null
  )
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([])
  const [registered, setRegistered] = useState<RegisteredAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValues, setEditingValues] = useState<EditingValues>({
    account_id: '',
    sub_brand: '',
    note: '',
    country: '',
  })
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    platform: PlatformType
    externalAccountId?: string  // 쇼피/아마존: 외부 account_id로 모든 행 삭제
  } | null>(null)

  // 브랜드별 등록 계정 수
  const countByBrand = (brandId: string) =>
    registered.filter((a) => a.brand_id === brandId).length

  // 선택된 브랜드 객체
  const selectedBrand = brands.find((b) => b.id === selectedBrandId)

  // 선택된 브랜드의 계정만 필터링
  const filteredAccounts = registered.filter(
    (a) => a.brand_id === selectedBrandId
  )

  // 마운트 시 Meta + TikTok + Shopee + Amazon + Qoo10 계정 병렬 로드
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [metaRes, tiktokRes, shopeeRes, amazonRes, qoo10Res] = await Promise.all([
        fetch('/api/admin/accounts/meta'),
        fetch('/api/admin/accounts/tiktok'),
        fetch('/api/admin/accounts/shopee'),
        fetch('/api/admin/accounts/amazon'),
        fetch('/api/admin/accounts/qoo10'),
      ])
      const [metaJson, tiktokJson, shopeeJson, amazonJson, qoo10Json] = await Promise.all([
        metaRes.json(),
        tiktokRes.json(),
        shopeeRes.json(),
        amazonRes.json(),
        qoo10Res.json(),
      ])

      const metaAccounts: RegisteredAccount[] = (metaJson.accounts ?? []).map(
        (a: Omit<RegisteredAccount, 'platform'>) => ({
          ...a,
          platform: 'meta' as PlatformType,
        })
      )
      const tiktokAccounts: RegisteredAccount[] = (
        tiktokJson.accounts ?? []
      ).map((a: Omit<RegisteredAccount, 'platform'>) => ({
        ...a,
        platform: 'tiktok' as PlatformType,
        store_id: (a as RegisteredAccount).store_id ?? null,
      }))

      // shopee 계정을 brand_id + account_id 기준으로 그룹핑하여 하나의 항목으로 표시
      type RawAccount = {
        id: string
        brand_id: string
        brand_name: string
        account_id: string
        sub_brand: string | null
        account_type: string
        country: string | null
        is_active: boolean
      }
      const shopeeByKey = new Map<string, RawAccount[]>()
      for (const row of shopeeJson.accounts ?? []) {
        const key = `${row.brand_id}__${row.account_id}`
        if (!shopeeByKey.has(key)) shopeeByKey.set(key, [])
        shopeeByKey.get(key)!.push(row)
      }

      const shopeeAccountsMapped: RegisteredAccount[] = []
      for (const rows of shopeeByKey.values()) {
        // 대표 행: shopping 우선, 없으면 첫 번째 행
        const rep = rows.find((r) => r.account_type === 'shopping') ?? rows[0]
        shopeeAccountsMapped.push({
          id: rep.id,
          brand_id: rep.brand_id,
          brand_name: rep.brand_name,
          platform: 'shopee' as PlatformType,
          account_id: rep.account_id,
          sub_brand: rep.sub_brand,
          note: null,
          country: rep.country,
          is_active: rows.some((r) => r.is_active),
          _shopeeRowIds: rows.map((r) => r.id),
        })
      }

      // amazon 계정을 brand_id + account_id 기준으로 그룹핑하여 하나의 항목으로 표시
      const amazonByKey = new Map<string, RawAccount[]>()
      for (const row of amazonJson.accounts ?? []) {
        const key = `${row.brand_id}__${row.account_id}`
        if (!amazonByKey.has(key)) amazonByKey.set(key, [])
        amazonByKey.get(key)!.push(row)
      }

      const amazonAccountsMapped: RegisteredAccount[] = []
      for (const rows of amazonByKey.values()) {
        // 대표 행: organic 우선, 없으면 첫 번째 행
        const rep = rows.find((r) => r.account_type === 'organic') ?? rows[0]
        amazonAccountsMapped.push({
          id: rep.id,
          brand_id: rep.brand_id,
          brand_name: rep.brand_name,
          platform: 'amazon' as PlatformType,
          account_id: rep.account_id,
          sub_brand: rep.sub_brand,
          note: null,
          country: rep.country,
          is_active: rows.some((r) => r.is_active),
          _amazonRowIds: rows.map((r) => r.id),
        })
      }

      // qoo10 계정을 brand_id + account_id 기준으로 그룹핑하여 하나의 항목으로 표시
      const qoo10ByKey = new Map<string, RawAccount[]>()
      for (const row of qoo10Json.accounts ?? []) {
        const key = `${row.brand_id}__${row.account_id}`
        if (!qoo10ByKey.has(key)) qoo10ByKey.set(key, [])
        qoo10ByKey.get(key)!.push(row)
      }

      const qoo10AccountsMapped: RegisteredAccount[] = []
      for (const rows of qoo10ByKey.values()) {
        // 대표 행: ads 우선, 없으면 첫 번째 행
        const rep = rows.find((r) => r.account_type === 'ads') ?? rows[0]
        qoo10AccountsMapped.push({
          id: rep.id,
          brand_id: rep.brand_id,
          brand_name: rep.brand_name,
          platform: 'qoo10' as PlatformType,
          account_id: rep.account_id,
          sub_brand: rep.sub_brand,
          note: null,
          country: rep.country,
          is_active: rows.some((r) => r.is_active),
          _qoo10RowIds: rows.map((r) => r.id),
        })
      }

      setRegistered([
        ...metaAccounts,
        ...tiktokAccounts,
        ...shopeeAccountsMapped,
        ...amazonAccountsMapped,
        ...qoo10AccountsMapped,
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // 추가 행 생성 — 선택된 브랜드로 brand_id 자동 설정
  function addPendingRow() {
    setPendingRows((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        brand_id: selectedBrandId ?? '',
        platform: '',
        account_id: '',
        sub_brand: '',
        note: '',
        country: '',
        is_active: true,
      },
    ])
  }

  // pending 행 필드 업데이트
  function updatePending(key: string, fields: Partial<PendingRow>) {
    setPendingRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, ...fields } : r))
    )
  }

  // pending 행 삭제
  function removePending(key: string) {
    setPendingRows((prev) => prev.filter((r) => r._key !== key))
  }

  // pending 행 저장 (매체·광고계정 ID 필수)
  async function savePending(row: PendingRow) {
    if (!row.brand_id || !row.platform || !row.account_id) return

    const endpoint = getApiEndpoint(row.platform as PlatformType)
    const body: Record<string, unknown> = {
      brand_id: row.brand_id,
      account_id: row.account_id,
      sub_brand: row.sub_brand || null,
      note: row.note || null,
      country: row.country || null,
      is_active: row.is_active,
    }
    // shopee: account_type 없이 POST → API에서 shopping+inapp 두 행 동시 생성

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json.error) {
      setSaveErrors((prev) => ({ ...prev, [row._key]: json.error }))
      return
    }
    setSaveErrors((prev) => {
      const next = { ...prev }
      delete next[row._key]
      return next
    })
    removePending(row._key)
    await fetchAll()
  }

  // 등록 계정 삭제
  async function deleteRegistered(id: string, platform: PlatformType, externalAccountId?: string) {
    if (platform === 'shopee' && externalAccountId) {
      // shopee: account_id 기준으로 shopping+inapp 두 행 모두 삭제
      const res = await fetch(`/api/admin/accounts/shopee?account_id=${externalAccountId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.error) {
        setRegistered((prev) => prev.filter((a) => !(a.platform === 'shopee' && a.account_id === externalAccountId)))
      }
      return
    }
    if (platform === 'amazon' && externalAccountId) {
      // amazon: account_id 기준으로 organic+ads+asin 세 행 모두 삭제
      const res = await fetch(`/api/admin/accounts/amazon?account_id=${externalAccountId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.error) {
        setRegistered((prev) => prev.filter((a) => !(a.platform === 'amazon' && a.account_id === externalAccountId)))
      }
      return
    }
    if (platform === 'qoo10' && externalAccountId) {
      // qoo10: account_id 기준으로 ads+organic 두 행 모두 삭제
      const res = await fetch(`/api/admin/accounts/qoo10?account_id=${externalAccountId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.error) {
        setRegistered((prev) => prev.filter((a) => !(a.platform === 'qoo10' && a.account_id === externalAccountId)))
      }
      return
    }
    const endpoint = getApiEndpoint(platform)
    const res = await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.error) {
      setRegistered((prev) => prev.filter((a) => a.id !== id))
    }
  }

  // 수정 모드 진입
  function startEditing(account: RegisteredAccount) {
    setEditingId(account.id)
    setEditingValues({
      account_id: account.account_id,
      sub_brand: account.sub_brand ?? '',
      note: account.note ?? '',
      country: account.country ?? '',
    })
  }

  // 인라인 수정 저장
  async function saveEditing(account: RegisteredAccount) {
    const endpoint = getApiEndpoint(account.platform)
    const body: Record<string, unknown> = {
      brand_id: account.brand_id,
      account_id: editingValues.account_id,
      sub_brand: editingValues.sub_brand || null,
      note: editingValues.note || null,
      country: editingValues.country || null,
      is_active: account.is_active,
    }
    // shopee: account_type 없이 POST → API에서 shopping+inapp 두 행 동시 upsert

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!json.error) {
      setEditingId(null)
      await fetchAll()
    }
  }

  // 활성여부 토글 (Server Action 재사용)
  async function handleToggle(account: RegisteredAccount) {
    if (account.platform === 'meta') {
      await toggleMetaAccount(account.id, !account.is_active)
    } else if (account.platform === 'tiktok') {
      await toggleTiktokAccount(account.id, !account.is_active)
    } else if (account.platform === 'amazon') {
      // amazon: 연결된 모든 행(organic+ads+asin) 토글
      const ids = account._amazonRowIds ?? [account.id]
      await Promise.all(ids.map((rid) => toggleAmazonAccount(rid, !account.is_active)))
    } else if (account.platform === 'qoo10') {
      // qoo10: 연결된 모든 행(ads+organic) 토글
      const ids = account._qoo10RowIds ?? [account.id]
      await Promise.all(ids.map((rid) => toggleQoo10Account(rid, !account.is_active)))
    } else {
      // shopee: 연결된 모든 행(shopping+inapp) 토글
      const ids = account._shopeeRowIds ?? [account.id]
      await Promise.all(ids.map((rid) => toggleShopeeAccount(rid, !account.is_active)))
    }
    setRegistered((prev) =>
      prev.map((a) =>
        a.id === account.id ? { ...a, is_active: !account.is_active } : a
      )
    )
  }

  const canSavePending = (row: PendingRow) =>
    !!row.brand_id && !!row.platform && !!row.account_id

  // 브랜드가 없는 경우
  if (brands.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">등록된 브랜드가 없습니다.</p>
    )
  }

  return (
    <div className="flex gap-6">
      {/* 왼쪽 — 브랜드 목록 */}
      <div className="w-48 overflow-hidden rounded-md border">
        <div className="bg-muted/30 border-b px-3 py-2">
          <p className="text-muted-foreground text-xs font-medium">브랜드</p>
        </div>
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBrandId(b.id)}
            className={cn(
              'hover:bg-muted/50 flex w-full items-center justify-between px-3 py-2 text-left text-sm',
              selectedBrandId === b.id && 'bg-muted font-medium'
            )}
          >
            <span className="truncate">{b.name}</span>
            {loading ? (
              <Skeleton className="h-4 w-5 rounded-sm" />
            ) : (
              <Badge variant="secondary" className="ml-1 text-xs">
                {countByBrand(b.id)}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* 오른쪽 — 선택된 브랜드의 광고계정 */}
      <div className="flex-1 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{selectedBrand?.name} 광고계정</h3>
          <Button variant="outline" size="sm" onClick={addPendingRow}>
            + 광고계정 추가
          </Button>
        </div>

        {/* Pending rows */}
        {pendingRows.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>활성</TableHead>
                  <TableHead>매체</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>국가</TableHead>
                  <TableHead>광고계정 ID</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRows.map((row) => (
                  <TableRow key={row._key}>
                    <TableCell>
                      <Switch
                        checked={row.is_active}
                        onCheckedChange={() =>
                          updatePending(row._key, { is_active: !row.is_active })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.platform}
                        onValueChange={(v) =>
                          updatePending(row._key, {
                            platform: v as PlatformType,
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="매체 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meta">페북/인스타</SelectItem>
                          <SelectItem value="tiktok">틱톡</SelectItem>
                          <SelectItem value="shopee">쇼피</SelectItem>
                          <SelectItem value="amazon">아마존</SelectItem>
                          <SelectItem value="qoo10">큐텐</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-28"
                        placeholder={getSubBrandPlaceholder(row.platform)}
                        value={row.sub_brand}
                        onChange={(e) =>
                          updatePending(row._key, { sub_brand: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <CountrySelect
                        value={row.country}
                        onValueChange={(v) =>
                          updatePending(row._key, { country: v })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-44"
                        placeholder={getAccountIdPlaceholder(row.platform)}
                        value={row.account_id}
                        onChange={(e) =>
                          updatePending(row._key, {
                            account_id: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-36"
                        placeholder="비고 (선택)"
                        value={row.note}
                        onChange={(e) =>
                          updatePending(row._key, { note: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={!canSavePending(row)}
                          onClick={() => savePending(row)}
                        >
                          저장
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePending(row._key)}
                        >
                          취소
                        </Button>
                        {saveErrors[row._key] && (
                          <span className="text-xs text-red-600">
                            {saveErrors[row._key]}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 등록된 광고계정 목록 */}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            이 브랜드에 등록된 계정이 없습니다.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상태</TableHead>
                  <TableHead>매체</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>국가</TableHead>
                  <TableHead>광고계정 ID</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => {
                  const isEditing = editingId === account.id
                  const countryOption = COUNTRY_OPTIONS.find(
                    (c) => c.code === account.country
                  )
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <Switch
                          checked={account.is_active}
                          onCheckedChange={() => handleToggle(account)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{PLATFORM_LABEL[account.platform]}</span>
                          {account.platform === 'tiktok' && account.store_id && (
                            <Badge variant="secondary" className="w-fit text-xs">
                              GMV Max
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            className="w-28"
                            placeholder={getSubBrandPlaceholder(account.platform)}
                            value={editingValues.sub_brand}
                            onChange={(e) =>
                              setEditingValues((prev) => ({
                                ...prev,
                                sub_brand: e.target.value,
                              }))
                            }
                          />
                        ) : account.sub_brand ? (
                          account.sub_brand
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <CountrySelect
                            value={editingValues.country}
                            onValueChange={(v) =>
                              setEditingValues((prev) => ({
                                ...prev,
                                country: v,
                              }))
                            }
                          />
                        ) : countryOption ? (
                          `${countryOption.flag} ${countryOption.code}`
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {isEditing ? (
                          <Input
                            className="w-44"
                            placeholder={getAccountIdPlaceholder(account.platform)}
                            value={editingValues.account_id}
                            onChange={(e) =>
                              setEditingValues((prev) => ({
                                ...prev,
                                account_id: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          account.account_id
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            className="w-36"
                            placeholder="비고 (선택)"
                            value={editingValues.note}
                            onChange={(e) =>
                              setEditingValues((prev) => ({
                                ...prev,
                                note: e.target.value,
                              }))
                            }
                          />
                        ) : account.note ? (
                          account.note
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => saveEditing(account)}
                              >
                                저장
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingId(null)}
                              >
                                취소
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditing(account)}
                              >
                                수정
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: account.id,
                                    platform: account.platform,
                                    externalAccountId:
                                      account.platform === 'shopee' ||
                                      account.platform === 'amazon' ||
                                      account.platform === 'qoo10'
                                        ? account.account_id
                                        : undefined,
                                  })
                                }
                              >
                                삭제
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>광고계정 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 광고계정을 삭제하면 관련 통계 데이터도 함께 삭제될 수 있습니다.
              정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget)
                  deleteRegistered(deleteTarget.id, deleteTarget.platform, deleteTarget.externalAccountId)
                setDeleteTarget(null)
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
