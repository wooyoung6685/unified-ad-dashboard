import { TokenManager } from '@/components/admin/TokenManager'
import type { GlobalSetting } from '@/types/database'

interface TokenTabProps {
  settings: GlobalSetting[]
}

export function TokenTab({ settings }: TokenTabProps) {
  return <TokenManager settings={settings} />
}
