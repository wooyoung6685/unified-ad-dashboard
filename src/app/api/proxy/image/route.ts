import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('url 파라미터 없음', { status: 400 })

  // Facebook CDN 및 TikTok CDN 허용 (보안)
  // tiktokcdn.com: 기본 CDN / tiktokcdn-us.com: 미국 CDN (poster_url에서 사용)
  const allowed = ['fbcdn.net', 'cdninstagram.com', 'ibyteimg.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokcdn-eu.com']
  const isAllowed = allowed.some((domain) => url.includes(domain))
  if (!isAllowed) return new NextResponse('허용되지 않은 도메인', { status: 403 })

  try {
    const res = await fetch(url, {
      headers: {
        // 서버에서 직접 요청 (Referer 없이)
        'User-Agent': 'Mozilla/5.0',
      },
    })
    if (!res.ok) return new NextResponse('이미지 로드 실패', { status: res.status })

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24시간 캐시
      },
    })
  } catch {
    return new NextResponse('서버 오류', { status: 500 })
  }
}
