import { requireAdmin } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const brandId = req.nextUrl.searchParams.get('brand_id')

  // snapshot 필드 제외, brands join
  let query = supabase
    .from('reports')
    .select(
      'id, brand_id, title, platform, country, internal_account_id, year, month, status, is_visible, created_by, created_at, updated_at, brands(name)',
    )
    .order('created_at', { ascending: false })

  if (brandId) {
    query = query.eq('brand_id', brandId)
  } else {
    // admin은 자기 소유 브랜드의 리포트만 조회
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') {
      const { data: myBrands } = await supabase
        .from('brands')
        .select('id')
        .or(`owner_user_id.eq.${user.id},owner_user_id.is.null`)

      const myBrandIds = (myBrands ?? []).map((b) => b.id)
      if (myBrandIds.length > 0) {
        query = query.in('brand_id', myBrandIds)
      } else {
        // 소유 브랜드 없으면 빈 결과
        return NextResponse.json({ reports: [] })
      }
    }
    // viewer는 RLS가 자동으로 본인 brand만 필터링
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reports = (data ?? []).map((row) => ({
    ...row,
    brands: undefined,
    brand_name:
      (row.brands as unknown as { name: string } | null)?.name ?? '',
  }))

  return NextResponse.json({ reports })
}

export async function POST(req: NextRequest) {
  const { error: authError, supabase } = await requireAdmin()
  if (authError) return authError

  const body = await req.json()
  const { brand_id, platform, country, internal_account_id, year, month } = body as {
    brand_id: string
    platform: 'meta' | 'shopee' | 'tiktok' | 'amazon'
    country: string | null
    internal_account_id: string | null
    year: number
    month: number
  }

  if (!brand_id || !platform || !year || !month) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
  }

  // brand_name 조회 (title 생성용)
  const { data: brand } = await supabase
    .from('brands')
    .select('name')
    .eq('id', brand_id)
    .single()
  if (!brand) return NextResponse.json({ error: '브랜드를 찾을 수 없습니다.' }, { status: 404 })

  const monthStr = month.toString().padStart(2, '0')
  const countryPart = country ? `_${country.toUpperCase()}` : ''
  const baseTitle = `[${brand.name}] ${year}년 ${monthStr}월 ${platform.toUpperCase()}${countryPart} 성과 리포트`

  // 중복 체크
  let dupQuery = supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brand_id)
    .eq('platform', platform)
    .eq('year', year)
    .eq('month', month)

  if (country === null || country === undefined) {
    dupQuery = dupQuery.is('country', null)
  } else {
    dupQuery = dupQuery.eq('country', country)
  }

  if (internal_account_id === null || internal_account_id === undefined) {
    dupQuery = dupQuery.is('internal_account_id', null)
  } else {
    dupQuery = dupQuery.eq('internal_account_id', internal_account_id)
  }

  const { count } = await dupQuery
  const suffix = (count ?? 0) > 0 ? ` (${(count ?? 0) + 1})` : ''
  const title = baseTitle + suffix

  // DB unique constraint 에러(23505) 발생 시 suffix 붙여서 재시도
  let finalTitle = title
  let insertResult = await supabase
    .from('reports')
    .insert({
      brand_id,
      title: finalTitle,
      platform,
      country: country ?? null,
      internal_account_id: internal_account_id ?? null,
      year,
      month,
      status: 'published',
      is_visible: false,
      snapshot: null,
    })
    .select()
    .single()

  if (insertResult.error?.code === '23505') {
    // 중복 발생 시 timestamp suffix 추가
    finalTitle = `${title} (${Date.now()})`
    insertResult = await supabase
      .from('reports')
      .insert({
        brand_id,
        title: finalTitle,
        platform,
        country: country ?? null,
        internal_account_id: internal_account_id ?? null,
        year,
        month,
        status: 'published',
        is_visible: false,
        snapshot: null,
      })
      .select()
      .single()
  }

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
  }

  return NextResponse.json({ report: insertResult.data }, { status: 201 })
}
