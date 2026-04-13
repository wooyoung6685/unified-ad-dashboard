import { supabaseAdmin } from '@/lib/supabase/admin'
import sharp from 'sharp'

// 썸네일 리사이징 설정
const THUMB_MAX_WIDTH = 400
const THUMB_JPEG_QUALITY = 80

export const CDN_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

// 이미지를 400px 이하 JPEG로 압축 (실패 시 원본 그대로 반환)
export async function compressThumb(
  buffer: ArrayBuffer,
): Promise<{ data: Buffer | ArrayBuffer; contentType: string; ext: string }> {
  try {
    const compressed = await sharp(Buffer.from(buffer))
      .resize(THUMB_MAX_WIDTH, THUMB_MAX_WIDTH, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: THUMB_JPEG_QUALITY })
      .toBuffer()
    return { data: compressed, contentType: 'image/jpeg', ext: 'jpg' }
  } catch (err) {
    console.warn('[thumb] 리사이징 실패, 원본 사용:', err)
    return { data: buffer, contentType: 'image/jpeg', ext: 'jpg' }
  }
}

// 슬라이딩 윈도우 방식 동시 실행 헬퍼
export async function runConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await fn(items[index])
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  )
  await Promise.all(workers)
  return results
}

// CDN fetch with AbortController 타임아웃
export async function fetchCdnImage(url: string): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(url, { headers: CDN_FETCH_HEADERS, signal: controller.signal })
    if (!res.ok) {
      console.error(`[thumb] CDN fetch 실패 status=${res.status} url=${url}`)
      return null
    }
    return res
  } catch (err) {
    console.error(`[thumb] CDN fetch 예외 url=${url}`, err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Storage에 이미 업로드된 파일 경로 목록 조회 (중복 업로드 스킵용)
export async function getExistingThumbs(prefix: 'meta' | 'tiktok'): Promise<Set<string>> {
  const existing = new Set<string>()
  let offset = 0
  const limit = 1000
  while (true) {
    const { data } = await supabaseAdmin.storage
      .from('report-thumbnails')
      .list(prefix, { limit, offset })
    if (!data || data.length === 0) break
    for (const f of data) existing.add(`${prefix}/${f.name}`)
    offset += data.length
    if (data.length < limit) break
  }
  return existing
}

// Facebook CDN 이미지를 Supabase Storage에 업로드하고 퍼블릭 URL 반환
// (Storage URL은 만료 없음 — fbcdn.net URL은 24시간 내 만료됨)
export async function uploadThumb(
  adId: string,
  url: string,
  accessToken: string | undefined,
  existingPaths: Set<string>,
): Promise<string | null> {
  // 이미 업로드된 경우 CDN fetch 없이 public URL 반환
  const jpgPath = `meta/${adId}.jpg`
  const pngPath = `meta/${adId}.png`
  const existingPath = existingPaths.has(jpgPath)
    ? jpgPath
    : existingPaths.has(pngPath)
      ? pngPath
      : null
  if (existingPath) {
    const { data } = supabaseAdmin.storage.from('report-thumbnails').getPublicUrl(existingPath)
    return data.publicUrl
  }

  // facebook.com/ads/image/ URL은 access_token 파라미터 필요
  let targetUrl = url
  if (url.includes('facebook.com/ads/image/') && accessToken) {
    const u = new URL(url)
    u.searchParams.set('access_token', accessToken)
    targetUrl = u.toString()
  }

  try {
    const res = await fetchCdnImage(targetUrl)
    if (!res) return null

    const rawBuffer = await res.arrayBuffer()
    const { data: compressed, contentType, ext } = await compressThumb(rawBuffer)
    const path = `meta/${adId}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from('report-thumbnails')
      .upload(path, compressed, { contentType, upsert: true })
    if (error) {
      console.error(`[thumb] Supabase upload 실패 path=${path}`, error.message)
      return null
    }

    const { data } = supabaseAdmin.storage.from('report-thumbnails').getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    console.error(`[thumb] uploadThumb 예외 adId=${adId}`, err)
    return null
  }
}

// TikTok CDN 이미지를 Supabase Storage에 영구 저장 (CDN URL 만료 방지)
export async function uploadTiktokThumb(
  adId: string,
  url: string,
  existingPaths: Set<string>,
): Promise<string | null> {
  // 이미 업로드된 경우 CDN fetch 없이 public URL 반환
  const jpgPath = `tiktok/${adId}.jpg`
  const pngPath = `tiktok/${adId}.png`
  const existingPath = existingPaths.has(jpgPath)
    ? jpgPath
    : existingPaths.has(pngPath)
      ? pngPath
      : null
  if (existingPath) {
    const { data } = supabaseAdmin.storage.from('report-thumbnails').getPublicUrl(existingPath)
    return data.publicUrl
  }

  try {
    const res = await fetchCdnImage(url)
    if (!res) return null

    const rawBuffer = await res.arrayBuffer()
    const { data: compressed, contentType, ext } = await compressThumb(rawBuffer)
    const path = `tiktok/${adId}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from('report-thumbnails')
      .upload(path, compressed, { contentType, upsert: true })
    if (error) {
      console.error(`[thumb] Supabase upload 실패 path=${path}`, error.message)
      return null
    }

    const { data } = supabaseAdmin.storage.from('report-thumbnails').getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    console.error(`[thumb] uploadTiktokThumb 예외 adId=${adId}`, err)
    return null
  }
}

// Supabase Storage URL 여부 판별 (CDN URL vs 영구 Storage URL)
export function isStorageUrl(url: string | null): boolean {
  if (!url) return false
  return url.includes('report-thumbnails')
}
