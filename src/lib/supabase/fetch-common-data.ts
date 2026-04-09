import { cache } from 'react'
import type { AmazonAccount, Brand, MetaAccount, ShopeeAccount, TiktokAccount } from '@/types/database'
import { createClient } from './server'

export type CommonDashboardData = {
  role: 'admin' | 'viewer'
  initialBrandId: string
  brands: Brand[]
  metaAccounts: (MetaAccount & { brands: { name: string } | null })[]
  tiktokAccounts: (TiktokAccount & { brands: { name: string } | null })[]
  shopeeAccounts: (ShopeeAccount & { brands: { name: string } | null })[]
  amazonAccounts: (AmazonAccount & { brands: { name: string } | null })[]
}

// React cache()로 감싸서 동일 요청 내 중복 DB 호출 방지
export const getCachedCommonData = cache(
  async (userId: string, role: string, brandId: string | null): Promise<CommonDashboardData> => {
    const supabase = await createClient()

    let brands: Brand[] = []
    let metaAccounts: (MetaAccount & { brands: { name: string } | null })[] = []
    let tiktokAccounts: (TiktokAccount & { brands: { name: string } | null })[] = []
    let shopeeAccounts: (ShopeeAccount & { brands: { name: string } | null })[] = []
    let amazonAccounts: (AmazonAccount & { brands: { name: string } | null })[] = []

    if (role === 'admin') {
      const ownerFilter = `owner_user_id.eq.${userId},owner_user_id.is.null`

      const [brandsRes, metaRes, tiktokRes] = await Promise.all([
        supabase.from('brands').select('*').or(ownerFilter).order('name'),
        supabase
          .from('meta_accounts')
          .select('*, brands(name)')
          .eq('is_active', true)
          .or(ownerFilter),
        supabase
          .from('tiktok_accounts')
          .select('*, brands(name)')
          .eq('is_active', true)
          .or(ownerFilter),
      ])

      brands = (brandsRes.data ?? []) as Brand[]

      const myBrandIds = brands.map((b) => b.id)
      const [shopeeRes, amazonRes] = await Promise.all([
        myBrandIds.length > 0
          ? supabase
              .from('shopee_accounts')
              .select('*, brands(name)')
              .eq('is_active', true)
              .in('brand_id', myBrandIds)
          : Promise.resolve({ data: [] }),
        myBrandIds.length > 0
          ? supabase
              .from('amazon_accounts')
              .select('*, brands(name)')
              .eq('is_active', true)
              .in('brand_id', myBrandIds)
          : Promise.resolve({ data: [] }),
      ])

      metaAccounts = (metaRes.data ?? []) as (MetaAccount & { brands: { name: string } | null })[]
      tiktokAccounts = (tiktokRes.data ?? []) as (TiktokAccount & {
        brands: { name: string } | null
      })[]
      shopeeAccounts = (shopeeRes.data ?? []) as (ShopeeAccount & {
        brands: { name: string } | null
      })[]
      amazonAccounts = (amazonRes.data ?? []) as (AmazonAccount & {
        brands: { name: string } | null
      })[]
    } else {
      const [brandsRes, metaRes, tiktokRes, shopeeRes, amazonRes] = await Promise.all([
        supabase.from('brands').select('*').order('name'),
        supabase.from('meta_accounts').select('*, brands(name)').eq('is_active', true),
        supabase.from('tiktok_accounts').select('*, brands(name)').eq('is_active', true),
        supabase.from('shopee_accounts').select('*, brands(name)').eq('is_active', true),
        supabase.from('amazon_accounts').select('*, brands(name)').eq('is_active', true),
      ])

      brands = (brandsRes.data ?? []) as Brand[]
      metaAccounts = (metaRes.data ?? []) as (MetaAccount & { brands: { name: string } | null })[]
      tiktokAccounts = (tiktokRes.data ?? []) as (TiktokAccount & {
        brands: { name: string } | null
      })[]
      shopeeAccounts = (shopeeRes.data ?? []) as (ShopeeAccount & {
        brands: { name: string } | null
      })[]
      amazonAccounts = (amazonRes.data ?? []) as (AmazonAccount & {
        brands: { name: string } | null
      })[]
    }

    return {
      role: role as 'admin' | 'viewer',
      initialBrandId: brandId ?? '',
      brands,
      metaAccounts,
      tiktokAccounts,
      shopeeAccounts,
      amazonAccounts,
    }
  },
)
