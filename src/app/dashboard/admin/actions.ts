'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// GlobalSetting access_token만 업데이트 (app_id, secret 보존)
export async function updateAccessToken(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const access_token = formData.get('access_token') as string

  const { error } = await supabase
    .from('global_settings')
    .update({ access_token, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// GlobalSetting 업데이트 (토큰 관리)
export async function updateGlobalSetting(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const access_token = formData.get('access_token') as string
  const app_id = formData.get('app_id') as string | null
  const secret = formData.get('secret') as string | null

  const { error } = await supabase
    .from('global_settings')
    .update({ access_token, app_id, secret, updated_at: new Date().toISOString() })
    .eq('id', id)

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

// Brand 생성
export async function createBrand(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const manager = (formData.get('manager') as string) || null
  // slug는 자동 생성 (timestamp base36)
  const slug = Date.now().toString(36)

  const { data, error } = await supabase
    .from('brands')
    .insert({ name, slug, manager })
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
  const name = formData.get('name') as string
  const manager = (formData.get('manager') as string) || null

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

  const { error } = await supabase.from('brands').delete().eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}
