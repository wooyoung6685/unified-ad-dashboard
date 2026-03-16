'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { KpiSummary } from '@/types/database'

interface KpiCardsProps {
  summary: KpiSummary | undefined
  isLoading: boolean
}

function formatKRW(value: number): string {
  return `₩${new Intl.NumberFormat('ko-KR').format(Math.round(value))}`
}

const KPI_ITEMS = [
  {
    label: '총 지출',
    key: 'totalSpend' as const,
    format: (v: number) => formatKRW(v),
  },
  {
    label: '총 매출',
    key: 'totalRevenue' as const,
    format: (v: number) => formatKRW(v),
  },
  {
    label: 'ROAS',
    key: 'roas' as const,
    format: (v: number) => v.toFixed(2),
  },
  {
    label: '구매수',
    key: 'totalPurchases' as const,
    format: (v: number) => new Intl.NumberFormat('ko-KR').format(Math.round(v)),
  },
]

export function KpiCards({ summary, isLoading }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {KPI_ITEMS.map((item) => (
        <Card key={item.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !summary ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-bold">
                {item.format(summary[item.key])}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
