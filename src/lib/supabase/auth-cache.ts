import { createClient } from './server'
import { cache } from 'react'

// 요청 내 auth.getUser() 중복 제거 (React cache로 메모이제이션)
export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

// 요청 내 users 프로필 중복 제거 (React cache로 메모이제이션)
export const getCachedProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('role, brand_id')
    .eq('id', userId)
    .single()
  return data
})
