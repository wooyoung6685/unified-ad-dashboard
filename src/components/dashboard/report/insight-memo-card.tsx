'use client'

import { BookOpen, Check, Pencil, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { InsightMemoEditor, type InsightMemoEditorHandle } from './insight-memo-editor'

interface Props {
  reportId: string
  initialContent: string | null
  role: 'admin' | 'viewer'
  label?: string
  fieldKey?: 'insight_memo' | 'insight_memo_gmv_max'
  initialTitle?: string | null
  titleFieldKey?: 'insight_memo_title' | 'insight_memo_gmv_max_title'
}

export function InsightMemoCard({
  reportId,
  initialContent,
  role,
  label = '인사이트 & 메모',
  fieldKey = 'insight_memo',
  initialTitle,
  titleFieldKey,
}: Props) {
  const [savedContent, setSavedContent] = useState(initialContent ?? '')
  const [savedTitle, setSavedTitle] = useState(initialTitle ?? '')
  const [editingTitle, setEditingTitle] = useState(initialTitle ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<InsightMemoEditorHandle>(null)

  // 실제 표시 제목: DB에 저장된 제목이 있으면 사용, 없으면 기본 label
  const displayTitle = savedTitle || label

  const handleEdit = () => {
    setEditingTitle(savedTitle)
    setIsEditing(true)
  }

  const handleCancel = () => {
    editorRef.current?.reset(savedContent)
    setEditingTitle(savedTitle)
    setIsEditing(false)
  }

  const handleSave = async () => {
    const html = editorRef.current?.getHTML() ?? ''
    // 빈 에디터 콘텐츠 처리 (<p></p> 등)
    const isEmpty = html === '<p></p>' || html === ''
    const memoValue = isEmpty ? null : html
    const titleValue = editingTitle.trim() || null

    setIsSaving(true)
    try {
      const body: Record<string, string | null> = { [fieldKey]: memoValue }
      if (titleFieldKey) {
        body[titleFieldKey] = titleValue
      }

      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSavedContent(memoValue ?? '')
        setSavedTitle(titleValue ?? '')
        setIsEditing(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
          <BookOpen className="h-4 w-4 shrink-0 text-primary" />
          {isEditing && titleFieldKey ? (
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              placeholder={label}
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <span>{displayTitle}</span>
          )}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {role === 'admin' && !isEditing && (
            <Button variant="ghost" size="sm" onClick={handleEdit} className="h-7 gap-1 text-xs">
              <Pencil className="h-3.5 w-3.5" />
              수정하기
            </Button>
          )}
          {role === 'admin' && isEditing && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleSave}
                disabled={isSaving}
                title="저장"
              >
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleCancel}
                title="취소"
              >
                <X className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <InsightMemoEditor
          ref={editorRef}
          content={savedContent}
          editable={isEditing}
          reportId={reportId}
        />
      </CardContent>
    </Card>
  )
}
