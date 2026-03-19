import { DailyShell } from '@/components/dashboard/daily/daily-shell'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/auth-cache'
import { createClient } from '@/lib/supabase/server'
import type { Brand, MetaAccount, TiktokAccount } from '@/types/database'
import { redirect } from 'next/navigation'

export default async function DailyPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  // 프로필과 계정 데이터를 병렬 조회 (프로필은 cache에서 즉시 반환)
  const [profile, [{ data: brands }, { data: metaAccounts }, { data: tiktokAccounts }]] =
    await Promise.all([
      getCachedProfile(user.id),
      (async () => {
        const supabase = await createClient()
        return Promise.all([
          supabase.from('brands').select('*').order('name'),
          supabase.from('meta_accounts').select('*, brands(name)').eq('is_active', true),
          supabase.from('tiktok_accounts').select('*, brands(name)').eq('is_active', true),
        ])
      })(),
    ])

  const role = profile?.role ?? 'viewer'
  const brandId = profile?.brand_id ?? null

  // 초기 브랜드 결정: viewer는 자신의 brand_id, admin은 전체('all')
  const initialBrandId =
    role === 'viewer' && brandId ? brandId : 'all'

  return (
    <DailyShell
      role={role as 'admin' | 'viewer'}
      initialBrandId={initialBrandId}
      brands={(brands ?? []) as Brand[]}
      metaAccounts={
        (metaAccounts ?? []) as (MetaAccount & {
          brands: { name: string } | null
        })[]
      }
      tiktokAccounts={
        (tiktokAccounts ?? []) as (TiktokAccount & {
          brands: { name: string } | null
        })[]
      }
    />
  )
}
