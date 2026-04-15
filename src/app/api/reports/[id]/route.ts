import { requireAdmin } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { data, error } = await supabase
    .from('reports')
    .select('*, brands(name)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 })
  }

  const report = {
    ...data,
    brands: undefined,
    brand_name: (data.brands as { name: string } | null)?.name ?? '',
  }

  return NextResponse.json({ report })
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const { error: authError, supabase } = await requireAdmin()
  if (authError) return authError

  const body = await req.json()
  const { title, insight_memo, insight_memo_gmv_max, insight_memo_title, insight_memo_gmv_max_title, filters } = body

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (title !== undefined) {
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title이 비어있습니다.' }, { status: 400 })
    }
    updateData.title = title.trim()
  }

  if (insight_memo !== undefined) {
    if (insight_memo !== null && typeof insight_memo !== 'string') {
      return NextResponse.json({ error: 'insight_memo 형식이 잘못되었습니다.' }, { status: 400 })
    }
    updateData.insight_memo = insight_memo
  }

  if (insight_memo_gmv_max !== undefined) {
    if (insight_memo_gmv_max !== null && typeof insight_memo_gmv_max !== 'string') {
      return NextResponse.json({ error: 'insight_memo_gmv_max 형식이 잘못되었습니다.' }, { status: 400 })
    }
    updateData.insight_memo_gmv_max = insight_memo_gmv_max
  }

  if (insight_memo_title !== undefined) {
    if (insight_memo_title !== null && typeof insight_memo_title !== 'string') {
      return NextResponse.json({ error: 'insight_memo_title 형식이 잘못되었습니다.' }, { status: 400 })
    }
    updateData.insight_memo_title = insight_memo_title
  }

  if (insight_memo_gmv_max_title !== undefined) {
    if (insight_memo_gmv_max_title !== null && typeof insight_memo_gmv_max_title !== 'string') {
      return NextResponse.json({ error: 'insight_memo_gmv_max_title 형식이 잘못되었습니다.' }, { status: 400 })
    }
    updateData.insight_memo_gmv_max_title = insight_memo_gmv_max_title
  }

  if (filters !== undefined) {
    if (filters !== null && (typeof filters !== 'object' || Array.isArray(filters))) {
      return NextResponse.json({ error: 'filters 형식이 잘못되었습니다.' }, { status: 400 })
    }
    updateData.filters = filters
  }

  if (Object.keys(updateData).length === 1) {
    return NextResponse.json({ error: '수정할 필드가 없습니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ report: data })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const { error: authError, supabase } = await requireAdmin()
  if (authError) return authError

  const { error } = await supabase.from('reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
