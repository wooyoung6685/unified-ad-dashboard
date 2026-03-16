'use client'

import { AccountManager } from '@/components/admin/AccountManager'
import type { Brand } from '@/types/database'

interface AccountsTabProps {
  brands: Brand[]
}

export function AccountsTab({ brands }: AccountsTabProps) {
  return <AccountManager brands={brands} />
}
