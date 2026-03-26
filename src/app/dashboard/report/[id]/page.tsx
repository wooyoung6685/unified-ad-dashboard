import { ReportDetail } from '@/components/dashboard/report/report-detail'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/auth-cache'
import { createClient } from '@/lib/supabase/server'
import type { Report } from '@/types/database'
import { notFound, redirect } from 'next/navigation'

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const [profile, { data: reportRow }] = await Promise.all([
    getCachedProfile(user.id),
    (async () => {
      const supabase = await createClient()
      return supabase
        .from('reports')
        .select('*, brands(name)')
        .eq('id', id)
        .single()
    })(),
  ])

  if (!reportRow) notFound()

  const report: Report & { brand_name: string } = {
    ...reportRow,
    brands: undefined,
    brand_name: (reportRow.brands as { name: string } | null)?.name ?? '',
  }

  // 작성자 이메일 조회 (admin 클라이언트)
  let creatorEmail = report.created_by ?? ''
  if (report.created_by) {
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(report.created_by)
    if (authData?.user?.email) {
      creatorEmail = authData.user.email
    }
  }

  return (
    <ReportDetail
      report={report}
      role={(profile?.role ?? 'viewer') as 'admin' | 'viewer'}
      creatorEmail={creatorEmail}
    />
  )
}
