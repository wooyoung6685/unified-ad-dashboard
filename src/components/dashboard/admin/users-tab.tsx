'use client'

import { UserManager } from '@/components/admin/UserManager'
import { Button } from '@/components/ui/button'
import type { Brand } from '@/types/database'
import { UserPlus } from 'lucide-react'
import { useRef } from 'react'

export function UsersTab({ brands }: { brands: Brand[] }) {
  const openAddRef = useRef<(() => void) | null>(null)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">유저 관리</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            대시보드 접근 유저를 추가하고 권한을 관리합니다.
          </p>
        </div>
        <Button onClick={() => openAddRef.current?.()}>
          <UserPlus className="mr-1.5 size-4" />
          유저 추가
        </Button>
      </div>
      <UserManager brands={brands} openAddRef={openAddRef} />
    </div>
  )
}
