'use client'
import { Suspense, useActionState, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BarChart3, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { login } from './actions'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

type State = { error: string } | undefined

function LoginForm() {
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') ?? ''

  const [state, formAction, isPending] = useActionState<State, FormData>(
    login as (state: State, formData: FormData) => Promise<State>,
    undefined
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const canSubmit = email.trim().length > 0 && password.length > 0

  // 에러 발생 시 sonner toast로 표시 — 폼 레이아웃에 영향 없음
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <div className="bg-muted/30 relative flex min-h-screen items-center justify-center px-4">
      {/* 배경 dot 패턴 — 텍스처로 깊이감 부여, 과도하지 않게 opacity 최소화 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* 콘텐츠: 카드 진입 애니메이션 */}
      <div className="animate-in fade-in slide-in-from-bottom-4 relative w-full max-w-95 space-y-8 duration-500">
        {/* 브랜드 마크 */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl shadow-sm">
            <BarChart3 className="size-6" aria-hidden="true" />
          </div>
          <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Ad Dashboard
          </span>
        </div>

        {/* 로그인 카드 */}
        <Card className="border-border/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              <h1>로그인</h1>
            </CardTitle>
            <CardDescription>관리자 계정으로 로그인하세요</CardDescription>
          </CardHeader>

          {/*
            noValidate: 브라우저 기본 말풍선 대신 커스텀 에러 UI를 사용하기 위해 설정
            required 속성은 유지하여 JavaScript 비활성 환경에서의 기본 검증은 보존
          */}
          <form action={formAction} noValidate>
            <CardContent className="flex flex-col gap-4">
              {/* 로그인 성공 후 이동할 경로 — 미들웨어가 설정한 returnUrl 유지 */}
              <input type="hidden" name="returnUrl" value={returnUrl} />

              {/* 이메일 필드 */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="h-10"
                  aria-invalid={state?.error ? true : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* 비밀번호 필드 */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">비밀번호</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-10"
                  aria-invalid={state?.error ? true : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* 제출 버튼 */}
              <Button
                type="submit"
                size="lg"
                className="mt-2 w-full"
                disabled={isPending || !canSubmit}
                aria-busy={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    <span>로그인 중...</span>
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
