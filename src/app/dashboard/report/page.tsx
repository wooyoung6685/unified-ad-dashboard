import { ReportShell } from '@/components/dashboard/report/report-shell'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/auth-cache'
import { createClient } from '@/lib/supabase/server'
import type { Brand, ReportListItem } from '@/types/database'
import { redirect } from 'next/navigation'

export default async function ReportPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const [profile, { data: brandsData }, { data: reportsData }] = await Promise.all([
    getCachedProfile(user.id),
    (async () => {
      const supabase = await createClient()
      return supabase.from('brands').select('*').order('name')
    })(),
    (async () => {
      const supabase = await createClient()
      return supabase
        .from('reports')
        .select(
          'id, brand_id, title, platform, country, internal_account_id, year, month, status, created_by, created_at, updated_at, brands(name)',
        )
        .order('created_at', { ascending: false })
    })(),
  ])

  const role = profile?.role ?? 'viewer'

  const initialReports: ReportListItem[] = (reportsData ?? []).map((row) => ({
    ...row,
    brands: undefined,
    brand_name: (row.brands as unknown as { name: string } | null)?.name ?? '',
  }))

  return (
    <ReportShell
      initialReports={initialReports}
      role={role as 'admin' | 'viewer'}
      brands={(brandsData ?? []) as Brand[]}
    />
  )
}
