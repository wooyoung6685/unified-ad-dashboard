'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { changePassword } from '@/app/dashboard/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'

type State = { error?: string; success?: boolean } | undefined

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState<State, FormData>(
    changePassword as (state: State, formData: FormData) => Promise<State>,
    undefined,
  )

  useEffect(() => {
    if (state?.success) {
      toast.success('비밀번호가 변경되었습니다.')
      setOpen(false)
      formRef.current?.reset()
    }
  }, [state])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) formRef.current?.reset()
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
        >
          <KeyRound className="size-4" />
          비밀번호 변경
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
          <DialogDescription>새 비밀번호를 입력해주세요. 8자 이상이어야 합니다.</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">새 비밀번호</Label>
            <PasswordInput
              id="new-password"
              name="newPassword"
              required
              autoComplete="new-password"
              placeholder="8자 이상"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              required
              autoComplete="new-password"
              placeholder="다시 한 번 입력"
            />
          </div>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>변경 중...</span>
                </>
              ) : (
                '변경'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
