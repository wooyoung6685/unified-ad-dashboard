'use client'

import { AccountManager } from '@/components/admin/AccountManager'
import type { Brand } from '@/types/database'

interface AccountsTabProps {
  brands: Brand[]
}

export function AccountsTab({ brands }: AccountsTabProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">광고계정 관리</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          브랜드별로 운영 국가와 광고 계정 ID를 설정하세요.
        </p>
      </div>
      <AccountManager brands={brands} />
    </div>
  )
}
