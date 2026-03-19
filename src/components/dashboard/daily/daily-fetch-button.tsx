'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { addDays, format, parseISO } from 'date-fns'
import { useState } from 'react'

interface DailyFetchButtonProps {
  accountId: string
  accountType: 'meta' | 'tiktok'
  startDate: string
  endDate: string
  onComplete: () => void
}

interface Chunk {
  startDate: string
  endDate: string
}

// 날짜 범위를 청크로 분할
function splitChunks(start: string, end: string, size: number): Chunk[] {
  const chunks: Chunk[] = []
  let current = parseISO(start)
  const endDate = parseISO(end)

  while (current <= endDate) {
    const chunkEnd = addDays(current, size - 1)
    chunks.push({
      startDate: format(current, 'yyyy-MM-dd'),
      endDate: format(chunkEnd > endDate ? endDate : chunkEnd, 'yyyy-MM-dd'),
    })
    current = addDays(chunkEnd, 1)
  }

  return chunks
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function DailyFetchButton({
  accountId,
  accountType,
  startDate,
  endDate,
  onComplete,
}: DailyFetchButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 })
  const [dayProgress, setDayProgress] = useState({ current: 0, total: 0 })

  // SSE 스트림 소비
  async function consumeSSEStream(
    chunk: Chunk,
    chunkIndex: number,
    totalChunks: number
  ) {
    const res = await fetch('/api/admin/backfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: accountType,
        accountId,
        startDate: chunk.startDate,
        endDate: chunk.endDate,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? '수집 오류가 발생했습니다.')
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type !== 'complete') {
            setDayProgress({ current: event.current, total: event.total })
          }
          setChunkProgress({ current: chunkIndex + 1, total: totalChunks })
        } catch {
          // JSON 파싱 실패 무시
        }
      }
    }
  }

  async function handleFetch() {
    setStatus('loading')
    setChunkProgress({ current: 0, total: 0 })
    setDayProgress({ current: 0, total: 0 })

    try {
      const chunkSize = accountType === 'meta' ? 28 : 30
      const chunks = splitChunks(startDate, endDate, chunkSize)
      setChunkProgress({ current: 0, total: chunks.length })

      for (let i = 0; i < chunks.length; i++) {
        await consumeSSEStream(chunks[i], i, chunks.length)
        if (i < chunks.length - 1) {
          await delay(500)
        }
      }

      setStatus('done')
      onComplete()
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setStatus('idle')
    }
  }

  // 전체 진행률 계산
  const totalDays =
    chunkProgress.total > 0
      ? chunkProgress.total * (accountType === 'meta' ? 28 : 30)
      : 0
  const completedChunkDays =
    chunkProgress.current > 0
      ? (chunkProgress.current - 1) * (accountType === 'meta' ? 28 : 30)
      : 0
  const currentDays = completedChunkDays + dayProgress.current
  const percent =
    totalDays > 0
      ? Math.min(Math.round((currentDays / totalDays) * 100), 100)
      : 0

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleFetch}
        disabled={status === 'loading' || !accountId}
        variant="outline"
      >
        {status === 'loading' ? '수집 중...' : '가져오기'}
      </Button>

      {status === 'loading' && chunkProgress.total > 0 && (
        <div className="flex items-center gap-2">
          <Progress value={percent} className="h-2 w-32" />
          <p className="text-muted-foreground text-xs tracking-tight whitespace-nowrap">
            {chunkProgress.current.toLocaleString()} /{' '}
            {chunkProgress.total.toLocaleString()} 분석 중
            <span className="ml-1 opacity-70">
              ({dayProgress.current}일차 / {dayProgress.total}일)
            </span>
          </p>
        </div>
      )}

      {status === 'done' && (
        <p className="text-sm whitespace-nowrap text-green-600">
          수집이 완료되었습니다.
        </p>
      )}
    </div>
  )
}
