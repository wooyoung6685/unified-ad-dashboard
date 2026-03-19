import { Skeleton } from '@/components/ui/skeleton'

export default function DailyLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-6 rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-60" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}
