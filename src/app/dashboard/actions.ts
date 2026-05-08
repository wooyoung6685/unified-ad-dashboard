'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })
  redirect('/login')
}

type ChangePasswordState = { error?: string; success?: boolean } | undefined

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다. 다시 로그인해주세요.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'viewer') {
    return { error: '이 기능은 viewer 계정에서만 사용할 수 있습니다.' }
  }

  const newPassword = ((formData.get('newPassword') as string | null) ?? '').trim()
  const confirmPassword = ((formData.get('confirmPassword') as string | null) ?? '').trim()

  if (!newPassword || !confirmPassword) return { error: '새 비밀번호와 확인을 모두 입력해주세요.' }
  if (newPassword.length < 8) return { error: '비밀번호는 8자 이상이어야 합니다.' }
  if (newPassword !== confirmPassword) return { error: '두 비밀번호가 일치하지 않습니다.' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('same') || msg.includes('different from the old')) {
      return { error: '기존 비밀번호와 동일합니다. 다른 비밀번호를 입력해주세요.' }
    }
    if (msg.includes('weak') || msg.includes('password should')) {
      return { error: '비밀번호 강도가 부족합니다. 다른 조합을 시도해주세요.' }
    }
    return { error: '비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
  }

  return { success: true }
}
