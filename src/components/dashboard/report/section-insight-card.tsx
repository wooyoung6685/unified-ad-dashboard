'use client'

import { BookOpen, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { SectionInsightEntry } from '@/types/database'
import { InsightMemoEditor, type InsightMemoEditorHandle } from './insight-memo-editor'

interface Props {
  reportId: string
  sectionKey: string
  initialEntry: SectionInsightEntry | undefined
  defaultLabel: string
  role: 'admin' | 'viewer'
  /**
   * 섹션 본체. 함수 형태로 넘기면 섹션 헤더 flex row에 꽂을 `+ 인사이트 추가` 버튼 노드를
   * render prop으로 전달받아 섹션이 자기 헤더 slot에 직접 끼워넣을 수 있다 (권장).
   * ReactNode를 직접 넘기면 버튼이 절대 위치로 섹션 우상단에 오버레이된다 (단순 섹션용).
   */
  children: ReactNode | ((addButton: ReactNode | null) => ReactNode)
}

export function SectionInsightCard({
  reportId,
  sectionKey,
  initialEntry,
  defaultLabel,
  role,
  children,
}: Props) {
  const [savedContent, setSavedContent] = useState(initialEntry?.content ?? '')
  const [savedTitle, setSavedTitle] = useState(initialEntry?.title ?? '')
  const [editingTitle, setEditingTitle] = useState(initialEntry?.title ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const editorRef = useRef<InsightMemoEditorHandle>(null)

  const isAdmin = role === 'admin'
  const hasContent = savedContent.length > 0
  const displayTitle = savedTitle || defaultLabel
  // 인사이트 카드(편집 UI/read-only) 표시 여부
  const showInsightCard = isEditing || hasContent
  // admin이고 비어있을 때 섹션 우상단에 "+ 추가" 버튼만 노출
  const showAddOverlay = isAdmin && !hasContent && !isEditing

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
    const isEmpty = html === '<p></p>' || html === ''
    const contentValue = isEmpty ? null : html
    const titleValue = editingTitle.trim() || null

    setIsSaving(true)
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_insight_patch: {
            key: sectionKey,
            title: titleValue,
            content: contentValue,
          },
        }),
      })
      if (res.ok) {
        setSavedContent(contentValue ?? '')
        setSavedTitle(titleValue ?? '')
        setIsEditing(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('이 섹션의 인사이트를 삭제하시겠습니까?')) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_insight_patch: { key: sectionKey, title: null, content: null },
        }),
      })
      if (res.ok) {
        setSavedContent('')
        setSavedTitle('')
        setEditingTitle('')
        setIsEditing(false)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingTitle('')
    setIsEditing(true)
  }

  const addButton: ReactNode | null = showAddOverlay ? (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs shadow-sm"
      onClick={handleOpenAdd}
    >
      <Plus className="h-3.5 w-3.5" />
      인사이트 추가
    </Button>
  ) : null

  const isRenderProp = typeof children === 'function'

  return (
    <>
      {/* 섹션 자체. render prop이면 섹션이 헤더 slot에 버튼을 직접 꽂고, 아니면 우상단 오버레이 */}
      {isRenderProp ? (
        (children as (addButton: ReactNode | null) => ReactNode)(addButton)
      ) : (
        <div className="relative">
          {children}
          {addButton && (
            <div className="absolute right-4 top-4 z-10">{addButton}</div>
          )}
        </div>
      )}

      {/* 인사이트 카드 (편집 모드 또는 저장된 내용 존재 시) */}
      {showInsightCard && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
              <BookOpen className="h-4 w-4 shrink-0 text-primary" />
              {isEditing ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  placeholder={defaultLabel}
                  className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                />
              ) : (
                <span>{displayTitle}</span>
              )}
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-1">
              {isAdmin && !isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="h-7 gap-1 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    수정하기
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    삭제
                  </Button>
                </>
              )}
              {isAdmin && isEditing && (
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
            {isEditing ? (
              <InsightMemoEditor
                ref={editorRef}
                content={savedContent}
                editable={true}
                reportId={reportId}
              />
            ) : (
              <div className="insight-memo-readonly rounded-md border">
                <div
                  className="tiptap-content min-h-30 px-4 py-3"
                  dangerouslySetInnerHTML={{ __html: savedContent }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
