'use client'

import dynamic from 'next/dynamic'
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

export interface InsightMemoEditorHandle {
  getHTML: () => string
  reset: (content: string) => void
}

interface Props {
  content: string
  editable: boolean
}

// 툴바 설정
const MODULES_EDITABLE = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['clean'],
  ],
}

const MODULES_READONLY = {
  toolbar: false,
}

export const InsightMemoEditor = forwardRef<InsightMemoEditorHandle, Props>(
  function InsightMemoEditor({ content, editable }, ref) {
    const [value, setValue] = useState(content || '')
    const valueRef = useRef(value)

    const handleChange = useCallback((html: string) => {
      setValue(html)
      valueRef.current = html
    }, [])

    useImperativeHandle(ref, () => ({
      getHTML: () => valueRef.current,
      reset: (c: string) => {
        setValue(c || '')
        valueRef.current = c || ''
      },
    }))

    // 읽기 전용 + 내용 없음
    if (!editable && !content) {
      return (
        <div className="rounded-md border">
          <p className="min-h-[120px] px-4 py-3 text-sm text-muted-foreground">
            내용을 입력하려면 [수정하기] 버튼을 누르세요.
          </p>
        </div>
      )
    }

    // 읽기 전용 + 내용 있음
    if (!editable) {
      return (
        <div className="ql-snow rounded-md border">
          <div
            className="ql-editor min-h-[120px]"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )
    }

    return (
      <div className="insight-memo-quill">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={handleChange}
          modules={editable ? MODULES_EDITABLE : MODULES_READONLY}
          readOnly={!editable}
          placeholder="인사이트와 메모를 입력하세요..."
        />
      </div>
    )
  },
)
