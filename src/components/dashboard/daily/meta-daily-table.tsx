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
import type { MetaDailyStatFull } from '@/types/database'

interface MetaDailyTableProps {
  rows: MetaDailyStatFull[]
}

function calcTotal(rows: MetaDailyStatFull[]): MetaDailyStatFull {
  const sum = (key: keyof MetaDailyStatFull) =>
    rows.reduce((acc, r) => acc + ((r[key] as number | null) ?? 0), 0)

  const totalSpend = sum('spend')
  const totalImpressions = sum('impressions')
  const totalClicks = sum('clicks')
  const totalPurchases = sum('purchases')
  const totalRevenue = sum('revenue')
  const totalOutboundClicks = sum('outbound_clicks')
  const totalContentViews = sum('content_views')
  const totalAddToCart = sum('add_to_cart')
  const totalAddToCartValue = sum('add_to_cart_value')

  return {
    id: '__total__',
    meta_account_id: '',
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
    cpp: totalPurchases > 0 ? totalSpend / totalPurchases : null,
    cpa: totalPurchases > 0 ? totalSpend / totalPurchases : null,
    conversion_rate:
      totalClicks > 0 ? (totalPurchases / totalClicks) * 100 : null,
    avg_order_value: totalPurchases > 0 ? totalRevenue / totalPurchases : null,
    reach: sum('reach'),
    frequency: null,
    cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : null,
    content_views: totalContentViews,
    cost_per_content_view:
      totalContentViews > 0 ? totalSpend / totalContentViews : null,
    add_to_cart: totalAddToCart,
    cost_per_add_to_cart:
      totalAddToCart > 0 ? totalSpend / totalAddToCart : null,
    add_to_cart_value: totalAddToCartValue,
    outbound_clicks: totalOutboundClicks,
    cost_per_outbound_click:
      totalOutboundClicks > 0 ? totalSpend / totalOutboundClicks : null,
  }
}

export function MetaDailyTable({ rows }: MetaDailyTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        조회된 데이터가 없습니다
      </div>
    )
  }

  const totalRow = calcTotal(rows)
  const displayRows = [totalRow, ...rows]

  return (
    <div>
      <Table
        className="min-w-800"
        containerClassName="overflow-auto max-h-[calc(100vh-280px)]"
      >
        <TableHeader className="bg-background sticky top-0 z-20">
          <TableRow className="[&_th]:bg-background">
            <TableHead className="bg-background sticky left-0 z-30 w-28 min-w-28">
              날짜
            </TableHead>
            <TableHead className="min-w-28 text-right">지출 (KRW)</TableHead>
            <TableHead className="min-w-28 text-right">구매(전환)수</TableHead>
            <TableHead className="min-w-28 text-right">매출 (KRW)</TableHead>
            <TableHead className="min-w-24 text-right">ROAS(%)</TableHead>
            <TableHead className="min-w-40 text-right">
              구매(전환)당 비용 (CPA)
            </TableHead>
            <TableHead className="min-w-24 text-right">전환율(%)</TableHead>
            <TableHead className="min-w-24 text-right">객단가</TableHead>
            <TableHead className="min-w-24 text-right">도달수</TableHead>
            <TableHead className="min-w-24 text-right">노출수</TableHead>
            <TableHead className="min-w-20 text-right">빈도</TableHead>
            <TableHead className="min-w-24 text-right">CPM</TableHead>
            <TableHead className="min-w-24 text-right">클릭수</TableHead>
            <TableHead className="min-w-28 text-right">CPC(링크)</TableHead>
            <TableHead className="min-w-28 text-right">CTR(링크)(%)</TableHead>
            <TableHead className="min-w-28 text-right">콘텐츠 조회</TableHead>
            <TableHead className="min-w-36 text-right">
              콘텐츠 조회당 비용
            </TableHead>
            <TableHead className="min-w-28 text-right">장바구니 담기</TableHead>
            <TableHead className="min-w-36 text-right">
              장바구니 담기당 비용
            </TableHead>
            <TableHead className="min-w-32 text-right">
              장바구니 전환값
            </TableHead>
            <TableHead className="min-w-28 text-right">
              아웃바운드 클릭
            </TableHead>
            <TableHead className="min-w-40 text-right">
              아웃바운드 클릭당 비용
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map((row, i) => (
            <TableRow
              key={row.id}
              className={
                i === 0
                  ? '[&_td]:bg-muted sticky top-10.25 z-10 font-bold'
                  : undefined
              }
            >
              <TableCell
                className={
                  i === 0
                    ? 'bg-muted sticky left-0 z-20'
                    : 'bg-background sticky left-0 z-1'
                }
              >
                {row.date}
              </TableCell>
              <TableCell className="text-right">{fmtKRW(row.spend)}</TableCell>
              <TableCell className="text-right">
                {fmtNum(row.purchases)}
              </TableCell>
              <TableCell className="text-right">
                {fmtKRW(row.revenue)}
              </TableCell>
              <TableCell className="text-right">{fmtPct(row.roas != null ? row.roas * 100 : null)}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.cpa)}</TableCell>
              <TableCell className="text-right">
                {fmtPct(row.conversion_rate)}
              </TableCell>
              <TableCell className="text-right">
                {fmtKRW(row.avg_order_value)}
              </TableCell>
              <TableCell className="text-right">{fmtNum(row.reach)}</TableCell>
              <TableCell className="text-right">
                {fmtNum(row.impressions)}
              </TableCell>
              <TableCell className="text-right">
                {fmtDec(row.frequency)}
              </TableCell>
              <TableCell className="text-right">{fmtKRW(row.cpm)}</TableCell>
              <TableCell className="text-right">{fmtNum(row.clicks)}</TableCell>
              <TableCell className="text-right">{fmtKRW(row.cpc)}</TableCell>
              <TableCell className="text-right">{fmtPct(row.ctr)}</TableCell>
              <TableCell className="text-right">
                {fmtNum(row.content_views)}
              </TableCell>
              <TableCell className="text-right">
                {fmtKRW(row.cost_per_content_view)}
              </TableCell>
              <TableCell className="text-right">
                {fmtNum(row.add_to_cart)}
              </TableCell>
              <TableCell className="text-right">
                {fmtKRW(row.cost_per_add_to_cart)}
              </TableCell>
              <TableCell className="text-right">
                {fmtKRW(row.add_to_cart_value)}
              </TableCell>
              <TableCell className="text-right">
                {fmtNum(row.outbound_clicks)}
              </TableCell>
              <TableCell className="text-right">
                {fmtKRW(row.cost_per_outbound_click)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
