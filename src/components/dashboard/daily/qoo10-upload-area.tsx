'use client'

import { Button } from '@/components/ui/button'
import { Loader2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

interface Qoo10UploadAreaProps {
  qoo10AccountId: string
  accountType: 'ads' | 'organic'
  fileType?: 'visitor' | 'transaction'  // organic일 때 파일 종류 구분
  onUploadSuccess: () => void
}

export function Qoo10UploadArea({
  qoo10AccountId,
  accountType,
  fileType,
  onUploadSuccess,
}: Qoo10UploadAreaProps) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const hint =
    accountType === 'ads'
      ? '새 광고 성과 보고서 (XLSX) 파일을 업로드하세요'
      : fileType === 'visitor'
        ? 'Qoo10_CVR (유입자수) XLSX 파일을 업로드하세요'
        : 'Qoo10_Transaction_DateGoods (거래 데이터) XLSX 파일을 업로드하세요'

  function handleFileSelect(selected: File | null) {
    if (!selected) return
    setFile(selected)
    setStatus('idle')
    setMessage('')
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0] ?? null
    handleFileSelect(dropped)
  }

  async function handleUpload() {
    if (!file) return
    setStatus('uploading')
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('qoo10_account_id', qoo10AccountId)
    formData.append('account_type', accountType)
    if (accountType === 'organic' && fileType) {
      formData.append('file_type', fileType)
    }

    try {
      const res = await fetch('/api/dashboard/daily/qoo10-upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        setStatus('error')
        setMessage(json.error ?? '업로드에 실패했습니다.')
        return
      }

      setStatus('success')
      setMessage(`업로드 완료 (${json.inserted}건 처리)`)
      setFile(null)
      onUploadSuccess()
    } catch {
      setStatus('error')
      setMessage('네트워크 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-3">
      {/* 드래그앤드롭 영역 */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        <UploadCloud className="text-muted-foreground size-8" />
        {file ? (
          <p className="text-sm font-medium">{file.name}</p>
        ) : (
          <p className="text-muted-foreground text-sm">
            파일을 드래그하거나 클릭하여 선택하세요
          </p>
        )}
        <p className="text-muted-foreground text-xs">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* 업로드 버튼 및 상태 메시지 */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          size="sm"
          className="h-8"
        >
          {status === 'uploading' ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              업로드 중...
            </>
          ) : (
            '업로드'
          )}
        </Button>
        {message && (
          <p
            className={`text-sm ${
              status === 'success' ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
