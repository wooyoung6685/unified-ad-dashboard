'use client'

import {
  updateAccessToken,
  updateGlobalSetting,
} from '@/app/dashboard/admin/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { GlobalSetting } from '@/types/database'
import { useState } from 'react'

interface TokenManagerProps {
  settings: GlobalSetting[]
}

// Meta 전용 폼 — access_token 1개만 업데이트
function MetaTokenForm({ setting }: { setting: GlobalSetting }) {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

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
      <CardHeader>
        <CardTitle className="text-base">Meta 액세스 토큰</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={setting.id} />

          <div className="space-y-1">
            <label className="text-sm font-medium">Access Token</label>
            <Input
              type="password"
              name="access_token"
              defaultValue={setting.access_token ?? ''}
              placeholder="액세스 토큰 입력"
            />
          </div>

          {message && (
            <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}

          <Button type="submit">저장</Button>
        </form>
      </CardContent>
    </Card>
  )
}

// TikTok 전용 폼 — access_token + app_id + secret 3개 일괄 업데이트
function TikTokTokenForm({ setting }: { setting: GlobalSetting }) {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    const result = await updateGlobalSetting(formData)
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
      <CardHeader>
        <CardTitle className="text-base">TikTok 액세스 토큰</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={setting.id} />

          <div className="space-y-1">
            <label className="text-sm font-medium">Access Token</label>
            <Input
              type="password"
              name="access_token"
              defaultValue={setting.access_token ?? ''}
              placeholder="액세스 토큰 입력"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">App ID</label>
            <Input
              type="password"
              name="app_id"
              defaultValue={setting.app_id ?? ''}
              placeholder="App ID 입력"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Secret</label>
            <Input
              type="password"
              name="secret"
              defaultValue={setting.secret ?? ''}
              placeholder="Secret 입력"
            />
          </div>

          {message && (
            <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
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
      <p className="text-muted-foreground text-sm">설정 데이터가 없습니다.</p>
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
