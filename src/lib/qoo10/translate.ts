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

  // 항목별 번역 (개별 실패 시 원문 fallback)
  const toUpsert: { source_text: string; translated_text: string }[] = []

  await Promise.all(
    missing.map(async (text) => {
      try {
        const { text: translated } = await translate!(text, { from: 'ja', to: 'ko' })
        result.set(text, translated)
        toUpsert.push({ source_text: text, translated_text: translated })
      } catch (err) {
        console.error(`[qoo10/translate] 번역 실패: "${text}"`, err)
        result.set(text, text) // 원문 fallback
      }
    })
  )

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
