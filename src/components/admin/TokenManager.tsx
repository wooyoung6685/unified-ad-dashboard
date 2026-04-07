'use client'

import { updateAccessToken } from '@/app/dashboard/admin/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AdminPlatformToken } from '@/types/database'
import { useState } from 'react'

interface TokenManagerProps {
  settings: AdminPlatformToken[]
}

function TokenForm({ setting }: { setting: AdminPlatformToken }) {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const isSet = !!setting.access_token

  const platformLabel = setting.platform === 'meta' ? 'Meta' : 'TikTok'

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
        <CardTitle className="text-base">{platformLabel} 액세스 토큰</CardTitle>
        <Badge variant={isSet ? 'default' : 'secondary'}>
          {isSet ? '설정됨' : '미설정'}
        </Badge>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="platform" value={setting.platform} />

          <div className="space-y-1">
            <Label htmlFor={`${setting.platform}-access-token`}>Access Token</Label>
            <Input
              id={`${setting.platform}-access-token`}
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
      {settings.map((s) => (
        <TokenForm key={s.platform} setting={s} />
      ))}
    </div>
  )
}
