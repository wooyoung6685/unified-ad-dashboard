import puppeteer, { type Browser } from 'puppeteer-core'

export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
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
