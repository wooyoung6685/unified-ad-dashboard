'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Report } from '@/types/database'
import { ArrowLeft, Check, Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { AmazonReportDetail } from './amazon-report-detail'
import { MetaReportDetail } from './meta-report-detail'
import { Qoo10ReportDetail } from './qoo10-report-detail'
import { ShopeeReportDetail } from './shopee-report-detail'
import { TiktokReportDetail } from './tiktok-report-detail'

interface Props {
  report: Report & { brand_name: string }
  role: 'admin' | 'viewer'
  creatorEmail: string
}

export function ReportDetail({ report, role, creatorEmail }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(report.title)
  const [editTitle, setEditTitle] = useState(report.title)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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

  // 제목 Card 우상단에 오버레이될 수정 UI (admin 전용)
  const titleAction: ReactNode | undefined =
    role === 'admin'
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
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">리포트 상세</h1>
        </div>
        <p className="ml-10 text-sm text-muted-foreground">
          작성자: {creatorEmail} | 기간: {report.year}년{' '}
          {String(report.month).padStart(2, '0')}월
        </p>
      </div>

      {/* 본문 */}
      <div className="flex flex-col gap-6 bg-background">
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
            role={role}
            reportId={report.id}
            filters={report.filters}
            sectionInsights={report.section_insights ?? {}}
            titleAction={titleAction}
          />
        ) : snapshot.platform === 'tiktok' ? (
          <TiktokReportDetail
            data={snapshot.data}
            title={title}
            reportId={report.id}
            role={role}
            sectionInsights={report.section_insights ?? {}}
            filters={report.filters}
            titleAction={titleAction}
          />
        ) : snapshot.platform === 'shopee_inapp' ? (
          <ShopeeReportDetail
            data={snapshot.data}
            title={title}
            reportId={report.id}
            initialPromotionRows={report.promotion_rows ?? []}
            role={role}
            sectionInsights={report.section_insights ?? {}}
            titleAction={titleAction}
          />
        ) : snapshot.platform === 'amazon' ? (
          <AmazonReportDetail
            data={snapshot.data}
            title={title}
            reportId={report.id}
            role={role}
            sectionInsights={report.section_insights ?? {}}
            titleAction={titleAction}
          />
        ) : snapshot.platform === 'qoo10' ? (
          <Qoo10ReportDetail
            data={snapshot.data}
            title={title}
            reportId={report.id}
            role={role}
            sectionInsights={report.section_insights ?? {}}
            titleAction={titleAction}
          />
        ) : null}
      </div>
    </div>
  )
}
