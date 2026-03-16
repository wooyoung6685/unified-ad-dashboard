'use client'

import { UserManager } from '@/components/admin/UserManager'
import type { Brand } from '@/types/database'

export function UsersTab({ brands }: { brands: Brand[] }) {
  return <UserManager brands={brands} />
}
