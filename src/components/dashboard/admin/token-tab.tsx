import { TokenManager } from '@/components/admin/TokenManager'
import type { AdminPlatformToken } from '@/types/database'

interface TokenTabProps {
  settings: AdminPlatformToken[]
}

export function TokenTab({ settings }: TokenTabProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">토큰 관리</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Meta, TikTok API 액세스 토큰을 관리합니다.
        </p>
      </div>
      <TokenManager settings={settings} />
    </div>
  )
}
