'use client'

import { Skeleton } from '@/components/ui/skeleton'
import type { DailyStatRow } from '@/types/database'
import dynamic from 'next/dynamic'

// SSR 방지 (Recharts는 window 의존)
const RechartsChart = dynamic(() => import('./recharts-chart'), { ssr: false })

interface SpendRevenueChartProps {
  data: DailyStatRow[]
  isLoading: boolean
}

export function SpendRevenueChart({ data, isLoading }: SpendRevenueChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />
  }

  return <RechartsChart data={data} />
}
