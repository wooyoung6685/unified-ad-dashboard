import type { ReportListItem } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

type CreateReportBody = {
  brand_id: string
  platform: 'meta' | 'shopee' | 'tiktok' | 'amazon'
  country: string | null
  internal_account_id: string | null
  year: number
  month: number
}

export function useReports(initialData?: ReportListItem[]) {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports')
      if (!res.ok) throw new Error('리포트 조회에 실패했습니다.')
      const json = await res.json()
      return json.reports as ReportListItem[]
    },
    initialData,
  })
}

export function useCreateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateReportBody) => {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '리포트 생성에 실패했습니다.')
      return json.report as { id: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })
}

export function useGenerateSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reports/${id}/snapshot`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '스냅샷 생성에 실패했습니다.')
      return json
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })
}

export function useDeleteReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? '리포트 삭제에 실패했습니다.')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })
}
