import { cache } from 'react'
import type { AmazonAccount, Brand, MetaAccount, Qoo10Account, ShopeeAccount, TiktokAccount } from '@/types/database'
import { createClient } from './server'

export type CommonDashboardData = {
  role: 'admin' | 'viewer'
  initialBrandId: string
  brandIds: string[]
  brands: Brand[]
  metaAccounts: (MetaAccount & { brands: { name: string } | null })[]
  tiktokAccounts: (TiktokAccount & { brands: { name: string } | null })[]
  shopeeAccounts: (ShopeeAccount & { brands: { name: string } | null })[]
  amazonAccounts: (AmazonAccount & { brands: { name: string } | null })[]
  qoo10Accounts: (Qoo10Account & { brands: { name: string } | null })[]
}

// 빈 배열일 때 0행을 반환하기 위한 sentinel UUID
const SENTINEL_UUID = '00000000-0000-0000-0000-000000000000'

// React cache()로 감싸서 동일 요청 내 중복 DB 호출 방지
export const getCachedCommonData = cache(
  async (userId: string, role: string, brandIds: string[]): Promise<CommonDashboardData> => {
    const supabase = await createClient()

    let brands: Brand[] = []
    let metaAccounts: (MetaAccount & { brands: { name: string } | null })[] = []
    let tiktokAccounts: (TiktokAccount & { brands: { name: string } | null })[] = []
    let shopeeAccounts: (ShopeeAccount & { brands: { name: string } | null })[] = []
    let amazonAccounts: (AmazonAccount & { brands: { name: string } | null })[] = []
    let qoo10Accounts: (Qoo10Account & { brands: { name: string } | null })[] = []

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
      const [shopeeRes, amazonRes, qoo10Res] = await Promise.all([
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
        myBrandIds.length > 0
          ? supabase
              .from('qoo10_accounts')
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
      qoo10Accounts = (qoo10Res.data ?? []) as (Qoo10Account & {
        brands: { name: string } | null
      })[]
    } else {
      // viewer: 본인 매핑 브랜드만 명시적 필터 적용 (RLS와 이중 방어)
      const inFilter = brandIds.length > 0 ? brandIds : [SENTINEL_UUID]

      const [brandsRes, metaRes, tiktokRes, shopeeRes, amazonRes, qoo10Res] = await Promise.all([
        supabase.from('brands').select('*').in('id', inFilter).order('name'),
        supabase
          .from('meta_accounts')
          .select('*, brands(name)')
          .eq('is_active', true)
          .in('brand_id', inFilter),
        supabase
          .from('tiktok_accounts')
          .select('*, brands(name)')
          .eq('is_active', true)
          .in('brand_id', inFilter),
        supabase
          .from('shopee_accounts')
          .select('*, brands(name)')
          .eq('is_active', true)
          .in('brand_id', inFilter),
        supabase
          .from('amazon_accounts')
          .select('*, brands(name)')
          .eq('is_active', true)
          .in('brand_id', inFilter),
        supabase
          .from('qoo10_accounts')
          .select('*, brands(name)')
          .eq('is_active', true)
          .in('brand_id', inFilter),
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
      qoo10Accounts = (qoo10Res.data ?? []) as (Qoo10Account & {
        brands: { name: string } | null
      })[]
    }

    return {
      role: role as 'admin' | 'viewer',
      initialBrandId: brandIds[0] ?? '',
      brandIds,
      brands,
      metaAccounts,
      tiktokAccounts,
      shopeeAccounts,
      amazonAccounts,
      qoo10Accounts,
    }
  },
)
