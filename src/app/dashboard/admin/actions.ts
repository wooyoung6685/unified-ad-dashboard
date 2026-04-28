'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 어드민별 플랫폼 토큰 저장 (upsert)
export async function updateAccessToken(formData: FormData) {
  const supabase = await createClient()
  const platform = formData.get('platform') as string
  const access_token = formData.get('access_token') as string

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase.from('admin_platform_tokens').upsert(
    {
      user_id: user.id,
      platform,
      access_token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform' },
  )

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// MetaAccount 활성화 토글
export async function toggleMetaAccount(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('meta_accounts')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// TiktokAccount 활성화 토글
export async function toggleTiktokAccount(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tiktok_accounts')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// ShopeeAccount 활성화 토글
export async function toggleShopeeAccount(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('shopee_accounts')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// AmazonAccount 활성화 토글
export async function toggleAmazonAccount(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('amazon_accounts')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// Qoo10Account 활성화 토글
export async function toggleQoo10Account(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qoo10_accounts')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// Brand 생성
export async function createBrand(formData: FormData) {
  const supabase = await createClient()
  const name = (formData.get('name') as string)?.trim()
  const manager = (formData.get('manager') as string) || null

  if (!name) return { error: '브랜드 이름을 입력하세요.' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { data: dup } = await supabase
    .from('brands')
    .select('id')
    .eq('owner_user_id', user.id)
    .ilike('name', name)
    .maybeSingle()
  if (dup) return { error: '이미 동일한 이름의 브랜드가 존재합니다.' }

  // slug는 자동 생성 (timestamp base36)
  const slug = Date.now().toString(36)

  const { data, error } = await supabase
    .from('brands')
    .insert({ name, slug, manager, owner_user_id: user.id })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true, brand: data }
}

// Brand 수정
export async function updateBrand(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const name = (formData.get('name') as string)?.trim()
  const manager = (formData.get('manager') as string) || null

  if (!name) return { error: '브랜드 이름을 입력하세요.' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { data: dup } = await supabase
    .from('brands')
    .select('id')
    .eq('owner_user_id', user.id)
    .ilike('name', name)
    .neq('id', id)
    .maybeSingle()
  if (dup) return { error: '이미 동일한 이름의 브랜드가 존재합니다.' }

  const { error } = await supabase
    .from('brands')
    .update({ name, manager })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// Brand 삭제
export async function deleteBrand(id: string) {
  const supabase = await createClient()

  // 연결된 사용자 확인 (user_brands 기준)
  const { count: userCount } = await supabase
    .from('user_brands')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', id)

  if (userCount && userCount > 0) {
    return {
      error: `해당 브랜드에 연결된 사용자가 ${userCount}명 있어 삭제할 수 없습니다. 먼저 사용자의 브랜드 배정을 변경해주세요.`,
    }
  }

  // 연결된 광고 계정 확인 (병렬 조회)
  const [
    { count: metaCount },
    { count: tiktokCount },
    { count: shopeeCount },
    { count: amazonCount },
    { count: qoo10Count },
  ] = await Promise.all([
    supabase.from('meta_accounts').select('*', { count: 'exact', head: true }).eq('brand_id', id),
    supabase
      .from('tiktok_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', id),
    supabase
      .from('shopee_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', id),
    supabase
      .from('amazon_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', id),
    supabase
      .from('qoo10_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', id),
  ])

  const totalAccounts =
    (metaCount || 0) +
    (tiktokCount || 0) +
    (shopeeCount || 0) +
    (amazonCount || 0) +
    (qoo10Count || 0)
  if (totalAccounts > 0) {
    return {
      error: `해당 브랜드에 연결된 광고 계정이 ${totalAccounts}개 있어 삭제할 수 없습니다. 먼저 광고 계정을 삭제해주세요.`,
    }
  }

  const { error } = await supabase.from('brands').delete().eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}
