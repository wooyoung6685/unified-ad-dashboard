'use client'

import { useEffect, useRef, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Account = {
  id: string
  brand_name: string
  account_id: string
}

type LogEntry = {
  date: string
  platform: 'meta' | 'tiktok'
  accountId: string
  status: 'success' | 'failed'
  error?: string
}

type Summary = {
  totalDays: number
  successCount: number
  failCount: number
}

export function BackfillManager() {
  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [platform, setPlatform] = useState<'all' | 'meta' | 'tiktok'>('all')
  const [accountId, setAccountId] = useState('all')
  const [metaAccounts, setMetaAccounts] = useState<Account[]>([])
  const [tiktokAccounts, setTiktokAccounts] = useState<Account[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [progress, setProgress] = useState({ total: 0, current: 0 })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 계정 목록 초기 로드
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/accounts/meta').then((r) => r.json()),
      fetch('/api/admin/accounts/tiktok').then((r) => r.json()),
    ]).then(([metaRes, tiktokRes]) => {
      setMetaAccounts(metaRes.accounts ?? [])
      setTiktokAccounts(tiktokRes.accounts ?? [])
    })
  }, [])

  // 로그 추가 시 자동 스크롤
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // 날짜 범위 초과 여부
  const dayDiff =
    startDate && endDate
      ? differenceInDays(parseISO(endDate), parseISO(startDate))
      : 0
  const isRangeInvalid = dayDiff < 0 || dayDiff > 30

  // 현재 플랫폼에 따른 계정 목록
  const accountOptions: Account[] =
    platform === 'meta'
      ? metaAccounts
      : platform === 'tiktok'
        ? tiktokAccounts
        : [...metaAccounts, ...tiktokAccounts]

  async function handleStart() {
    setStatus('loading')
    setLogs([])
    setSummary(null)
    setProgress({ total: 0, current: 0 })

    try {
      const res = await fetch('/api/admin/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, accountId, startDate, endDate }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? '오류가 발생했습니다.')
        setStatus('idle')
        return
      }

      // SSE 스트림 파싱
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

            if (event.type === 'complete') {
              setSummary({
                totalDays: event.totalDays,
                successCount: event.successCount,
                failCount: event.failCount,
              })
              setStatus('done')
            } else {
              setProgress({ total: event.total, current: event.current })
              setLogs((prev) => [
                ...prev,
                {
                  date: event.date,
                  platform: event.platform,
                  accountId: event.accountId,
                  status: event.status,
                  error: event.error,
                },
              ])
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.')
      setStatus('idle')
    }
  }

  const percent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* 설정 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>과거 데이터 수집 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 날짜 범위 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">시작일</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={status === 'loading'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">종료일</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={status === 'loading'}
              />
            </div>
          </div>

          {/* 날짜 범위 경고 */}
          {isRangeInvalid && (
            <Alert variant="destructive">
              <AlertDescription>
                {dayDiff < 0
                  ? '시작일은 종료일보다 이전이어야 합니다.'
                  : '날짜 범위는 최대 30일입니다.'}
              </AlertDescription>
            </Alert>
          )}

          {/* 플랫폼 + 계정 선택 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">플랫폼</label>
              <Select
                value={platform}
                onValueChange={(v) => {
                  setPlatform(v as 'all' | 'meta' | 'tiktok')
                  setAccountId('all')
                }}
                disabled={status === 'loading'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="meta">Meta</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">계정</label>
              <Select
                value={accountId}
                onValueChange={setAccountId}
                disabled={status === 'loading'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 계정</SelectItem>
                  {accountOptions.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.brand_name} ({acc.account_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleStart}
            disabled={status === 'loading' || isRangeInvalid}
            className="w-full"
          >
            {status === 'loading' ? '수집 중...' : '수집 시작'}
          </Button>
        </CardContent>
      </Card>

      {/* 진행상황 */}
      {(status === 'loading' || status === 'done') && progress.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>진행상황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {progress.current} / {progress.total}
              </span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* 완료 요약 */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>수집 완료</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{summary.totalDays}</p>
                <p className="text-sm text-muted-foreground">수집 날짜 수</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {summary.successCount}
                </p>
                <p className="text-sm text-muted-foreground">성공</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {summary.failCount}
                </p>
                <p className="text-sm text-muted-foreground">실패</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 로그 */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>수집 로그</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 space-y-1 overflow-y-auto font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className={
                      log.status === 'success'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {log.status === 'success' ? '✓' : '✗'}
                  </span>
                  <span className="text-muted-foreground">{log.date}</span>
                  <span className="font-medium">{log.platform}</span>
                  <span className="truncate text-muted-foreground">
                    {log.accountId}
                  </span>
                  {log.error && (
                    <span className="truncate text-red-500">{log.error}</span>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
