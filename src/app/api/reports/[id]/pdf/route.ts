import { makeFileName } from '@/lib/pdf/fileName'
import { launchBrowser } from '@/lib/pdf/launchBrowser'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // RLS가 브랜드 접근 권한을 자동으로 필터링함
  const [{ data: report }, { data: profile }] = await Promise.all([
    supabase
      .from('reports')
      .select('id, title, platform, country, year, month, is_visible, brands(name)')
      .eq('id', id)
      .single(),
    supabase.from('users').select('role').eq('id', user.id).single(),
  ])

  if (!report) {
    return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 })
  }

  const isAdmin = profile?.role === 'admin'

  // viewer는 비공개 리포트에 접근 불가
  if (!isAdmin && !report.is_visible) {
    return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
  }

  const cookieHeader = req.headers.get('cookie') ?? ''
  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  const host = req.headers.get('host')!
  const targetUrl = `${proto}://${host}/dashboard/report/${id}?print=1`

  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({ cookie: cookieHeader })
    await page.emulateMediaType('print')

    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 45_000 })

    // 폰트 및 차트 렌더 완료 대기
    await page.waitForSelector('[data-print-ready="1"]', { timeout: 30_000 })
    await page.evaluate(async () => {
      // 자체 호스팅 한글 폰트(NotoSansKRLocal) 강제 preload + fonts.ready
      await Promise.all([
        document.fonts.load('400 1em NotoSansKRLocal', '가나다라마바사아자차카타파하'),
        document.fonts.load('500 1em NotoSansKRLocal', '가나다라마바사아자차카타파하'),
        document.fonts.load('700 1em NotoSansKRLocal', '가나다라마바사아자차카타파하'),
        document.fonts.load('400 1em "Noto Sans KR"', '가나다라마바사아자차카타파하'),
        document.fonts.load('700 1em "Noto Sans KR"', '가나다라마바사아자차카타파하'),
        (document as Document & { fonts?: { ready: Promise<void> } }).fonts?.ready,
      ])
    })

    // 콘텐츠 전체 높이를 측정해 단일 페이지 PDF로 출력 (페이지 분할 없음)
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }))

    const pdf = await page.pdf({
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })

    const brandsData = report.brands as { name: string } | { name: string }[] | null
    const brandName = Array.isArray(brandsData)
      ? (brandsData[0]?.name ?? '')
      : (brandsData?.name ?? '')
    const fileName = makeFileName({
      brand_name: brandName,
      platform: report.platform,
      country: report.country,
      year: report.year,
      month: report.month,
    })

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'cache-control': 'private, no-store',
      },
    })
  } finally {
    await browser.close()
  }
}
