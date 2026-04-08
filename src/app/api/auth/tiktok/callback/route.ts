import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const authCode = searchParams.get('auth_code') ?? searchParams.get('code')

  if (!authCode) {
    return NextResponse.json({ error: 'auth_code가 없습니다.' }, { status: 400 })
  }

  const clientId = process.env.TIKTOK_CLIENT_ID
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'TIKTOK_CLIENT_ID, TIKTOK_CLIENT_SECRET 환경변수를 설정해주세요.' },
      { status: 500 },
    )
  }

  // 현재 로그인한 어드민 확인
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // auth_code → access_token 교환
  const res = await fetch(`${TIKTOK_API_BASE}/oauth2/access_token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: clientId,
      secret: clientSecret,
      auth_code: authCode,
    }),
  })

  const json = await res.json()

  if (json.code !== 0 || !json.data?.access_token) {
    console.error('[tiktok/callback] 토큰 교환 실패:', json)
    return NextResponse.json(
      { error: `TikTok 토큰 교환 실패: ${json.message ?? '알 수 없는 오류'}` },
      { status: 400 },
    )
  }

  // DB에 access_token 저장
  const { error } = await supabase
    .from('admin_platform_tokens')
    .upsert(
      {
        user_id: user.id,
        platform: 'tiktok',
        access_token: json.data.access_token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' },
    )

  if (error) {
    console.error('[tiktok/callback] DB 저장 실패:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 성공 → 관리자 토큰 설정 페이지로 리다이렉트
  return NextResponse.redirect(new URL('/dashboard/admin?tab=tokens', req.url))
}
