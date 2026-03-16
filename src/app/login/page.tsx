'use client'
import { useActionState } from 'react'
import { login } from './actions'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type State = { error: string } | undefined

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    login as (state: State, formData: FormData) => Promise<State>,
    undefined,
  )

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="flex flex-col gap-4">
            <Input
              type="email"
              name="email"
              placeholder="이메일"
              required
              autoComplete="email"
            />
            <Input
              type="password"
              name="password"
              placeholder="비밀번호"
              required
              autoComplete="current-password"
            />
            {state?.error && (
              <p className="text-destructive text-sm">{state.error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? '로그인 중…' : '로그인'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
