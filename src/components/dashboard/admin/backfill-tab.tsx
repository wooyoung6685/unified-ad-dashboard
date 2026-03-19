'use client'

import { BackfillManager } from '@/components/admin/BackfillManager'

export function BackfillTab() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">과거 데이터 수집</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          특정 기간의 광고 데이터를 수동으로 수집합니다.
        </p>
      </div>
      <BackfillManager />
    </div>
  )
}
