'use client'

import { updateAccessToken } from '@/app/dashboard/admin/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GlobalSetting } from '@/types/database'
import { useState } from 'react'

interface TokenManagerProps {
  settings: GlobalSetting[]
}

// Meta 전용 폼 — access_token 1개만 업데이트
function MetaTokenForm({ setting }: { setting: GlobalSetting }) {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const isSet = !!setting.access_token

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    const result = await updateAccessToken(formData)
    if ('error' in result) {
      setIsError(true)
      setMessage(`오류: ${result.error}`)
    } else {
      setIsError(false)
      setMessage('저장되었습니다.')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Meta 액세스 토큰</CardTitle>
        <Badge variant={isSet ? 'default' : 'secondary'}>
          {isSet ? '설정됨' : '미설정'}
        </Badge>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={setting.id} />

          <div className="space-y-1">
            <Label htmlFor="meta-access-token">Access Token</Label>
            <Input
              id="meta-access-token"
              type="password"
              name="access_token"
              defaultValue={setting.access_token ?? ''}
              placeholder="액세스 토큰 입력"
            />
          </div>

          {message && (
            <Alert variant={isError ? 'destructive' : 'default'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button type="submit">저장</Button>
        </form>
      </CardContent>
    </Card>
  )
}

// TikTok 전용 폼 — access_token만 업데이트
function TikTokTokenForm({ setting }: { setting: GlobalSetting }) {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const isSet = !!setting.access_token

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    const result = await updateAccessToken(formData)
    if ('error' in result) {
      setIsError(true)
      setMessage(`오류: ${result.error}`)
    } else {
      setIsError(false)
      setMessage('저장되었습니다.')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">TikTok 액세스 토큰</CardTitle>
        <Badge variant={isSet ? 'default' : 'secondary'}>
          {isSet ? '설정됨' : '미설정'}
        </Badge>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={setting.id} />

          <div className="space-y-1">
            <Label htmlFor="tiktok-access-token">Access Token</Label>
            <Input
              id="tiktok-access-token"
              type="password"
              name="access_token"
              defaultValue={setting.access_token ?? ''}
              placeholder="액세스 토큰 입력"
            />
          </div>

          {message && (
            <Alert variant={isError ? 'destructive' : 'default'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button type="submit">저장</Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function TokenManager({ settings }: TokenManagerProps) {
  if (settings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">설정 데이터가 없습니다.</p>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {settings.map((s) =>
        s.platform === 'meta' ? (
          <MetaTokenForm key={s.id} setting={s} />
        ) : (
          <TikTokTokenForm key={s.id} setting={s} />
        ),
      )}
    </div>
  )
}
