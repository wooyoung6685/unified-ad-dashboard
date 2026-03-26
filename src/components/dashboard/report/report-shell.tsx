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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateReport, useDeleteReport, useGenerateSnapshot, useReports } from '@/hooks/use-reports'
import type { Brand, ReportListItem } from '@/types/database'
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
import { useEffect, useMemo, useState } from 'react'
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
  { value: 'shopee_inapp' as const, label: 'SHOPEE (인앱)' },
  { value: 'tiktok' as const, label: 'TIKTOK' },
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

function PlatformBadge({ platform }: { platform: 'meta' | 'shopee_inapp' | 'tiktok' }) {
  if (platform === 'meta') {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">META</Badge>
  }
  if (platform === 'tiktok') {
    return <Badge className="bg-black text-white hover:bg-black">TIKTOK</Badge>
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
      className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 border-t px-4 py-3"
      onClick={() => router.push(`/dashboard/report/${report.id}`)}
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
            onClick={(e) => {
              e.stopPropagation()
              onDeleteClick(report)
            }}
          >
            <Trash2 className="size-4" />
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
  const [platform, setPlatform] = useState<'meta' | 'shopee_inapp' | 'tiktok' | ''>('')
  const [country, setCountry] = useState('')
  const [accountId, setAccountId] = useState('')  // internal_account_id (DB PK)
  const { year: defaultYear, month: defaultMonth } = prevMonth()
  const [year, setYear] = useState(defaultYear)
  const [month, setMonth] = useState(defaultMonth)

  const [allAccounts, setAllAccounts] = useState<AccountOption[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  // 브랜드 선택 시 해당 브랜드의 계정 목록 조회
  useEffect(() => {
    if (!brandId) {
      setAllAccounts([])
      setPlatform('')
      setCountry('')
      setAccountId('')
      return
    }
    setLoadingAccounts(true)
    Promise.all([
      fetch('/api/admin/accounts/meta').then((r) => r.json()),
      fetch('/api/admin/accounts/shopee').then((r) => r.json()),
      fetch('/api/admin/accounts/tiktok').then((r) => r.json()),
    ])
      .then(([metaJson, shopeeJson, tiktokJson]) => {
        const metaAccounts: AccountOption[] = (metaJson.accounts ?? [])
          .filter((a: { brand_id: string; is_active: boolean }) => a.brand_id === brandId && a.is_active)
          .map((a: { id: string; account_id: string; sub_brand: string | null; note: string | null; country: string | null }) => ({
            id: a.id,
            account_id: a.account_id,
            label: [a.sub_brand || a.note, a.account_id].filter(Boolean).join(' / '),
            country: a.country,
            account_type: 'meta',
          }))

        const shopeeInappAccounts: AccountOption[] = (shopeeJson.accounts ?? [])
          .filter(
            (a: { brand_id: string; account_type: string; is_active: boolean }) =>
              a.brand_id === brandId && a.account_type === 'inapp' && a.is_active,
          )
          .map((a: { id: string; account_id: string; sub_brand: string | null; country: string | null }) => ({
            id: a.id,
            account_id: a.account_id,
            label: [a.sub_brand, a.account_id].filter(Boolean).join(' / '),
            country: a.country,
            account_type: 'shopee_inapp',
          }))

        const tiktokAccounts: AccountOption[] = (tiktokJson.accounts ?? [])
          .filter((a: { brand_id: string; is_active: boolean }) => a.brand_id === brandId && a.is_active)
          .map((a: { id: string; account_id: string; sub_brand: string | null; note: string | null; country: string | null }) => ({
            id: a.id,
            account_id: a.account_id,
            label: [a.sub_brand || a.note, a.account_id].filter(Boolean).join(' / '),
            country: a.country,
            account_type: 'tiktok',
          }))

        setAllAccounts([...metaAccounts, ...shopeeInappAccounts, ...tiktokAccounts])
      })
      .catch(() => toast.error('계정 목록을 불러오지 못했습니다.'))
      .finally(() => setLoadingAccounts(false))
  }, [brandId])

  // 플랫폼 선택 시 country/account 초기화
  useEffect(() => {
    setCountry('')
    setAccountId('')
  }, [platform])

  // country 선택 시 account 초기화
  useEffect(() => {
    setAccountId('')
  }, [country])

  // 플랫폼별 사용 가능 옵션
  const availablePlatforms = useMemo(() => {
    const hasMeta = allAccounts.some((a) => a.account_type === 'meta')
    const hasShopee = allAccounts.some((a) => a.account_type === 'shopee_inapp')
    const hasTiktok = allAccounts.some((a) => a.account_type === 'tiktok')
    return PLATFORM_OPTIONS.filter((p) => {
      if (p.value === 'meta') return hasMeta
      if (p.value === 'shopee_inapp') return hasShopee
      if (p.value === 'tiktok') return hasTiktok
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
        platform: platform as 'meta' | 'shopee_inapp' | 'tiktok',
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 리포트 생성</DialogTitle>
        </DialogHeader>

        {submitting ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="text-muted-foreground size-8 animate-spin" />
            <p className="text-muted-foreground text-sm">
              {loadingMsg || '리포트를 생성하는 중...'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. 브랜드 */}
            <div className="space-y-1.5">
              <Label>브랜드 (그룹)</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
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

            {/* 2. 플랫폼 */}
            <div className="space-y-1.5">
              <Label>플랫폼</Label>
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as 'meta' | 'shopee_inapp' | 'tiktok')}
                disabled={!brandId || loadingAccounts || availablePlatforms.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingAccounts ? '계정 목록 불러오는 중...' : '플랫폼 선택'
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
            <div className="space-y-1.5">
              <Label>국가</Label>
              <Select
                value={country}
                onValueChange={setCountry}
                disabled={!platform || countries.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="국가 선택" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. 광고계정 */}
            {country && accountsForCountry.length > 0 && (
              <div className="space-y-1.5">
                <Label>광고계정</Label>
                <RadioGroup value={accountId} onValueChange={setAccountId} className="space-y-1">
                  {accountsForCountry.map((a) => (
                    <div key={a.id} className="flex items-center gap-2">
                      <RadioGroupItem value={a.id} id={`account-${a.id}`} />
                      <Label htmlFor={`account-${a.id}`} className="cursor-pointer font-normal">
                        {a.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* 5. 대상 월 */}
            <div className="space-y-1.5">
              <Label>리포트 대상 월</Label>
              <div className="flex gap-2">
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-28">
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
                  <SelectTrigger className="w-24">
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
        )}

        {!submitting && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              작성 시작하기
            </Button>
          </DialogFooter>
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
          <FileText className="text-muted-foreground mt-0.5 size-6 shrink-0" />
          <div>
            <h1 className="text-xl font-semibold">광고 성과 리포트</h1>
            <p className="text-muted-foreground text-sm">
              월별 성과 리포트를 생성하고 관리합니다.
            </p>
          </div>
        </div>
        {role === 'admin' && (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" className="text-red-500 hover:text-red-600">
              <FileDown className="mr-1.5 size-4" />
              PDF 병합 다운로드
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => setOpenCreate(true)}
            >
              <Plus className="mr-1.5 size-4" />새 리포트 생성
            </Button>
          </div>
        )}
      </div>

      {/* 리포트 목록 */}
      {grouped.length === 0 ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center rounded-lg border border-dashed text-sm">
          생성된 리포트가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ brandId, brandName, items, latestLabel }) => (
            <Collapsible key={brandId} className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <button className="hover:bg-muted/40 flex w-full items-center justify-between rounded-lg px-4 py-3 transition-colors">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="text-muted-foreground size-4 transition-transform duration-200 [[data-state=open]_&]:rotate-90" />
                    <Folder className="text-muted-foreground size-4" />
                    <span className="font-medium">{brandName}</span>
                    <Badge variant="secondary" className="text-xs">
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
