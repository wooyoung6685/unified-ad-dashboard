import { DailyShell } from '@/components/dashboard/daily/daily-shell'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/auth-cache'
import { createClient } from '@/lib/supabase/server'
import type { Brand, MetaAccount, ShopeeAccount, TiktokAccount } from '@/types/database'
import { redirect } from 'next/navigation'

export default async function DailyPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const profile = await getCachedProfile(user.id)
  const role = profile?.role ?? 'viewer'
  const brandId = profile?.brand_id ?? null

  const supabase = await createClient()

  let brands: Brand[] = []
  let metaAccounts: (MetaAccount & { brands: { name: string } | null })[] = []
  let tiktokAccounts: (TiktokAccount & { brands: { name: string } | null })[] = []
  let shopeeAccounts: (ShopeeAccount & { brands: { name: string } | null })[] = []

  if (role === 'admin') {
    // admin: 자기 소유 브랜드 + 미배정 브랜드만 조회
    const ownerFilter = `owner_user_id.eq.${user.id},owner_user_id.is.null`

    const [brandsRes, metaRes, tiktokRes] = await Promise.all([
      supabase.from('brands').select('*').or(ownerFilter).order('name'),
      supabase.from('meta_accounts').select('*, brands(name)').eq('is_active', true).or(ownerFilter),
      supabase.from('tiktok_accounts').select('*, brands(name)').eq('is_active', true).or(ownerFilter),
    ])

    brands = (brandsRes.data ?? []) as Brand[]

    // shopee_accounts는 owner_user_id 없음 → 소유 브랜드 ID로 필터링
    const myBrandIds = brands.map((b) => b.id)
    const shopeeRes = myBrandIds.length > 0
      ? await supabase
          .from('shopee_accounts')
          .select('*, brands(name)')
          .eq('is_active', true)
          .in('brand_id', myBrandIds)
      : { data: [] }

    metaAccounts = (metaRes.data ?? []) as (MetaAccount & { brands: { name: string } | null })[]
    tiktokAccounts = (tiktokRes.data ?? []) as (TiktokAccount & { brands: { name: string } | null })[]
    shopeeAccounts = (shopeeRes.data ?? []) as (ShopeeAccount & { brands: { name: string } | null })[]
  } else {
    // viewer: RLS가 자동으로 자기 brand_id 기준으로 필터링
    const [brandsRes, metaRes, tiktokRes, shopeeRes] = await Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('meta_accounts').select('*, brands(name)').eq('is_active', true),
      supabase.from('tiktok_accounts').select('*, brands(name)').eq('is_active', true),
      supabase.from('shopee_accounts').select('*, brands(name)').eq('is_active', true),
    ])

    brands = (brandsRes.data ?? []) as Brand[]
    metaAccounts = (metaRes.data ?? []) as (MetaAccount & { brands: { name: string } | null })[]
    tiktokAccounts = (tiktokRes.data ?? []) as (TiktokAccount & { brands: { name: string } | null })[]
    shopeeAccounts = (shopeeRes.data ?? []) as (ShopeeAccount & { brands: { name: string } | null })[]
  }

  // 초기 브랜드: viewer는 자신의 brand_id, admin은 미선택('')
  const initialBrandId = brandId ?? ''

  return (
    <DailyShell
      role={role as 'admin' | 'viewer'}
      initialBrandId={initialBrandId}
      brands={brands}
      metaAccounts={metaAccounts}
      tiktokAccounts={tiktokAccounts}
      shopeeAccounts={shopeeAccounts}
    />
  )
}
