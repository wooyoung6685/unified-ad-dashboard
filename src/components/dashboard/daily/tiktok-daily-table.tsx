'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtDec, fmtKRW, fmtNum, fmtPct } from '@/lib/format'
import type { TiktokDailyStatFull } from '@/types/database'

interface TiktokDailyTableProps {
  rows: TiktokDailyStatFull[]
}

function calcTotal(rows: TiktokDailyStatFull[]): TiktokDailyStatFull {
  const sum = (key: keyof TiktokDailyStatFull) =>
    rows.reduce((acc, r) => acc + (r[key] as number | null ?? 0), 0)

  const totalSpend = sum('spend')
  const totalImpressions = sum('impressions')
  const totalClicks = sum('clicks')
  const totalPurchases = sum('purchases')
  const totalRevenue = sum('revenue')
  const totalReach = sum('reach')
  const totalVideoViews = sum('video_views')

  // 평균 재생시간: video_views 기반 가중 평균
  const weightedPlayTimeSum = rows.reduce(
    (s, r) => s + (r.avg_play_time ?? 0) * (r.video_views ?? 0),
    0
  )
  const avgPlayTime = totalVideoViews > 0 ? weightedPlayTimeSum / totalVideoViews : null

  return {
    id: '__total__',
    tiktok_account_id: '',
    brand_id: '',
    date: '합계',
    spend: totalSpend,
    impressions: totalImpressions,
    clicks: totalClicks,
    purchases: totalPurchases,
    revenue: totalRevenue,
    roas: totalSpend > 0 ? totalRevenue / totalSpend : null,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : null,
    reach: totalReach,
    frequency: totalReach > 0 ? totalImpressions / totalReach : null,
    cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : null,
    video_views: totalVideoViews,
    views_2s: sum('views_2s'),
    views_6s: sum('views_6s'),
    views_25pct: sum('views_25pct'),
    views_100pct: sum('views_100pct'),
    avg_play_time: avgPlayTime,
    followers: sum('followers'),
    likes: sum('likes'),
    add_to_cart: sum('add_to_cart'),
    add_to_cart_value: sum('add_to_cart_value'),
  }
}

export function TiktokDailyTable({ rows }: TiktokDailyTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        조회된 데이터가 없습니다
      </div>
    )
  }

  const totalRow = calcTotal(rows)

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">일반 캠페인</h3>
      <div className="rounded-lg border">
      <Table
        className="min-w-800"
        containerClassName="overflow-auto max-h-[calc(100vh-280px)]"
      >
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="[&_th]:bg-background">
            <TableHead className="sticky left-0 z-30 w-28 min-w-28 bg-background">날짜</TableHead>
            <TableHead className="min-w-28 text-right">지출 (KRW)</TableHead>
            <TableHead className="min-w-24 text-right">노출수</TableHead>
            <TableHead className="min-w-24 text-right">도달수</TableHead>
            <TableHead className="min-w-24 text-right">클릭수</TableHead>
            <TableHead className="min-w-20 text-right">빈도</TableHead>
            <TableHead className="min-w-28 text-right">클릭당 비용 (CPC)</TableHead>
            <TableHead className="min-w-28 text-right">클릭률 (CTR)(%)</TableHead>
            <TableHead className="min-w-24 text-right">CPM</TableHead>
            <TableHead className="min-w-28 text-right">동영상 조회수</TableHead>
            <TableHead className="min-w-24 text-right">2초 조회수</TableHead>
            <TableHead className="min-w-24 text-right">6초 조회수</TableHead>
            <TableHead className="min-w-24 text-right">25% 조회수</TableHead>
            <TableHead className="min-w-24 text-right">100% 조회수</TableHead>
            <TableHead className="min-w-32 text-right">평균 재생시간</TableHead>
            <TableHead className="min-w-24 text-right">팔로워</TableHead>
            <TableHead className="min-w-24 text-right">좋아요</TableHead>
            <TableHead className="min-w-28 text-right">구매(전환)수</TableHead>
            <TableHead className="min-w-28 text-right">매출 (KRW)</TableHead>
            <TableHead className="min-w-20 text-right">ROAS(%)</TableHead>
          </TableRow>
          {/* 합계행 - 헤더 안에 배치해서 sticky 블록으로 묶음 */}
          <TableRow className="font-bold [&_th]:bg-muted">
            <TableHead className="sticky left-0 z-30 w-28 min-w-28 bg-muted">합계</TableHead>
            <TableHead className="min-w-28 text-right">{fmtKRW(totalRow.spend)}</TableHead>
            <TableHead className="min-w-24 text-right">{fmtNum(totalRow.impressions)}</TableHead>
            <TableHead className="min-w-24 text-right">{fmtNum(totalRow.reach)}</TableHead>
            <TableHead className="min-w-24 text-right">{fmtNum(totalRow.clicks)}</TableHead>
            <TableHead className="min-w-20 text-right">{fmtDec(totalRow.frequency)}</TableHead>
            <TableHead className="min-w-28 text-right">{fmtKRW(totalRow.cpc)}</TableHead>
            <TableHead className="min-w-28 text-right">{fmtPct(totalRow.ctr)}</TableHead>
            <TableHead className="min-w-24 text-right">{fmtKRW(totalRow.cpm)}</TableHead>
            <TableHead className="min-w-28 text-right">{fmtNum(totalRow.video_views)}</TableHead>
            <TableHead className="min-w-24 text-right">{fmtNum(totalRow.views_2s)}</TableHead>
            <TableHead className="min-w-24 text-right">{fmtNum(totalRow.views_6s)}</TableHead>
            <TableHead className="min-w-24 text-right">{fmtNum(totalRow.views_25pct)}</TableHead>
            <TableHead className="min-w-24 text-right">{fmtNum(totalRow.views_100pct)}</TableHead>
            <TableHead className="min-w-32 text-right">{fmtDec(totalRow.avg_play_time)}</TableHead>
            <TableHead className="min-w-24 text-right">{fmtNum(totalRow.followers)}</TableHead>
            <TableHead className="min-w-24 text-right">{fmtNum(totalRow.likes)}</TableHead>
            <TableHead className="min-w-28 text-right">{fmtNum(totalRow.purchases)}</TableHead>
            <TableHead className="min-w-28 text-right">{fmtKRW(totalRow.revenue)}</TableHead>
            <TableHead className="min-w-20 text-right">{fmtPct(totalRow.roas != null ? totalRow.roas * 100 : null)}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="sticky left-0 z-1 bg-background w-28 min-w-28">{row.date}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.spend)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.impressions)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.reach)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.clicks)}</TableCell>
              <TableCell className="text-right">{fmtDec(row.frequency)}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.cpc)}</TableCell>
              <TableCell className="text-right">{fmtPct(row.ctr)}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.cpm)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.video_views)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.views_2s)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.views_6s)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.views_25pct)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.views_100pct)}</TableCell>
              <TableCell className="text-right">{fmtDec(row.avg_play_time)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.followers)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.likes)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.purchases)}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.revenue)}</TableCell>
              <TableCell className="text-right">{fmtPct(row.roas != null ? row.roas * 100 : null)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
