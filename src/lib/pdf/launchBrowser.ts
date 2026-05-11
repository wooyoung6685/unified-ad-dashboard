import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer, { type Browser } from 'puppeteer-core'

const FONTS = [
  {
    fileName: 'NotoSansKR.ttf',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf',
  },
  {
    fileName: 'NotoColorEmoji.ttf',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notocoloremoji/NotoColorEmoji-Regular.ttf',
  },
]

// serverless Chromium은 한글·이모지 시스템 폰트가 없으므로
// fontconfig가 스캔하는 /tmp/fonts/에 사전 배치 (콜드 스타트당 1회, 이후 캐시)
async function ensureFonts(): Promise<void> {
  const fontDir = join(tmpdir(), 'fonts')
  await fs.mkdir(fontDir, { recursive: true })
  await Promise.all(
    FONTS.map(async (f) => {
      const fontPath = join(fontDir, f.fileName)
      try {
        await fs.access(fontPath)
        return
      } catch {
        // 미존재 시 다운로드
      }
      const res = await fetch(f.url)
      if (!res.ok) throw new Error(`폰트 다운로드 실패(${f.fileName}): ${res.status}`)
      await fs.writeFile(fontPath, Buffer.from(await res.arrayBuffer()))
    }),
  )
}

export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const chromium = (await import('@sparticuz/chromium')).default

    // executablePath가 /tmp/fonts/를 생성/추출하므로 그 다음에 한글 폰트를 추가
    const executablePath = await chromium.executablePath()
    await ensureFonts()

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
