'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Report } from '@/types/database'
import { ArrowLeft, Check, Download, Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { InsightMemoCard } from './insight-memo-card'
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
  const [isSavingImage, setIsSavingImage] = useState(false)
  const handleSaveImage = async () => {
    setIsSavingImage(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const el = document.getElementById('report-content')
      if (!el) return
      const canvas = await html2canvas(el, { useCORS: true, scale: 2 })
      const link = document.createElement('a')
      link.download = `${title}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setIsSavingImage(false)
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

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveImage}
            disabled={isSavingImage}
          >
            <Download className="mr-1 h-4 w-4" />
            {isSavingImage ? '저장 중...' : '이미지 저장'}
          </Button>
          {role === 'admin' && !isEditing && (
            <>
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
            </>
          )}
          {role === 'admin' && isEditing && (
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
          )}
        </div>
      </div>

      {/* 본문 */}
      <div id="report-content" className="flex flex-col gap-6 bg-background">
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
          />
        ) : snapshot.platform === 'tiktok' ? (
          <TiktokReportDetail
            data={snapshot.data}
            title={title}
            reportId={report.id}
            role={role}
            insightMemo={report.insight_memo}
            insightMemoGmvMax={report.insight_memo_gmv_max}
            insightMemoTitle={report.insight_memo_title}
            insightMemoGmvMaxTitle={report.insight_memo_gmv_max_title}
            filters={report.filters}
          />
        ) : snapshot.platform === 'shopee_inapp' ? (
          <ShopeeReportDetail data={snapshot.data} title={title} />
        ) : snapshot.platform === 'amazon' ? (
          <AmazonReportDetail data={snapshot.data} title={title} />
        ) : snapshot.platform === 'qoo10' ? (
          <Qoo10ReportDetail data={snapshot.data} title={title} />
        ) : null}
      </div>

      {/* 인사이트 & 메모 - TikTok은 각 탭 내부에 포함, 나머지 플랫폼만 여기서 렌더링 */}
      {snapshot?.platform !== 'tiktok' && (
        <InsightMemoCard
          reportId={report.id}
          initialContent={report.insight_memo}
          initialTitle={report.insight_memo_title}
          titleFieldKey="insight_memo_title"
          role={role}
        />
      )}
    </div>
  )
}
