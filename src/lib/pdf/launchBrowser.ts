import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer, { type Browser } from 'puppeteer-core'

const KOREAN_FONT_URL =
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf'

// serverless Chromium은 한글 시스템 폰트가 없어 웹폰트 로딩 실패 시 한글이 사라짐
// fontconfig가 스캔하는 /tmp/fonts/에 한글 ttf를 사전 배치 (콜드 스타트당 1회)
async function ensureKoreanFont(): Promise<void> {
  const fontDir = join(tmpdir(), 'fonts')
  const fontPath = join(fontDir, 'NotoSansKR.ttf')
  try {
    await fs.access(fontPath)
    return
  } catch {
    // 미존재 시 다운로드
  }
  await fs.mkdir(fontDir, { recursive: true })
  const res = await fetch(KOREAN_FONT_URL)
  if (!res.ok) {
    throw new Error(`한글 폰트 다운로드 실패: ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(fontPath, buf)
}

export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const chromium = (await import('@sparticuz/chromium')).default

    // executablePath가 /tmp/fonts/를 생성/추출하므로 그 다음에 한글 폰트를 추가
    const executablePath = await chromium.executablePath()
    await ensureKoreanFont()

    return puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
      defaultViewport: { width: 1280, height: 1800, deviceScaleFactor: 2 },
    })
  }
  // 로컬 dev: puppeteer 번들 Chromium 경로 사용
  const dev = await import('puppeteer')
  return puppeteer.launch({
    executablePath: dev.executablePath(),
    headless: true,
    defaultViewport: { width: 1280, height: 1800, deviceScaleFactor: 2 },
  })
}
