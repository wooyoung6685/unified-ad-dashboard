import { Info } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ExchangeRateNotice() {
  return (
    <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
      <Info className="!text-blue-600 dark:!text-blue-400" />
      <AlertDescription className="text-blue-800 dark:text-blue-200">
        <p>
          업로드 데이터의 <strong>해당 월 환율</strong>이 설정되어 있어야 원화
          금액이 자동 계산됩니다. 환율이 없는 달은 업로드 후에도 KRW 컬럼이 비어
          있게 됩니다.
        </p>
        <Link
          href="/dashboard/admin?tab=exchange-rates"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-80"
        >
          관리자 &gt; 환율 설정 바로가기 →
        </Link>
      </AlertDescription>
    </Alert>
  )
}
