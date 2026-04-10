import { requireAdmin } from '@/lib/supabase/auth'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 512 * 1024 // 512KB

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: reportId } = await params
  const { error: authError, supabase } = await requireAdmin()
  if (authError) return authError

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다. (jpeg, png, webp, gif만 가능)' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '파일 크기는 512KB 이하만 가능합니다.' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const path = `${reportId}/${uniqueId}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('insight-images')
    .upload(path, arrayBuffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: '이미지 업로드에 실패했습니다.' }, { status: 500 })
  }

  const { data } = supabase.storage.from('insight-images').getPublicUrl(path)

  return NextResponse.json({ url: data.publicUrl })
}
