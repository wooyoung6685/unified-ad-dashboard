'use client'

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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Brand } from '@/types/database'
import { UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UserRow {
  id: string
  email: string
  brand_id: string | null
  brand_name: string
  role: 'admin' | 'viewer'
  created_at: string
}

interface UserManagerProps {
  brands: Brand[]
  openAddRef?: React.MutableRefObject<(() => void) | null>
}

const EMPTY_FORM = {
  email: '',
  password: '',
  brand_id: '',
  role: 'viewer' as 'admin' | 'viewer',
}

export function UserManager({ brands, openAddRef }: UserManagerProps) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // 추가 Dialog 상태
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // 목록 오류 메시지
  const [listError, setListError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (json.error) {
        setListError(json.error)
      } else {
        setUsers(json.users ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function openAddDialog() {
    setForm(EMPTY_FORM)
    setAddError(null)
    setAddOpen(true)
  }

  // 부모(users-tab)의 버튼에서 Dialog를 열 수 있도록 ref에 함수 등록
  useEffect(() => {
    if (openAddRef) openAddRef.current = openAddDialog
  }, [openAddRef])

  async function handleAdd() {
    if (!form.email || !form.password) {
      setAddError('이메일과 비밀번호는 필수입니다.')
      return
    }
    setAddError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          brand_id: form.brand_id || null,
          role: form.role,
        }),
      })
      const json = await res.json()
      if (json.error) {
        setAddError(json.error)
      } else {
        setUsers((prev) => [...prev, json.user])
        setAddOpen(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setListError(null)
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.error) {
      setListError(json.error)
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== id))
    }
  }

  return (
    <div>
      {/* 오류 메시지 */}
      {listError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{listError}</AlertDescription>
        </Alert>
      )}

      {/* 유저 목록 */}
      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Users className="size-10 opacity-30" />
          <p className="text-sm">등록된 유저가 없습니다.</p>
          <Button variant="outline" size="sm" onClick={openAddDialog}>
            <UserPlus className="mr-1.5 size-4" />
            첫 유저 추가
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이메일</TableHead>
                <TableHead>브랜드</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead className="w-px whitespace-nowrap">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.brand_name || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.created_at.slice(0, 10)}
                  </TableCell>
                  <TableCell className="w-px whitespace-nowrap">
                    <Button
                      variant="destructive"
                      size="sm"
                      aria-label={`${u.email} 삭제`}
                      onClick={() => setDeleteTarget(u.id)}
                    >
                      삭제
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 유저 추가 Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) setAddError(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>유저 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="user-email">이메일</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-password">임시 비밀번호</Label>
              <Input
                id="user-password"
                type="password"
                placeholder="8자 이상 권장"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-brand">브랜드 (선택)</Label>
              <Select
                value={form.brand_id}
                onValueChange={(v) => setForm((prev) => ({ ...prev, brand_id: v }))}
              >
                <SelectTrigger id="user-brand">
                  <SelectValue placeholder="브랜드 선택" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-role">역할</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, role: v as 'admin' | 'viewer' }))
                }
              >
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="viewer">viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addError && (
              <Alert variant="destructive">
                <AlertDescription>{addError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? '추가 중...' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 AlertDialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>유저 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 유저를 삭제하면 대시보드 접근이 불가능해집니다. 정말 삭제하시겠습니까?
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
