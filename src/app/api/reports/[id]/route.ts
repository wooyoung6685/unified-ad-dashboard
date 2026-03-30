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
  const { title } = body
  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title이 필요합니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reports')
    .update({ title, updated_at: new Date().toISOString() })
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
