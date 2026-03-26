'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Supabase AuthError 메시지 → 사용자 친화적 한국어 메시지 매핑
// 서버 측에서 변환하여 클라이언트에 내부 에러 메시지 노출 방지
function toKoreanError(message: string): string {
  // 잘못된 인증 정보 — 계정 열거 공격 방지를 위해 이메일/비밀번호 구분 없이 통합 안내
  if (
    message.includes('Invalid login credentials') ||
    message.includes('invalid_credentials') ||
    message.includes('Invalid email or password')
  ) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }

  // 이메일 미인증
  if (message.includes('Email not confirmed')) {
    return '이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해주세요.'
  }

  // 요청 횟수 초과
  if (
    message.includes('Too many requests') ||
    message.includes('rate limit') ||
    message.includes('over_email_send_rate_limit')
  ) {
    return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'
  }

  // 존재하지 않는 사용자 — 실제로는 위 invalid_credentials에서 처리되나 방어적으로 추가
  if (message.includes('User not found')) {
    return '등록되지 않은 계정입니다.'
  }

  // 네트워크 / fetch 오류
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('Failed to fetch')
  ) {
    return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.'
  }

  // 그 외 알 수 없는 에러 — 내부 메시지 노출 방지를 위해 일반 메시지 반환
  return '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

export async function login(_prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: toKoreanError(error.message) }

  // 오픈 리다이렉트 방지: 내부 경로(/)로 시작하는 경우만 허용
  const returnUrl = formData.get('returnUrl') as string | null
  const destination = returnUrl?.startsWith('/') ? returnUrl : '/dashboard'
  redirect(destination)
}
