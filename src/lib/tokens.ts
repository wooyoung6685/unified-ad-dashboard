import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * 현재 로그인한 어드민의 플랫폼 토큰을 조회합니다.
 * 어드민별 토큰이 없으면 global_settings로 폴백합니다.
 */
export async function getTokenForCurrentUser(
  platform: 'meta' | 'tiktok',
): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data } = await supabase
      .from('admin_platform_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .single()

    if (data?.access_token) return data.access_token
  }

  // 폴백: global_settings (레거시 호환)
  const { data: global } = await supabaseAdmin
    .from('global_settings')
    .select('access_token')
    .eq('platform', platform)
    .single()

  return global?.access_token ?? null
}

/**
 * 배치 작업용: 특정 user_id의 토큰을 조회합니다 (세션 불필요).
 * user_id가 없거나 토큰이 없으면 global_settings로 폴백합니다.
 */
export async function getTokenForUser(
  platform: 'meta' | 'tiktok',
  userId?: string | null,
): Promise<string | null> {
  if (userId) {
    const { data } = await supabaseAdmin
      .from('admin_platform_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single()

    if (data?.access_token) return data.access_token
  }

  // 폴백: global_settings
  const { data: global } = await supabaseAdmin
    .from('global_settings')
    .select('access_token')
    .eq('platform', platform)
    .single()

  return global?.access_token ?? null
}

/**
 * 배치/cron 작업용: 모든 어드민의 플랫폼 토큰을 조회합니다.
 */
export async function getAllAdminTokens(
  platform: 'meta' | 'tiktok',
): Promise<Array<{ user_id: string; access_token: string }>> {
  const { data } = await supabaseAdmin
    .from('admin_platform_tokens')
    .select('user_id, access_token')
    .eq('platform', platform)
    .not('access_token', 'is', null)

  return (data ?? []).filter((t) => t.access_token) as Array<{
    user_id: string
    access_token: string
  }>
}
