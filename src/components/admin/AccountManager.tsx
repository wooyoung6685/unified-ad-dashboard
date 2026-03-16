'use client'

import {
  toggleMetaAccount,
  toggleTiktokAccount,
} from '@/app/dashboard/admin/actions'
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

type PlatformType = 'meta' | 'tiktok'

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
    brands[0]?.id ?? null,
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

  // 브랜드별 등록 계정 수
  const countByBrand = (brandId: string) =>
    registered.filter((a) => a.brand_id === brandId).length

  // 선택된 브랜드 객체
  const selectedBrand = brands.find((b) => b.id === selectedBrandId)

  // 선택된 브랜드의 계정만 필터링
  const filteredAccounts = registered.filter(
    (a) => a.brand_id === selectedBrandId,
  )

  // 마운트 시 Meta + TikTok 계정 병렬 로드
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [metaRes, tiktokRes] = await Promise.all([
        fetch('/api/admin/accounts/meta'),
        fetch('/api/admin/accounts/tiktok'),
      ])
      const [metaJson, tiktokJson] = await Promise.all([metaRes.json(), tiktokRes.json()])

      const metaAccounts: RegisteredAccount[] = (metaJson.accounts ?? []).map(
        (a: Omit<RegisteredAccount, 'platform'>) => ({ ...a, platform: 'meta' as PlatformType }),
      )
      const tiktokAccounts: RegisteredAccount[] = (tiktokJson.accounts ?? []).map(
        (a: Omit<RegisteredAccount, 'platform'>) => ({ ...a, platform: 'tiktok' as PlatformType }),
      )
      setRegistered([...metaAccounts, ...tiktokAccounts])
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
    setPendingRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...fields } : r)))
  }

  // pending 행 삭제
  function removePending(key: string) {
    setPendingRows((prev) => prev.filter((r) => r._key !== key))
  }

  // pending 행 저장 (매체·광고계정 ID 필수)
  async function savePending(row: PendingRow) {
    if (!row.brand_id || !row.platform || !row.account_id) return

    const endpoint = `/api/admin/accounts/${row.platform}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_id: row.brand_id,
        account_id: row.account_id,
        sub_brand: row.sub_brand || null,
        note: row.note || null,
        country: row.country || null,
        is_active: row.is_active,
      }),
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
  async function deleteRegistered(id: string, platform: PlatformType) {
    const res = await fetch(`/api/admin/accounts/${platform}?id=${id}`, { method: 'DELETE' })
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
    const endpoint = `/api/admin/accounts/${account.platform}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_id: account.brand_id,
        account_id: editingValues.account_id,
        sub_brand: editingValues.sub_brand || null,
        note: editingValues.note || null,
        country: editingValues.country || null,
        is_active: account.is_active,
      }),
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
    } else {
      await toggleTiktokAccount(account.id, !account.is_active)
    }
    setRegistered((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, is_active: !account.is_active } : a)),
    )
  }

  const canSavePending = (row: PendingRow) => !!row.brand_id && !!row.platform && !!row.account_id

  // 브랜드가 없는 경우
  if (brands.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">등록된 브랜드가 없습니다.</p>
    )
  }

  return (
    <div className="flex gap-6">
      {/* 왼쪽 — 브랜드 목록 */}
      <div className="w-48 flex-shrink-0 rounded-md border">
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBrandId(b.id)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted/50',
              selectedBrandId === b.id && 'bg-muted font-medium',
            )}
          >
            <span className="truncate">{b.name}</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {countByBrand(b.id)}
            </Badge>
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
                  <TableHead>매체</TableHead>
                  <TableHead>서브 브랜드</TableHead>
                  <TableHead>국가</TableHead>
                  <TableHead>광고계정 ID</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead>활성</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRows.map((row) => (
                  <TableRow key={row._key}>
                    <TableCell>
                      <Select
                        value={row.platform}
                        onValueChange={(v) =>
                          updatePending(row._key, { platform: v as PlatformType })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="매체 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meta">페북/인스타</SelectItem>
                          <SelectItem value="tiktok">틱톡</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-28"
                        placeholder="서브 브랜드 (선택)"
                        value={row.sub_brand}
                        onChange={(e) => updatePending(row._key, { sub_brand: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <CountrySelect
                        value={row.country}
                        onValueChange={(v) => updatePending(row._key, { country: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-44"
                        placeholder="act_xxxxxxxx"
                        value={row.account_id}
                        onChange={(e) => updatePending(row._key, { account_id: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-36"
                        placeholder="비고 (선택)"
                        value={row.note}
                        onChange={(e) => updatePending(row._key, { note: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updatePending(row._key, { is_active: !row.is_active })}
                      >
                        <Badge variant={row.is_active ? 'default' : 'secondary'}>
                          {row.is_active ? '활성' : '비활성'}
                        </Badge>
                      </Button>
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
                          <span className="text-xs text-red-600">{saveErrors[row._key]}</span>
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
          <p className="text-muted-foreground text-sm">불러오는 중...</p>
        ) : filteredAccounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">이 브랜드에 등록된 계정이 없습니다.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>매체</TableHead>
                  <TableHead>서브 브랜드</TableHead>
                  <TableHead>국가</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead>광고계정 ID</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => {
                  const isEditing = editingId === account.id
                  const countryOption = COUNTRY_OPTIONS.find((c) => c.code === account.country)
                  return (
                    <TableRow key={account.id}>
                      <TableCell>{PLATFORM_LABEL[account.platform]}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            className="w-28"
                            placeholder="서브 브랜드 (선택)"
                            value={editingValues.sub_brand}
                            onChange={(e) =>
                              setEditingValues((prev) => ({ ...prev, sub_brand: e.target.value }))
                            }
                          />
                        ) : account.sub_brand ? (
                          account.sub_brand
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <CountrySelect
                            value={editingValues.country}
                            onValueChange={(v) =>
                              setEditingValues((prev) => ({ ...prev, country: v }))
                            }
                          />
                        ) : countryOption ? (
                          `${countryOption.flag} ${countryOption.code}`
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            className="w-36"
                            placeholder="비고 (선택)"
                            value={editingValues.note}
                            onChange={(e) =>
                              setEditingValues((prev) => ({ ...prev, note: e.target.value }))
                            }
                          />
                        ) : account.note ? (
                          account.note
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {isEditing ? (
                          <Input
                            className="w-44"
                            value={editingValues.account_id}
                            onChange={(e) =>
                              setEditingValues((prev) => ({ ...prev, account_id: e.target.value }))
                            }
                          />
                        ) : (
                          account.account_id
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => handleToggle(account)}
                        >
                          <Badge variant={account.is_active ? 'default' : 'secondary'}>
                            {account.is_active ? '활성' : '비활성'}
                          </Badge>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => saveEditing(account)}>
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
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => deleteRegistered(account.id, account.platform)}
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
    </div>
  )
}
