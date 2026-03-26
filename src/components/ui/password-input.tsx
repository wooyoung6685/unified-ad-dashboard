'use client'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Input의 props에서 type을 제외 — 항상 내부에서 'password' | 'text'로 제어
interface PasswordInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  id: string // 토글 버튼의 aria-controls 연결을 위해 필수
}

export function PasswordInput({
  id,
  className,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        // 토글 버튼 공간(우측 pr-10)을 확보하여 텍스트가 버튼에 가리지 않도록
        className={cn('pr-10', className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
        // 스크린 리더: 현재 토글 상태와 어떤 필드를 제어하는지 명시
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
        aria-controls={id}
        aria-pressed={visible}
        // 탭 순서 유지 — 입력 필드 다음 자연스럽게 포커스 이동
        tabIndex={0}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}
