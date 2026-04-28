'use client'

import { createBrand, deleteBrand, updateBrand } from '@/app/dashboard/admin/actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Brand } from '@/types/database'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface BrandsTabProps {
  brands: Brand[]
}

export function BrandsTab({ brands: initialBrands }: BrandsTabProps) {
  const [brands, setBrands] = useState(initialBrands)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // 성공 메시지 3초 후 자동 소멸
  useEffect(() => {
    if (!message || isError) return
    const t = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(t)
  }, [message, isError])

  async function handleCreate(formData: FormData) {
    setAddError(null)
    const trimmed = (formData.get('name') as string)?.trim() ?? ''
    if (!trimmed) {
      setAddError('브랜드 이름을 입력하세요.')
      return
    }
    const isDup = brands.some(
      (b) => b.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (isDup) {
      setAddError('이미 동일한 이름의 브랜드가 존재합니다.')
      return
    }
    const result = await createBrand(formData)
    if ('error' in result) {
      setAddError(result.error ?? '알 수 없는 오류가 발생했습니다.')
    } else {
      setBrands((prev) => [...prev, result.brand])
      formRef.current?.reset()
      setAddOpen(false)
    }
  }

  async function handleUpdate(formData: FormData) {
    setMessage(null)
    const id = formData.get('id') as string
    const trimmed = (formData.get('name') as string)?.trim() ?? ''
    if (!trimmed) {
      setIsError(true)
      setMessage('오류: 브랜드 이름을 입력하세요.')
      return
    }
    const isDup = brands.some(
      (b) =>
        b.id !== id &&
        b.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (isDup) {
      setIsError(true)
      setMessage('오류: 이미 동일한 이름의 브랜드가 존재합니다.')
      return
    }
    const result = await updateBrand(formData)
    if ('error' in result) {
      setIsError(true)
      setMessage(`오류: ${result.error}`)
    } else {
      setIsError(false)
      setMessage('브랜드가 수정되었습니다.')
      const name = trimmed
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
      setIsError(true)
      setMessage(`오류: ${result.error}`)
    } else {
      setBrands((prev) => prev.filter((b) => b.id !== id))
    }
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">브랜드 관리</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            브랜드를 추가하고 담당자 정보를 관리합니다.
          </p>
        </div>
        <Button onClick={() => { setAddError(null); setAddOpen(true) }}>
          <Plus className="mr-1.5 size-4" />
          브랜드 추가
        </Button>
      </div>

      {/* 수정 성공/오류 메시지 */}
      {message && (
        <Alert
          variant={isError ? 'destructive' : 'default'}
          className="mb-4"
        >
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* 브랜드 목록 테이블 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>브랜드명</TableHead>
              <TableHead>담당자</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead className="w-px whitespace-nowrap">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-muted-foreground"
                >
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
                      <Button type="submit" size="sm">
                        저장
                      </Button>
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
                    <TableCell className="text-xs text-muted-foreground">
                      {b.manager ?? '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.created_at.slice(0, 10)}
                    </TableCell>
                    <TableCell className="w-px whitespace-nowrap">
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
                          aria-label={`${b.name} 삭제`}
                          onClick={() => setDeleteTarget(b.id)}
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

      {/* 브랜드 추가 Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) {
            setAddError(null)
            formRef.current?.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>브랜드 추가</DialogTitle>
          </DialogHeader>
          <form ref={formRef} action={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="brand-name">브랜드명</Label>
              <Input id="brand-name" name="name" placeholder="브랜드 이름" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="brand-manager">담당자 (선택)</Label>
              <Input id="brand-manager" name="manager" placeholder="담당자 이름" />
            </div>
            {addError && (
              <Alert variant="destructive">
                <AlertDescription>{addError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddOpen(false)}
              >
                취소
              </Button>
              <Button type="submit">추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 AlertDialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>브랜드 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 브랜드를 삭제하면 관련 광고계정 데이터도 함께 삭제될 수 있습니다.
              정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget)
                setDeleteTarget(null)
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
