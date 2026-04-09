import { ReportShell } from '@/components/dashboard/report/report-shell'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/auth-cache'
import { createClient } from '@/lib/supabase/server'
import type { Brand, ReportListItem } from '@/types/database'
import { redirect } from 'next/navigation'

export default async function ReportPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const profile = await getCachedProfile(user.id)
  const role = profile?.role ?? 'viewer'

  const supabase = await createClient()

  let brandsData: Brand[] = []
  let initialReports: ReportListItem[] = []

  if (role === 'admin') {
    // admin: 자기 소유 브랜드만 조회 후 해당 브랜드의 리포트만 표시
    const { data: brands } = await supabase
      .from('brands')
      .select('*')
      .or(`owner_user_id.eq.${user.id},owner_user_id.is.null`)
      .order('name')

    brandsData = (brands ?? []) as Brand[]

    const myBrandIds = brandsData.map((b) => b.id)
    if (myBrandIds.length > 0) {
      const { data: reportsData } = await supabase
        .from('reports')
        .select(
          'id, brand_id, title, platform, country, internal_account_id, year, month, status, insight_memo, insight_memo_gmv_max, filters, created_by, created_at, updated_at, brands(name)',
        )
        .in('brand_id', myBrandIds)
        .order('created_at', { ascending: false })

      initialReports = (reportsData ?? []).map((row) => ({
        ...row,
        brands: undefined,
        brand_name: (row.brands as unknown as { name: string } | null)?.name ?? '',
      }))
    }
  } else {
    // viewer: RLS가 자동으로 자기 brand_id 기준으로 필터링
    const [{ data: brands }, { data: reportsData }] = await Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase
        .from('reports')
        .select(
          'id, brand_id, title, platform, country, internal_account_id, year, month, status, insight_memo, insight_memo_gmv_max, filters, created_by, created_at, updated_at, brands(name)',
        )
        .order('created_at', { ascending: false }),
    ])

    brandsData = (brands ?? []) as Brand[]
    initialReports = (reportsData ?? []).map((row) => ({
      ...row,
      brands: undefined,
      brand_name: (row.brands as unknown as { name: string } | null)?.name ?? '',
    }))
  }

  return (
    <ReportShell
      initialReports={initialReports}
      role={role as 'admin' | 'viewer'}
      brands={brandsData}
    />
  )
}
