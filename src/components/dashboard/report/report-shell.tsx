'use client'

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCreateReport, useDeleteReport, useGenerateSnapshot, useReports } from '@/hooks/use-reports'
import type { Brand, ReportListItem } from '@/types/database'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight,
  FileDown,
  FileText,
  Folder,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

// ── 타입 ──────────────────────────────────────

interface AccountOption {
  id: string       // DB PK (internal_account_id로 저장)
  account_id: string
  label: string    // 표시용
  country: string | null
  account_type?: string
}

interface ReportShellProps {
  initialReports: ReportListItem[]
  role: 'admin' | 'viewer'
  brands: Brand[]
}

// ── 상수 ──────────────────────────────────────

const PLATFORM_OPTIONS = [
  { value: 'meta' as const, label: 'META' },
  { value: 'shopee' as const, label: 'SHOPEE (쇼피)' },
  { value: 'tiktok' as const, label: 'TIKTOK' },
  { value: 'amazon' as const, label: 'AMAZON' },
  { value: 'qoo10' as const, label: 'QOO10 (큐텐)' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 3 }, (_, i) => CURRENT_YEAR - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function prevMonth() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

// ── 플랫폼 뱃지 ──────────────────────────────

function PlatformBadge({ platform }: { platform: 'meta' | 'shopee' | 'shopee_inapp' | 'tiktok' | 'amazon' | 'qoo10' }) {
  if (platform === 'meta') {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">META</Badge>
  }
  if (platform === 'tiktok') {
    return <Badge className="bg-black text-white hover:bg-black">TIKTOK</Badge>
  }
  if (platform === 'amazon') {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">AMAZON</Badge>
  }
  if (platform === 'qoo10') {
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">QOO10</Badge>
  }
  return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">SHOPEE</Badge>
}

// ── 리포트 행 ──────────────────────────────────

interface ReportRowProps {
  report: ReportListItem
  role: 'admin' | 'viewer'
  onDeleteClick: (report: ReportListItem) => void
}

function ReportRow({ report, role, onDeleteClick }: ReportRowProps) {
  const router = useRouter()
  const monthStr = String(report.month).padStart(2, '0')

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${report.title} 리포트 보기`}
      className="hover:bg-muted/30 focus-visible:ring-ring flex cursor-pointer items-center gap-3 border-t px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset"
      onClick={() => router.push(`/dashboard/report/${report.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/dashboard/report/${report.id}`)
        }
      }}
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{report.title}</span>
      <div className="flex shrink-0 items-center gap-2">
        <PlatformBadge platform={report.platform} />
        {report.country && (
          <Badge variant="secondary" className="text-xs">
            {report.country.toUpperCase()}
          </Badge>
        )}
        <span className="text-muted-foreground text-xs">
          {report.year}-{monthStr}
        </span>
        {role === 'admin' && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-7"
            aria-label={`${report.title} 리포트 삭제`}
            onClick={(e) => {
              e.stopPropagation()
              onDeleteClick(report)
            }}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ── 새 리포트 생성 모달 ────────────────────────

interface CreateDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  brands: Brand[]
}

function CreateReportDialog({ open, onOpenChange, brands }: CreateDialogProps) {
  const router = useRouter()
  const createReport = useCreateReport()
  const generateSnapshot = useGenerateSnapshot()

  const [brandId, setBrandId] = useState('')
  const [platform, setPlatform] = useState<'meta' | 'shopee' | 'tiktok' | 'amazon' | 'qoo10' | ''>('')
  const [country, setCountry] = useState('')
  const [accountId, setAccountId] = useState('')  // internal_account_id (DB PK)
  const { year: defaultYear, month: defaultMonth } = prevMonth()
  const [year, setYear] = useState(defaultYear)
  const [month, setMonth] = useState(defaultMonth)

  const [submitting, setSubmitting] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  // 계정 목록 조회 (TanStack Query로 캐싱)
  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['admin', 'accounts', 'all'],
    queryFn: async () => {
      const [metaRes, shopeeRes, tiktokRes, amazonRes, qoo10Res] = await Promise.all([
        fetch('/api/admin/accounts/meta').then((r) => r.json()),
        fetch('/api/admin/accounts/shopee').then((r) => r.json()),
        fetch('/api/admin/accounts/tiktok').then((r) => r.json()),
        fetch('/api/admin/accounts/amazon').then((r) => r.json()),
        fetch('/api/admin/accounts/qoo10').then((r) => r.json()),
      ])
      return {
        meta: metaRes.accounts ?? [],
        shopee: shopeeRes.accounts ?? [],
        tiktok: tiktokRes.accounts ?? [],
        amazon: amazonRes.accounts ?? [],
        qoo10: qoo10Res.accounts ?? [],
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!brandId,
  })

  // 브랜드별 계정 목록 필터링
  const allAccounts = useMemo<AccountOption[]>(() => {
    if (!accountsData || !brandId) return []

    const metaAccounts: AccountOption[] = (accountsData.meta ?? [])
      .filter((a: { brand_id: string; is_active: boolean }) => a.brand_id === brandId && a.is_active)
      .map((a: { id: string; account_id: string; sub_brand: string | null; note: string | null; country: string | null }) => ({
        id: a.id,
        account_id: a.account_id,
        label: [a.sub_brand || a.note, a.account_id].filter(Boolean).join(' / '),
        country: a.country,
        account_type: 'meta',
      }))

    // account_id 기준 중복 제거 (inapp 행 우선 - 리포트는 inapp 기반)
    const shopeeInappAccounts: AccountOption[] = (() => {
      const seen = new Set<string>()
      const result: AccountOption[] = []
      const sorted = [...(accountsData.shopee ?? [])]
        .filter(
          (a: { brand_id: string; is_active: boolean }) =>
            a.brand_id === brandId && a.is_active,
        )
        .sort((a: { account_type: string }, b: { account_type: string }) =>
          a.account_type === 'inapp' ? -1 : b.account_type === 'inapp' ? 1 : 0
        )
      for (const a of sorted as { id: string; account_id: string; sub_brand: string | null; country: string | null; account_type: string }[]) {
        if (seen.has(a.account_id)) continue
        seen.add(a.account_id)
        result.push({
          id: a.id,
          account_id: a.account_id,
          label: [a.sub_brand, a.account_id].filter(Boolean).join(' / '),
          country: a.country,
          account_type: 'shopee',
        })
      }
      return result
    })()

    const tiktokAccounts: AccountOption[] = (accountsData.tiktok ?? [])
      .filter((a: { brand_id: string; is_active: boolean }) => a.brand_id === brandId && a.is_active)
      .map((a: { id: string; account_id: string; sub_brand: string | null; note: string | null; country: string | null }) => ({
        id: a.id,
        account_id: a.account_id,
        label: [a.sub_brand || a.note, a.account_id].filter(Boolean).join(' / '),
        country: a.country,
        account_type: 'tiktok',
      }))

    // Amazon 계정 (organic 행 우선 중복 제거)
    const amazonAccounts: AccountOption[] = (() => {
      const seen = new Set<string>()
      const result: AccountOption[] = []
      const sorted = [...(accountsData.amazon ?? [])]
        .filter(
          (a: { brand_id: string; is_active: boolean }) =>
            a.brand_id === brandId && a.is_active,
        )
        .sort((a: { account_type: string }) =>
          a.account_type === 'organic' ? -1 : 1
        )
      for (const a of sorted as { id: string; account_id: string; account_name: string | null; country: string | null; account_type: string }[]) {
        if (seen.has(a.account_id)) continue
        seen.add(a.account_id)
        result.push({
          id: a.id,
          account_id: a.account_id,
          label: [a.account_name, a.account_id].filter(Boolean).join(' / '),
          country: a.country,
          account_type: 'amazon',
        })
      }
      return result
    })()

    // Qoo10 계정 (organic 우선 dedup)
    const qoo10Accounts: AccountOption[] = (() => {
      const seen = new Set<string>()
      const result: AccountOption[] = []
      const sorted = [...(accountsData.qoo10 ?? [])]
        .filter(
          (a: { brand_id: string; is_active: boolean }) =>
            a.brand_id === brandId && a.is_active,
        )
        .sort((a: { account_type: string }) =>
          a.account_type === 'organic' ? -1 : 1
        )
      for (const a of sorted as { id: string; account_id: string; sub_brand: string | null; country: string | null; account_type: string }[]) {
        if (seen.has(a.account_id)) continue
        seen.add(a.account_id)
        result.push({
          id: a.id,
          account_id: a.account_id,
          label: [a.sub_brand, a.account_id].filter(Boolean).join(' / '),
          country: a.country,
          account_type: 'qoo10',
        })
      }
      return result
    })()

    return [...metaAccounts, ...shopeeInappAccounts, ...tiktokAccounts, ...amazonAccounts, ...qoo10Accounts]
  }, [accountsData, brandId])

  // 플랫폼별 사용 가능 옵션
  const availablePlatforms = useMemo(() => {
    const hasMeta = allAccounts.some((a) => a.account_type === 'meta')
    const hasShopee = allAccounts.some((a) => a.account_type === 'shopee')
    const hasTiktok = allAccounts.some((a) => a.account_type === 'tiktok')
    const hasAmazon = allAccounts.some((a) => a.account_type === 'amazon')
    const hasQoo10 = allAccounts.some((a) => a.account_type === 'qoo10')
    return PLATFORM_OPTIONS.filter((p) => {
      if (p.value === 'meta') return hasMeta
      if (p.value === 'shopee') return hasShopee
      if (p.value === 'tiktok') return hasTiktok
      if (p.value === 'amazon') return hasAmazon
      if (p.value === 'qoo10') return hasQoo10
      return false
    })
  }, [allAccounts])

  // 플랫폼에 맞는 계정 목록 필터링
  const filteredAccounts = useMemo(
    () => allAccounts.filter((a) => a.account_type === platform),
    [allAccounts, platform],
  )

  // 국가 목록 (중복 제거)
  const countries = useMemo(() => {
    const set = new Set(filteredAccounts.map((a) => a.country ?? ''))
    return [...set].filter(Boolean).sort()
  }, [filteredAccounts])

  // 국가 선택 후 계정 목록
  const accountsForCountry = useMemo(
    () => filteredAccounts.filter((a) => (a.country ?? '') === country),
    [filteredAccounts, country],
  )

  const canSubmit = brandId && platform && accountId && year && month && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setLoadingMsg('')
    try {
      const selectedAccount = allAccounts.find((a) => a.id === accountId)
      const report = await createReport.mutateAsync({
        brand_id: brandId,
        platform: platform as 'meta' | 'shopee' | 'tiktok' | 'amazon' | 'qoo10',
        country: country || null,
        internal_account_id: selectedAccount?.id ?? null,
        year,
        month,
      })
      setLoadingMsg('리포트 데이터를 불러오는 중...')
      await generateSnapshot.mutateAsync(report.id)
      router.push(`/dashboard/report/${report.id}`)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
      setLoadingMsg('')
    }
  }

  function handleOpenChange(v: boolean) {
    if (submitting) return
    if (!v) {
      // 상태 초기화
      setBrandId('')
      setPlatform('')
      setCountry('')
      setAccountId('')
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md gap-0 p-0 overflow-hidden"
        showCloseButton={!submitting}
        onInteractOutside={(e) => {
          if (submitting) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (submitting) e.preventDefault()
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-5">
          <DialogTitle className="text-xl font-bold">새 리포트 만들기</DialogTitle>
        </DialogHeader>
        <Separator />

        {submitting ? (
          <div className="flex flex-col items-center gap-4 px-6 py-12">
            <Loader2 className="text-muted-foreground size-8 animate-spin" />
            <p className="text-muted-foreground text-sm">
              {loadingMsg || '리포트를 생성하는 중...'}
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
          >
            <div className="space-y-5 px-6 py-6">
              {/* 1. 그룹 */}
              <div className="space-y-2">
                <Label htmlFor="report-brand" className="text-sm font-medium">그룹</Label>
                <Select
                  value={brandId}
                  onValueChange={(v) => {
                    setBrandId(v)
                    setPlatform('')
                    setCountry('')
                    setAccountId('')
                  }}
                >
                  <SelectTrigger id="report-brand" className="!h-14 w-full rounded-xl px-4 text-base">
                    <SelectValue placeholder="그룹 선택" />
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

              {/* 2. 플랫폼 */}
              <div className="space-y-2">
                <Label htmlFor="report-platform" className="text-sm font-medium">플랫폼</Label>
                <Select
                  value={platform}
                  onValueChange={(v) => {
                    setPlatform(v as 'meta' | 'shopee' | 'tiktok' | 'amazon' | 'qoo10')
                    setCountry('')
                    setAccountId('')
                  }}
                  disabled={!brandId || loadingAccounts || availablePlatforms.length === 0}
                >
                  <SelectTrigger id="report-platform" className="!h-14 w-full rounded-xl px-4 text-base">
                    <SelectValue
                      placeholder={
                        !brandId
                          ? '그룹을 먼저 선택하세요'
                          : loadingAccounts
                            ? '계정 목록 불러오는 중...'
                            : '플랫폼 선택'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlatforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. 국가 */}
              <div className="space-y-2">
                <Label htmlFor="report-country" className="text-sm font-medium">국가</Label>
                <Select
                  value={country}
                  onValueChange={(v) => {
                    setCountry(v)
                    setAccountId('')
                  }}
                  disabled={!platform || countries.length === 0}
                >
                  <SelectTrigger id="report-country" className="!h-14 w-full rounded-xl px-4 text-base">
                    <SelectValue
                      placeholder={
                        !platform ? '플랫폼을 먼저 선택하세요' : '국가 선택'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {platform && countries.length === 0 && (
                  <p className="text-muted-foreground text-xs">
                    선택한 플랫폼에 등록된 국가 정보가 없습니다.
                  </p>
                )}
              </div>

              {/* 4. 광고계정 */}
              {country && accountsForCountry.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">광고계정</Label>
                  <RadioGroup value={accountId} onValueChange={setAccountId} className="space-y-2">
                    {accountsForCountry.map((a) => (
                      <label
                        key={a.id}
                        htmlFor={`account-${a.id}`}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-foreground"
                      >
                        <RadioGroupItem value={a.id} id={`account-${a.id}`} className="shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{a.label}</p>
                          <p className="text-muted-foreground text-xs">ID: {a.account_id}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* 5. 리포트 대상 월 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">리포트 대상 월</Label>
                <div className="flex gap-3">
                  <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="!h-14 flex-1 rounded-xl px-4 text-base" aria-label="연도 선택">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}년
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="!h-14 flex-1 rounded-xl px-4 text-base" aria-label="월 선택">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m}월
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />
            <DialogFooter className="px-6 py-4">
              <Button
                variant="outline"
                type="button"
                className="h-12 rounded-xl px-6"
                onClick={() => handleOpenChange(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="h-12 rounded-xl bg-neutral-900 px-6 hover:bg-neutral-800"
                disabled={!canSubmit}
              >
                작성 시작하기
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── 메인 Shell ────────────────────────────────

export function ReportShell({ initialReports, role, brands }: ReportShellProps) {
  const { data: reports } = useReports(initialReports)
  const deleteReport = useDeleteReport()

  const [openCreate, setOpenCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ReportListItem | null>(null)

  // 브랜드별 그룹핑 (가나다순)
  const grouped = useMemo(() => {
    const map = new Map<string, { brandName: string; items: ReportListItem[] }>()
    for (const r of reports ?? []) {
      const entry = map.get(r.brand_id) ?? { brandName: r.brand_name, items: [] }
      entry.items.push(r)
      map.set(r.brand_id, entry)
    }
    return [...map.entries()]
      .sort(([, a], [, b]) => a.brandName.localeCompare(b.brandName, 'ko'))
      .map(([brandId, { brandName, items }]) => {
        const sorted = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))
        const latest = sorted[0]
        const latestLabel = latest
          ? `${latest.year}-${String(latest.month).padStart(2, '0')}`
          : ''
        return { brandId, brandName, items: sorted, latestLabel }
      })
  }, [reports])

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteReport.mutateAsync(deleteTarget.id)
      toast.success('리포트가 삭제되었습니다.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="text-muted-foreground mt-0.5 size-6 shrink-0" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold">광고 성과 리포트</h1>
            <p className="text-muted-foreground text-sm">
              월별 성과 리포트를 생성하고 관리합니다.
            </p>
          </div>
        </div>
        {role === 'admin' && (
          <div className="flex shrink-0 gap-2">
            {/* PDF 병합 다운로드 - 준비 중인 기능 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="outline"
                      className="text-muted-foreground pointer-events-none"
                      disabled
                      aria-label="PDF 병합 다운로드 (준비 중인 기능)"
                    >
                      <FileDown className="mr-1.5 size-4" aria-hidden="true" />
                      PDF 병합 다운로드
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>준비 중인 기능입니다</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              className="bg-neutral-900 hover:bg-neutral-800"
              onClick={() => setOpenCreate(true)}
            >
              <Plus className="mr-1.5 size-4" aria-hidden="true" />새 리포트 생성
            </Button>
          </div>
        )}
      </div>

      {/* 리포트 목록 */}
      {grouped.length === 0 ? (
        <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
          <FileText className="size-8 opacity-40" aria-hidden="true" />
          <p className="text-sm">생성된 리포트가 없습니다.</p>
          {role === 'admin' && (
            <Button
              variant="link"
              size="sm"
              className="text-xs"
              onClick={() => setOpenCreate(true)}
            >
              첫 리포트를 생성해보세요
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ brandId, brandName, items, latestLabel }) => (
            <Collapsible key={brandId} className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <button
                  className="hover:bg-muted/40 flex w-full items-center justify-between rounded-lg px-4 py-3 transition-colors"
                  aria-label={`${brandName} 브랜드 그룹, 리포트 ${items.length}개`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      className="text-muted-foreground size-4 transition-transform duration-200 [[data-state=open]_&]:rotate-90"
                      aria-hidden="true"
                    />
                    <Folder className="text-muted-foreground size-4" aria-hidden="true" />
                    <span className="font-medium">{brandName}</span>
                    <Badge variant="secondary" className="text-xs" aria-hidden="true">
                      {items.length}개
                    </Badge>
                  </div>
                  {latestLabel && (
                    <span className="text-muted-foreground text-xs">최근: {latestLabel}</span>
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {items.map((r) => (
                  <ReportRow
                    key={r.id}
                    report={r}
                    role={role}
                    onDeleteClick={setDeleteTarget}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {/* 새 리포트 생성 모달 */}
      {role === 'admin' && (
        <CreateReportDialog open={openCreate} onOpenChange={setOpenCreate} brands={brands} />
      )}

      {/* 삭제 확인 AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>리포트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; 리포트를 삭제합니다. 이 작업은 되돌릴 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
