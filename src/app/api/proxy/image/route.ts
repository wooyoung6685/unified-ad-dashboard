import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('url 파라미터 없음', { status: 400 })

  // URL 파싱 및 hostname 기반 도메인 검증 (SSRF 방지)
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('유효하지 않은 URL', { status: 400 })
  }

  if (parsed.protocol !== 'https:')
    return new NextResponse('HTTPS만 허용됩니다.', { status: 403 })

  // Facebook CDN 및 TikTok CDN 허용 (보안)
  // tiktokcdn.com: 기본 CDN / tiktokcdn-us.com: 미국 CDN (poster_url에서 사용)
  const allowedDomains = [
    'fbcdn.net',
    'cdninstagram.com',
    'ibyteimg.com',
    'tiktokcdn.com',
    'tiktokcdn-us.com',
    'tiktokcdn-eu.com',
  ]
  const isAllowed = allowedDomains.some(
    (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
  )
  if (!isAllowed) return new NextResponse('허용되지 않은 도메인', { status: 403 })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8_000)

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error(`[proxy/image] CDN 응답 실패 status=${res.status} url=${url}`)
      return new NextResponse('이미지 로드 실패', { status: res.status })
    }

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24시간 캐시
      },
    })
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error(`[proxy/image] ${isAbort ? '타임아웃' : '서버 오류'} url=${url}`, err)
    return new NextResponse(isAbort ? '이미지 로드 타임아웃' : '서버 오류', { status: 500 })
  } finally {
    clearTimeout(timer)
  }
}
