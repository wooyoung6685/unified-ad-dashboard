'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  TableIcon,
  Trash2,
  Plus,
  Minus,
  Palette,
  Highlighter,
  RemoveFormatting,
  Combine,
  Scissors,
} from 'lucide-react'

export interface InsightMemoEditorHandle {
  getHTML: () => string
  reset: (content: string) => void
}

interface Props {
  content: string
  editable: boolean
  reportId?: string
}

// 이미지 업로드 함수
async function uploadImage(reportId: string, file: File): Promise<string | null> {
  if (file.size > 512 * 1024) {
    alert('이미지 크기는 512KB 이하만 업로드 가능합니다.')
    return null
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await fetch(`/api/reports/${reportId}/images`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()

    if (!res.ok) {
      alert(data.error ?? '이미지 업로드에 실패했습니다.')
      return null
    }

    return data.url ?? null
  } catch {
    alert('이미지 업로드 중 오류가 발생했습니다.')
    return null
  }
}

// ── 툴바 컴포넌트 ──
function Toolbar({
  editor,
  reportId,
}: {
  editor: ReturnType<typeof useEditor> | null
  reportId?: string
}) {
  const [showTableInput, setShowTableInput] = useState(false)
  const [tableRows, setTableRows] = useState('3')
  const [tableCols, setTableCols] = useState('3')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  // 선택 변경 시 툴바 리렌더링 (병합/분리 버튼 갱신용)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!editor) return
    const handler = () => setTick((t) => t + 1)
    editor.on('selectionUpdate', handler)
    return () => { editor.off('selectionUpdate', handler) }
  }, [editor])

  if (!editor) return null

  const btnClass = (active?: boolean) =>
    `rounded p-1.5 hover:bg-accent ${active ? 'bg-accent text-foreground' : 'text-muted-foreground'}`

  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp,image/gif'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file || !reportId) return
      const url = await uploadImage(reportId, file)
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    }
    input.click()
  }

  const handleInsertTable = () => {
    const rows = Math.max(1, Math.min(20, parseInt(tableRows) || 3))
    const cols = Math.max(1, Math.min(10, parseInt(tableCols) || 3))
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setShowTableInput(false)
    setTableRows('3')
    setTableCols('3')
  }

  const colors = [
    '#000000', '#e03131', '#2f9e44', '#1971c2', '#f08c00',
    '#6741d9', '#868e96', '#ffffff',
  ]

  const highlightColors = [
    '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99',
    '#d0bfff', '#e8e8e8', null,
  ]

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1">
      {/* 헤딩 */}
      <button type="button" className={btnClass(editor.isActive('heading', { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="제목 1">
        <Heading1 className="h-4 w-4" />
      </button>
      <button type="button" className={btnClass(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="제목 2">
        <Heading2 className="h-4 w-4" />
      </button>
      <button type="button" className={btnClass(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="제목 3">
        <Heading3 className="h-4 w-4" />
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* 서식 */}
      <button type="button" className={btnClass(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게">
        <Bold className="h-4 w-4" />
      </button>
      <button type="button" className={btnClass(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임">
        <Italic className="h-4 w-4" />
      </button>
      <button type="button" className={btnClass(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄">
        <UnderlineIcon className="h-4 w-4" />
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* 글자색 */}
      <div className="relative">
        <button type="button" className={btnClass(showColorPicker)} onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false) }} title="글자 색상">
          <Palette className="h-4 w-4" />
        </button>
        {showColorPicker && (
          <div className="absolute top-full left-0 z-50 mt-1 flex gap-1 rounded border border-border bg-background p-2 shadow-md">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className="h-5 w-5 rounded border border-border"
                style={{ backgroundColor: c }}
                onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 배경색 */}
      <div className="relative">
        <button type="button" className={btnClass(showHighlightPicker)} onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false) }} title="배경 색상">
          <Highlighter className="h-4 w-4" />
        </button>
        {showHighlightPicker && (
          <div className="absolute top-full left-0 z-50 mt-1 flex gap-1 rounded border border-border bg-background p-2 shadow-md">
            {highlightColors.map((c, i) => (
              <button
                key={i}
                type="button"
                className="h-5 w-5 rounded border border-border"
                style={{ backgroundColor: c ?? 'transparent' }}
                onClick={() => {
                  if (c) editor.chain().focus().toggleHighlight({ color: c }).run()
                  else editor.chain().focus().unsetHighlight().run()
                  setShowHighlightPicker(false)
                }}
                title={c ? c : '배경색 제거'}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* 목록 */}
      <button type="button" className={btnClass(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="글머리 기호">
        <List className="h-4 w-4" />
      </button>
      <button type="button" className={btnClass(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="번호 목록">
        <ListOrdered className="h-4 w-4" />
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* 정렬 */}
      <button type="button" className={btnClass(editor.isActive({ textAlign: 'left' }))} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="왼쪽 정렬">
        <AlignLeft className="h-4 w-4" />
      </button>
      <button type="button" className={btnClass(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="가운데 정렬">
        <AlignCenter className="h-4 w-4" />
      </button>
      <button type="button" className={btnClass(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="오른쪽 정렬">
        <AlignRight className="h-4 w-4" />
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* 이미지 */}
      <button type="button" className={btnClass()} onClick={handleImageUpload} title="이미지 삽입 (512KB 이하)">
        <ImageIcon className="h-4 w-4" />
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* 표 */}
      <div className="relative">
        {!showTableInput ? (
          <button type="button" className={btnClass()} onClick={() => setShowTableInput(true)} title="표 삽입">
            <TableIcon className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">행</span>
            <input type="number" min={1} max={20} value={tableRows} onChange={(e) => setTableRows(e.target.value)} className="w-10 rounded border border-border bg-background px-1 py-0.5 text-xs" />
            <span className="text-xs text-muted-foreground">열</span>
            <input type="number" min={1} max={10} value={tableCols} onChange={(e) => setTableCols(e.target.value)} className="w-10 rounded border border-border bg-background px-1 py-0.5 text-xs" />
            <button type="button" onClick={handleInsertTable} className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">확인</button>
            <button type="button" onClick={() => setShowTableInput(false)} className="rounded border border-border px-1.5 py-0.5 text-xs">취소</button>
          </div>
        )}
      </div>

      {/* 표 컨트롤 - 커서가 표 안에 있을 때 */}
      {editor.isActive('table') && (
        <>
          <div className="mx-1 h-5 w-px bg-border" />
          <button type="button" className={btnClass()} onClick={() => editor.chain().focus().addColumnAfter().run()} title="열 추가">
            <Plus className="h-3.5 w-3.5" /><span className="text-[10px]">열</span>
          </button>
          <button type="button" className={btnClass()} onClick={() => editor.chain().focus().addRowAfter().run()} title="행 추가">
            <Plus className="h-3.5 w-3.5" /><span className="text-[10px]">행</span>
          </button>
          <button type="button" className={btnClass()} onClick={() => editor.chain().focus().deleteColumn().run()} title="열 삭제">
            <Minus className="h-3.5 w-3.5" /><span className="text-[10px]">열</span>
          </button>
          <button type="button" className={btnClass()} onClick={() => editor.chain().focus().deleteRow().run()} title="행 삭제">
            <Minus className="h-3.5 w-3.5" /><span className="text-[10px]">행</span>
          </button>
          <button type="button" className={btnClass()} onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제">
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </button>
        </>
      )}

      {/* 셀 병합/분리 - 여러 셀 선택 시 isActive('table')이 false가 되므로 별도 조건 */}
      {editor.can().mergeCells() && (
        <>
          <div className="mx-1 h-5 w-px bg-border" />
          <button type="button" className={btnClass()} onClick={() => editor.chain().focus().mergeCells().run()} title="셀 병합">
            <Combine className="h-3.5 w-3.5" />
            <span className="text-[10px]">병합</span>
          </button>
        </>
      )}
      {editor.can().splitCell() && (
        <>
          <div className="mx-1 h-5 w-px bg-border" />
          <button type="button" className={btnClass()} onClick={() => editor.chain().focus().splitCell().run()} title="셀 분리">
            <Scissors className="h-3.5 w-3.5" />
            <span className="text-[10px]">분리</span>
          </button>
        </>
      )}

      <div className="mx-1 h-5 w-px bg-border" />

      {/* 서식 초기화 */}
      <button type="button" className={btnClass()} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="서식 초기화">
        <RemoveFormatting className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── 메인 에디터 ──
export const InsightMemoEditor = forwardRef<InsightMemoEditorHandle, Props>(
  function InsightMemoEditor({ content, editable, reportId }, ref) {
    const contentRef = useRef(content || '')

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Image.configure({
          inline: true,
          allowBase64: false,
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableCell,
        TableHeader,
        Placeholder.configure({
          placeholder: '인사이트와 메모를 입력하세요...',
        }),
      ],
      content: content || '',
      editable: true,
      onUpdate: ({ editor: e }) => {
        contentRef.current = e.getHTML()
      },
    })

    useImperativeHandle(ref, () => ({
      getHTML: () => contentRef.current,
      reset: (c: string) => {
        contentRef.current = c || ''
        if (editor) {
          editor.commands.setContent(c || '')
        }
      },
    }))

    // 읽기 전용 + 내용 없음
    if (!editable && !content) {
      return (
        <div className="rounded-md border">
          <p className="min-h-30 px-4 py-3 text-sm text-muted-foreground">
            내용을 입력하려면 [수정하기] 버튼을 누르세요.
          </p>
        </div>
      )
    }

    // 읽기 전용 + 내용 있음
    if (!editable) {
      return (
        <div className="insight-memo-readonly rounded-md border">
          <div
            className="tiptap-content min-h-30 px-4 py-3"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )
    }

    return (
      <div className="insight-memo-tiptap overflow-hidden rounded-md border border-border">
        <Toolbar editor={editor} reportId={reportId} />
        <EditorContent editor={editor} className="tiptap-content min-h-30 px-4 py-3" />
      </div>
    )
  },
)
