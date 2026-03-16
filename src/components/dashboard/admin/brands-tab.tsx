'use client'

import { createBrand, deleteBrand, updateBrand } from '@/app/dashboard/admin/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Brand } from '@/types/database'
import { useRef, useState } from 'react'

interface BrandsTabProps {
  brands: Brand[]
}

export function BrandsTab({ brands: initialBrands }: BrandsTabProps) {
  const [brands, setBrands] = useState(initialBrands)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleCreate(formData: FormData) {
    setMessage(null)
    const result = await createBrand(formData)
    if ('error' in result) {
      setMessage(`오류: ${result.error}`)
    } else {
      setMessage('브랜드가 생성되었습니다.')
      setBrands((prev) => [...prev, result.brand])
      formRef.current?.reset()
    }
  }

  async function handleUpdate(formData: FormData) {
    setMessage(null)
    const id = formData.get('id') as string
    const result = await updateBrand(formData)
    if ('error' in result) {
      setMessage(`오류: ${result.error}`)
    } else {
      setMessage('브랜드가 수정되었습니다.')
      const name = formData.get('name') as string
      const manager = (formData.get('manager') as string) || null
      setBrands((prev) =>
        prev.map((b) => (b.id === id ? { ...b, name, manager } : b)),
      )
      setEditingId(null)
    }
  }

  async function handleDelete(id: string) {
    setMessage(null)
    const result = await deleteBrand(id)
    if ('error' in result) {
      setMessage(`오류: ${result.error}`)
    } else {
      setBrands((prev) => prev.filter((b) => b.id !== id))
    }
  }

  return (
    <div className="space-y-8">
      {/* 브랜드 목록 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>브랜드명</TableHead>
              <TableHead>담당자</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead>액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-center text-sm">
                  브랜드가 없습니다.
                </TableCell>
              </TableRow>
            )}
            {brands.map((b) => (
              <TableRow key={b.id}>
                {editingId === b.id ? (
                  // 인라인 수정 폼
                  <TableCell colSpan={4}>
                    <form action={handleUpdate} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={b.id} />
                      <Input name="name" defaultValue={b.name} className="w-40" />
                      <Input
                        name="manager"
                        defaultValue={b.manager ?? ''}
                        placeholder="담당자 (선택)"
                        className="w-40"
                      />
                      <Button type="submit" size="sm">저장</Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        취소
                      </Button>
                    </form>
                  </TableCell>
                ) : (
                  <>
                    <TableCell>{b.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {b.manager ?? '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {b.created_at.slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(b.id)}
                        >
                          수정
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(b.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 브랜드 생성 */}
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">브랜드 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">브랜드명</label>
              <Input name="name" placeholder="브랜드 이름" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">담당자 (선택)</label>
              <Input name="manager" placeholder="담당자 이름" />
            </div>
            {message && (
              <p className="text-sm text-green-600">{message}</p>
            )}
            <Button type="submit">추가</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
