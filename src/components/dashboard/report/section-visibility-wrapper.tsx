'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import type { ReportFilters } from '@/types/database'

interface Props {
  reportId: string
  sectionKey: string
  label: string
  role: 'admin' | 'viewer'
  hiddenSections: string[]
  currentFilters: ReportFilters | null
  children: ReactNode
}

export function SectionVisibilityWrapper({
  reportId,
  sectionKey,
  label,
  role,
  hiddenSections,
  currentFilters,
  children,
}: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [isHidden, setIsHidden] = useState(hiddenSections.includes(sectionKey))
  const isAdmin = role === 'admin'

  // 서버에서 내려온 최신 hiddenSections와 동기화 (다른 곳에서 변경되었을 때 반영)
  useEffect(() => {
    setIsHidden(hiddenSections.includes(sectionKey))
  }, [hiddenSections, sectionKey])

  if (isHidden && !isAdmin) return null

  const toggleVisibility = async (checked: boolean) => {
    const prev = isHidden
    const nextHidden = !checked
    setIsHidden(nextHidden) // 낙관적 업데이트
    const next = nextHidden
      ? [...hiddenSections.filter((k) => k !== sectionKey), sectionKey]
      : hiddenSections.filter((k) => k !== sectionKey)

    setIsPending(true)
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: { ...(currentFilters ?? {}), hiddenSections: next },
        }),
      })
      if (!res.ok) {
        setIsHidden(prev) // 실패 시 롤백
        return
      }
      router.refresh()
    } catch {
      setIsHidden(prev)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-2">
      {isAdmin && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isHidden ? '숨김' : '표시'}
            </span>
            <Switch
              checked={!isHidden}
              onCheckedChange={toggleVisibility}
              disabled={isPending}
              aria-label={`${label} 섹션 표시 토글`}
            />
          </div>
        </div>
      )}
      {!isHidden && children}
    </div>
  )
}
