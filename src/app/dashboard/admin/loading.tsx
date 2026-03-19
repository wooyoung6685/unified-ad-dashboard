import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-36" />
      <div className="space-y-4">
        <div className="bg-card space-y-4 rounded-lg border p-6">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="bg-card space-y-4 rounded-lg border p-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  )
}
