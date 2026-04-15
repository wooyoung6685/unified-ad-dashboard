import { supabaseAdmin } from '@/lib/supabase/admin'

// 큐텐 일본 상품명 전처리:
//   1. 【公式】(공식 표시) 반복 제거
//   2. 첫 '/' 앞부분만 남김 (뒤는 SEO 키워드)
export function preprocessQoo10Name(raw: string): string {
  if (!raw) return ''
  let s = raw.replace(/【公式】/g, '').trim()
  const slash = s.indexOf('/')
  if (slash > 0) s = s.slice(0, slash).trim()
  return s
}

// JP → KO 번역 + Supabase 캐시
// 입력: 전처리된 고유 JP 문자열 배열
// 출력: Map<전처리 JP, 한국어>
export async function translateJaToKo(texts: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (texts.length === 0) return result

  // 1) Supabase 캐시 조회
  const { data: cached } = await supabaseAdmin
    .from('qoo10_product_translations')
    .select('source_text, translated_text')
    .in('source_text', texts)

  const cachedMap = new Map<string, string>()
  for (const row of cached ?? []) {
    cachedMap.set(row.source_text, row.translated_text)
    result.set(row.source_text, row.translated_text)
  }

  // 2) 캐시 미스 항목 번역
  const missing = texts.filter((t) => !cachedMap.has(t))
  if (missing.length === 0) return result

  // @vitalets/google-translate-api 동적 import (ESM 패키지)
  let translate: ((text: string, opts: { from: string; to: string }) => Promise<{ text: string }>) | null = null
  try {
    const mod = await import('@vitalets/google-translate-api')
    translate = mod.translate
  } catch {
    console.error('[qoo10/translate] google-translate-api 로드 실패 — 원문 fallback')
    for (const t of missing) result.set(t, t)
    return result
  }

  // 항목별 번역 — 구글 무료 엔드포인트 rate limit 대응:
  //   1) 순차 처리 + 요청 간 delay (429 예방)
  //   2) 429/네트워크 오류 시 지수 backoff 재시도 (최대 3회)
  //   3) 최종 실패 시 MyMemory API 폴백 (별도 제공자, IP 차단 연동 없음)
  //   4) 두 백엔드 모두 실패 시에만 원문 fallback
  const toUpsert: { source_text: string; translated_text: string }[] = []

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const isRateLimit = (err: unknown): boolean => {
    if (!err || typeof err !== 'object') return false
    const status = (err as { status?: number; statusCode?: number }).status
      ?? (err as { statusCode?: number }).statusCode
    return status === 429
  }

  // MyMemory 폴백 번역 (API 키 불필요, 익명 기준 ~5000자/일 무료)
  const translateViaMyMemory = async (text: string): Promise<string | null> => {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|ko`
      const res = await fetch(url)
      if (!res.ok) return null
      const json = (await res.json()) as { responseStatus: number; responseData: { translatedText: string } }
      if (json.responseStatus !== 200) return null
      const translated = json.responseData.translatedText
      // MyMemory가 원문을 그대로 반환하는 경우 실패로 처리
      if (!translated || translated === text) return null
      return translated
    } catch {
      return null
    }
  }

  for (const text of missing) {
    let translated: string | null = null
    let googleRateLimited = false

    // 1차: Google 번역 (3회 재시도 + backoff)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await translate!(text, { from: 'ja', to: 'ko' })
        translated = res.text
        break
      } catch (err) {
        const rateLimited = isRateLimit(err)
        if (rateLimited) googleRateLimited = true
        // 마지막 시도면 루프 종료 → MyMemory 폴백으로 이동
        if (attempt === 2) break
        // 재시도 전 backoff: 429는 더 길게 (1s → 2s), 그 외는 짧게 (0.3s → 0.6s)
        const backoffMs = rateLimited ? 1000 * Math.pow(2, attempt) : 300 * (attempt + 1)
        await sleep(backoffMs)
      }
    }

    // 2차: Google 실패 시 MyMemory 폴백
    if (translated == null) {
      if (googleRateLimited) {
        console.warn(`[qoo10/translate] Google 429 → MyMemory 폴백: "${text}"`)
      }
      translated = await translateViaMyMemory(text)
      if (translated == null) {
        console.error(`[qoo10/translate] 번역 최종 실패 (Google + MyMemory 모두 실패): "${text}"`)
      }
    }

    if (translated != null) {
      result.set(text, translated)
      toUpsert.push({ source_text: text, translated_text: translated })
    } else {
      result.set(text, text) // 원문 fallback
    }

    // 다음 요청까지 기본 delay (rate limit 예방) — 캐시 미스 건수만큼만 발생
    await sleep(400)
  }

  // 3) 성공분 캐시 upsert
  if (toUpsert.length > 0) {
    const { error } = await supabaseAdmin
      .from('qoo10_product_translations')
      .upsert(toUpsert, { onConflict: 'source_text' })
    if (error) {
      console.error('[qoo10/translate] 캐시 upsert 실패:', error.message)
    }
  }

  return result
}
