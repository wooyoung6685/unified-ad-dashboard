'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { parseFileNameFromContentDisposition } from '@/lib/pdf/fileName'
import type { Report } from '@/types/database'
import { ArrowLeft, Check, Download, Loader2, Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { AmazonReportDetail } from './amazon-report-detail'
import { MetaReportDetail } from './meta-report-detail'
import { Qoo10ReportDetail } from './qoo10-report-detail'
import { ShopeeReportDetail } from './shopee-report-detail'
import { TiktokReportDetail } from './tiktok-report-detail'

interface Props {
  report: Report & { brand_name: string }
  role: 'admin' | 'viewer'
  creatorEmail: string
  printMode?: boolean
}

export function ReportDetail({ report, role, creatorEmail, printMode = false }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(report.title)
  const [editTitle, setEditTitle] = useState(report.title)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // print 모드에서 차트/폰트 렌더 완료 후 puppeteer 대기 해제 신호
  useEffect(() => {
    if (!printMode) return
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.documentElement.setAttribute('data-print-ready', '1')
      }),
    )
    return () => cancelAnimationFrame(id)
  }, [printMode])

  const handleDownloadPdf = async () => {
    setIsDownloading(true)
    const toastId = toast.loading('PDF를 생성 중입니다...')
    try {
      const res = await fetch(`/api/reports/${report.id}/pdf`)
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') ?? ''
      const fileName = parseFileNameFromContentDisposition(cd) ?? `${report.title}.pdf`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF 다운로드 완료', { id: toastId })
    } catch {
      toast.error('PDF 생성에 실패했습니다.', { id: toastId })
    } finally {
      setIsDownloading(false)
    }
  }
  const handleEditSave = async () => {
    if (!editTitle.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      })
      if (res.ok) {
        setTitle(editTitle.trim())
        setIsEditing(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditCancel = () => {
    setEditTitle(title)
    setIsEditing(false)
  }

  const snapshot = report.snapshot
  // print 모드에서는 admin UI 전체를 viewer 수준으로 낮춤
  const effectiveRole: 'admin' | 'viewer' = printMode ? 'viewer' : role

  // 제목 Card 우상단에 오버레이될 수정 UI (admin 전용, print 모드 제외)
  const titleAction: ReactNode | undefined =
    effectiveRole === 'admin'
      ? !isEditing
        ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditTitle(title)
              setIsEditing(true)
            }}
          >
            <Pencil className="mr-1 h-4 w-4" />
            수정하기
          </Button>
        )
        : (
          <div className="flex items-center gap-2">
            <Input
              className="h-8 w-64 text-sm"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSave()
                if (e.key === 'Escape') handleEditCancel()
              }}
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleEditSave}
              disabled={isSaving}
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleEditCancel}
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        )
      : undefined

  return (
    <div className={`flex flex-col gap-6 ${printMode ? 'p-0' : 'p-6'}`}>
      {/* 헤더 (print 모드에서 숨김) */}
      {!printMode && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold">리포트 상세</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              PDF 다운로드
            </Button>
          </div>
          <p className="ml-10 text-sm text-muted-foreground">
            작성자: {creatorEmail} | 기간: {report.year}년{' '}
            {String(report.month).padStart(2, '0')}월
          </p>
        </div>
      )}

      {/* 본문 */}
      <div
        className="flex flex-col gap-6 bg-background"
        style={printMode ? { width: 1180, marginLeft: 'auto', marginRight: 'auto' } : undefined}
      >
        {!snapshot ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              데이터 생성 중이거나 실패했습니다.
            </CardContent>
          </Card>
        ) : snapshot.platform === 'meta' ? (
          <MetaReportDetail
            data={snapshot.data}
            title={title}
            role={effectiveRole}
            reportId={report.id}
            filters={report.filters}
            sectionInsights={report.section_insights ?? {}}
            titleAction={titleAction}
            printMode={printMode}
          />
        ) : snapshot.platform === 'tiktok' ? (
          <TiktokReportDetail
            data={snapshot.data}
            title={title}
            reportId={report.id}
            role={effectiveRole}
            sectionInsights={report.section_insights ?? {}}
            filters={report.filters}
            titleAction={titleAction}
            printMode={printMode}
          />
        ) : snapshot.platform === 'shopee_inapp' ? (
          <ShopeeReportDetail
            data={snapshot.data}
            title={title}
            reportId={report.id}
            initialPromotionRows={report.promotion_rows ?? []}
            role={effectiveRole}
            sectionInsights={report.section_insights ?? {}}
            titleAction={titleAction}
            printMode={printMode}
          />
        ) : snapshot.platform === 'amazon' ? (
          <AmazonReportDetail
            data={snapshot.data}
            title={title}
            reportId={report.id}
            role={effectiveRole}
            sectionInsights={report.section_insights ?? {}}
            titleAction={titleAction}
            printMode={printMode}
          />
        ) : snapshot.platform === 'qoo10' ? (
          <Qoo10ReportDetail
            data={snapshot.data}
            title={title}
            reportId={report.id}
            role={effectiveRole}
            sectionInsights={report.section_insights ?? {}}
            titleAction={titleAction}
            printMode={printMode}
          />
        ) : null}
      </div>
    </div>
  )
}
