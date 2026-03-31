'use client'

import { createContext, useContext } from 'react'
import type { CommonDashboardData } from '@/lib/supabase/fetch-common-data'

const DashboardDataContext = createContext<CommonDashboardData | null>(null)

export function DashboardDataProvider({
  children,
  data,
}: {
  children: React.ReactNode
  data: CommonDashboardData
}) {
  return <DashboardDataContext.Provider value={data}>{children}</DashboardDataContext.Provider>
}

export function useDashboardData(): CommonDashboardData {
  const ctx = useContext(DashboardDataContext)
  if (!ctx) throw new Error('useDashboardData must be used within DashboardDataProvider')
  return ctx
}
