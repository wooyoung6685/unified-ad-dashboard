'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { useCallback, useEffect, useState } from 'react'

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
}

const EMPTY_FORM = {
  email: '',
  password: '',
  brand_id: '',
  role: 'viewer' as 'admin' | 'viewer',
}

export function UserManager({ brands }: UserManagerProps) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (json.error) {
        setError(json.error)
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

  async function handleAdd() {
    if (!form.email || !form.password) {
      setError('이메일과 비밀번호는 필수입니다.')
      return
    }
    setError(null)
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
        setError(json.error)
      } else {
        setUsers((prev) => [...prev, json.user])
        setForm(EMPTY_FORM)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.error) {
      setError(json.error)
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== id))
    }
  }

  return (
    <div className="space-y-8">
      {/* 유저 추가 폼 */}
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">유저 추가</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">이메일</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">임시 비밀번호</label>
            <Input
              type="password"
              placeholder="8자 이상 권장"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">브랜드 (선택)</label>
            <Select
              value={form.brand_id}
              onValueChange={(v) => setForm((prev) => ({ ...prev, brand_id: v }))}
            >
              <SelectTrigger>
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
            <label className="text-sm font-medium">역할</label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((prev) => ({ ...prev, role: v as 'admin' | 'viewer' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="viewer">viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleAdd} disabled={submitting}>
            {submitting ? '추가 중...' : '추가'}
          </Button>
        </CardContent>
      </Card>

      {/* 유저 목록 */}
      <div className="space-y-3">
        <h3 className="font-semibold">유저 목록</h3>
        {loading ? (
          <p className="text-muted-foreground text-sm">불러오는 중...</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-sm">등록된 유저가 없습니다.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>브랜드</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.brand_name || '—'}
                    </TableCell>
                    <TableCell className="text-xs">{u.role}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.created_at.slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(u.id)}
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
      </div>
    </div>
  )
}
