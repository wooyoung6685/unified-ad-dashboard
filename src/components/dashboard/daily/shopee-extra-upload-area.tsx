'use client'

import { Button } from '@/components/ui/button'
import { Loader2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { MonthPicker } from './month-picker'

type Kind = 'sales_overview' | 'voucher' | 'parentskudetail'

interface ShopeeExtraUploadAreaProps {
  shopeeAccountId: string
  kind: Kind
  onUploadSuccess: () => void
}

const ENDPOINT_MAP: Record<Kind, string> = {
  sales_overview: '/api/dashboard/daily/shopee-sales-overview-upload',
  voucher: '/api/dashboard/daily/shopee-voucher-upload',
  parentskudetail: '/api/dashboard/daily/shopee-product-performance-upload',
}

const HINT_MAP: Record<Kind, string> = {
  sales_overview: '파일명이 "sales_overview" 로 시작하는 xlsx 파일을 업로드하세요',
  voucher:
    '파일명이 "voucher" 로 시작하는 xlsx 파일을 업로드하세요. 업로드 대상 월을 선택하세요.',
  parentskudetail:
    '파일명이 "parentskudetail" 로 시작하는 xlsx 파일을 업로드하세요. 업로드 대상 월을 선택하세요. (Top Performing Products 시트만 사용)',
}

const NEEDS_YEAR_MONTH: Record<Kind, boolean> = {
  sales_overview: false,
  voucher: true,
  parentskudetail: true,
}

export function ShopeeExtraUploadArea({
  shopeeAccountId,
  kind,
  onUploadSuccess,
}: ShopeeExtraUploadAreaProps) {
  const [file, setFile] = useState<File | null>(null)
  const [yearMonth, setYearMonth] = useState('')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const needsYearMonth = NEEDS_YEAR_MONTH[kind]
  const isYearMonthValid = !needsYearMonth || /^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)

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
    formData.append('shopee_account_id', shopeeAccountId)
    if (needsYearMonth) {
      formData.append('year_month', yearMonth)
    }

    try {
      const res = await fetch(ENDPOINT_MAP[kind], {
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

      // 환율 미설정 경고 토스트
      if (json.warning) {
        toast.warning(json.warning)
      }
    } catch {
      setStatus('error')
      setMessage('네트워크 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-3">
      {/* 월 선택기 (voucher, parentskudetail 전용) */}
      {needsYearMonth && (
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground text-xs whitespace-nowrap">업로드 대상 월</label>
          <MonthPicker value={yearMonth} onChange={setYearMonth} />
        </div>
      )}

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
        <p className="text-muted-foreground text-center text-xs">{HINT_MAP[kind]}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* 업로드 버튼 및 상태 메시지 */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleUpload}
          disabled={!file || status === 'uploading' || !isYearMonthValid}
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
        {needsYearMonth && !isYearMonthValid && (
          <p className="text-muted-foreground text-xs">업로드 대상 월을 선택하세요</p>
        )}
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
