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
}

export function InsightMemoCard({
  reportId,
  initialContent,
  role,
  label = '인사이트 & 메모',
  fieldKey = 'insight_memo',
}: Props) {
  const [savedContent, setSavedContent] = useState(initialContent ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<InsightMemoEditorHandle>(null)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    editorRef.current?.reset(savedContent)
    setIsEditing(false)
  }

  const handleSave = async () => {
    const html = editorRef.current?.getHTML() ?? ''
    // 빈 에디터 콘텐츠 처리 (<p></p> 등)
    const isEmpty = html === '<p></p>' || html === ''
    const memoValue = isEmpty ? null : html

    setIsSaving(true)
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldKey]: memoValue }),
      })
      if (res.ok) {
        setSavedContent(memoValue ?? '')
        setIsEditing(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1">
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
        <InsightMemoEditor ref={editorRef} content={savedContent} editable={isEditing} />
      </CardContent>
    </Card>
  )
}
