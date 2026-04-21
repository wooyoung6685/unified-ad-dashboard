# 쇼피 리포트 — Shopee Ads 섹션 교체 지시서 (ROAS TOP 5)

> 현재 쇼피 리포트 섹션 3 "🎯 Shopee Ads 성과"(ads_type 2줄 합산 테이블)를
> **광고 단위 ROAS TOP 5 테이블** 로 교체한다. UI 스타일은 기존 **바우처 Top3 섹션(`ShopeeVoucherTop3Section`) 과 동일**하게 맞춘다.
>
> 데이터 소스는 현재 업로드되는 인앱 CSV(`Shopee Ads Overall Data`) 동일 파일이지만,
> 기존 파서는 CSV 를 `ads_type`(shop_ad / product_ad / other) 3종으로 **합산해서** `shopee_inapp_stats` 에 저장하고 있어
> 광고 단위(Ad Name / Product ID) 정보가 없다. 따라서 **파서에 두 번째 저장 경로를 추가**해야 한다.

---

## 0. 배경

### 현재 구조
- **파서**: `src/lib/shopee/parseInappStat.ts`
  - CSV를 읽어 `determineAdsType` 으로 `product_ad`/`shop_ad`/`other` 3종으로 분류 후 **합산** → `shopee_inapp_stats` (`UNIQUE(shopee_account_id, date, ads_type)`) 에 upsert.
- **스냅샷**: `src/app/api/reports/[id]/snapshot/route.ts` (L452~494)
  - `shopee_inapp_stats` 를 ads_type 별로 합산해 2행 `ads_breakdown` 생성.
- **UI**: `src/components/dashboard/report/shopee-report-detail.tsx`
  - 섹션 3 `AdsBreakdownTable` (L228~283) 이 Shop Ads / Product Ads 두 줄 렌더.

### 목표 UI (첨부 이미지 기준)
- 제목: `🎯 Shopee Ads (ROAS TOP 5)`
- 열: **Product | Impression | Clicks | CTR | Conversions | Conversion Rate | GMV | Expense | ROAS | GMV(한화) | Expense(한화)**
- 상단 우측: `환율(SGD) ₩1,143.14` 표기
- ROAS 열은 옅은 노란색 배경(이미지의 ROAS 컬럼)
- 하단에 **합계 행** — 수치는 합산, CTR/Conversion Rate/ROAS 는 전체 기준 재계산
- 정렬: **ROAS 내림차순 TOP 5** (expense > 0 이면서 roas가 유효한 광고만)

### 변경 방침
- **기존 `shopee_inapp_stats` / 기존 아래 집계 구조(월간 KPI 등)는 그대로 유지** — 건드리지 않는다.
- **추가로 per-ad 단위 테이블** `shopee_inapp_ad_stats` 를 새로 만들고, 기존 파서에 **두 번째 upsert 경로**만 얹는다.
- 스냅샷은 per-ad 테이블에서 월 단위 집계 후 Product(=Ad Name) 별 재합산 → ROAS DESC TOP 5.
- 섹션 3 컴포넌트 `AdsBreakdownTable` 대신 **신규 `ShopeeAdsRoasTop5Section`** 으로 교체.

---

## 1. DB 마이그레이션

`supabase/migrations/030_add_shopee_inapp_ad_stats.sql` 신규 생성. 007/008 SQL 스타일을 따른다.

```sql
-- ============================================================
-- 030_add_shopee_inapp_ad_stats.sql
-- 쇼피 인앱 광고의 "광고 단위(per-Ad)" 일별 통계 테이블 추가
-- 기존 shopee_inapp_stats (ads_type 3종 합산) 는 그대로 유지.
-- ============================================================

CREATE TABLE public.shopee_inapp_ad_stats (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_account_id   uuid        REFERENCES public.shopee_accounts ON DELETE CASCADE,
  brand_id            uuid        REFERENCES public.brands,
  date                date        NOT NULL,

  -- 식별자 (CSV 행 단위)
  ad_name             text        NOT NULL,        -- CSV Ad Name
  ads_type_raw        text,                         -- CSV Ads Type 원본 ('' / 'Product Ad' / 'Shop Ad')
  ads_type            text        NOT NULL,        -- normalize: 'product_ad' | 'shop_ad' | 'other'
  product_id          text,                         -- Product Ad 일 때만 값 존재
  bidding_method      text,                         -- Bidding Method (GMV Max 등 구분용)

  currency            text,

  -- 측정치 (노란색/이미지 기준 8개 + Direct 보조)
  impressions         bigint,
  clicks              bigint,
  ctr                 numeric(10,4),                -- clicks / impressions * 100
  conversions         integer,
  conversion_rate     numeric(10,4),                -- conversions / clicks * 100
  direct_conversions  integer,
  items_sold          integer,
  direct_items_sold   integer,
  gmv                 numeric(15,2),
  direct_gmv          numeric(15,2),
  expense             numeric(15,2),
  roas                numeric(10,4),                -- gmv / expense (배수)
  direct_roas         numeric(10,4),
  acos                numeric(10,4),
  direct_acos         numeric(10,4),

  -- 원화 환산
  gmv_krw             numeric(15,2),
  direct_gmv_krw      numeric(15,2),
  expense_krw         numeric(15,2),

  created_at          timestamptz DEFAULT now(),
  UNIQUE (shopee_account_id, date, ad_name)
);

ALTER TABLE public.shopee_inapp_ad_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopee_inapp_ad_stats_select"
  ON public.shopee_inapp_ad_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "shopee_inapp_ad_stats_insert"
  ON public.shopee_inapp_ad_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "shopee_inapp_ad_stats_update"
  ON public.shopee_inapp_ad_stats FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "shopee_inapp_ad_stats_delete"
  ON public.shopee_inapp_ad_stats FOR DELETE
  USING (get_my_role() = 'admin');

CREATE INDEX idx_shopee_inapp_ad_stats_brand_date
  ON public.shopee_inapp_ad_stats (brand_id, date);
CREATE INDEX idx_shopee_inapp_ad_stats_account_date
  ON public.shopee_inapp_ad_stats (shopee_account_id, date);
CREATE INDEX idx_shopee_inapp_ad_stats_account_date_adname
  ON public.shopee_inapp_ad_stats (shopee_account_id, date, ad_name);
```

> `UNIQUE (shopee_account_id, date, ad_name)` 선택 이유:
> - CSV 한 행 = 광고 하나이며 동일 날짜 재업로드 시 idempotent 보장.
> - Ad Name 은 동일 계정에서 유일(Shopee UI 기준). Product ID 가 동일한 광고가 2개 존재할 수 있으므로 Product ID 를 유니크로 쓰면 위험.

---

## 2. 파서 수정 — `parseInappStat.ts`

**기존 동작은 그대로 두고**, per-ad 레코드를 **추가 생성**해 두 번째 `upsert` 를 수행한다.

### 2.1 헤더 상수 확장
기존 `HEADER_COLS` 에 다음을 추가:

```ts
const HEADER_COLS = {
  // 기존
  adsType: 'Ads Type',
  adName: 'Ad Name',
  impressions: 'Impression',
  clicks: 'Clicks',
  conversions: 'Conversions',
  directConversions: 'Direct Conversions',
  itemsSold: 'Items Sold',
  directItemsSold: 'Direct Items Sold',
  gmv: 'GMV',
  directGmv: 'Direct GMV',
  expense: 'Expense',
  // 추가
  productId: 'Product ID',
  bidding: 'Bidding Method',
  ctr: 'CTR',
  conversionRate: 'Conversion Rate',
  roas: 'ROAS',
  directRoas: 'Direct ROAS',
  acos: 'ACOS',
  directAcos: 'Direct ACOS',
} as const
```

### 2.2 per-ad 레코드 생성 (루프 내부)
기존 `for` 루프에서 `accumByType` 합산과 동일한 위치에, **행 단위 레코드**도 수집:

```ts
const adRows: Record<string, unknown>[] = []

for (let i = 8; i < lines.length; i++) {
  const line = lines[i]?.trim()
  if (!line) continue
  const cols = parseCsvLine(line)
  if (cols.length < 3) continue

  const get = (k: keyof typeof HEADER_COLS) => {
    const idx = colIdx[HEADER_COLS[k]]
    return idx !== undefined ? (cols[idx] ?? '') : ''
  }

  const adName = get('adName').trim()
  if (!adName) continue          // Ad Name 없는 행 skip
  const adsType = determineAdsType(get('adsType'), adName)

  const impressions = parseNum(get('impressions'))
  const clicks      = parseNum(get('clicks'))
  const conversions = parseNum(get('conversions'))
  const gmv         = parseNum(get('gmv'))
  const expense     = parseNum(get('expense'))

  // 파일이 준 ratio 컬럼 우선 사용, 없으면 계산
  const ctr             = get('ctr')            ? parseNum(get('ctr'))            : (impressions > 0 ? clicks/impressions*100 : null)
  const conversionRate  = get('conversionRate') ? parseNum(get('conversionRate')) : (clicks > 0 ? conversions/clicks*100 : null)
  const roas            = get('roas')           ? parseNum(get('roas'))           : (expense > 0 ? gmv/expense : null)

  adRows.push({
    shopee_account_id: shopeeAccountId,
    brand_id: brandId,
    date,
    ad_name: adName,
    ads_type_raw: get('adsType'),
    ads_type: adsType,
    product_id: (get('productId') && get('productId') !== '-') ? get('productId') : null,
    bidding_method: get('bidding') || null,
    currency,
    impressions: Math.round(impressions),
    clicks: Math.round(clicks),
    ctr,
    conversions: Math.round(conversions),
    conversion_rate: conversionRate,
    direct_conversions: Math.round(parseNum(get('directConversions'))),
    items_sold: Math.round(parseNum(get('itemsSold'))),
    direct_items_sold: Math.round(parseNum(get('directItemsSold'))),
    gmv,
    direct_gmv: parseNum(get('directGmv')),
    expense,
    roas,
    direct_roas: parseNum(get('directRoas')) || null,
    acos: parseNum(get('acos')) || null,
    direct_acos: parseNum(get('directAcos')) || null,
    // 환율 적용은 아래 공통 블록에서 일괄 수행
    gmv_krw: null,
    direct_gmv_krw: null,
    expense_krw: null,

    // 기존 로직도 그대로 유지 — accumByType[adsType] 업데이트 수행 후 continue
  })

  // (기존 accumByType 업데이트 로직 그대로 유지)
}
```

### 2.3 환율 적용 후 두 번째 upsert
기존 `records` 만든 블록 **바로 다음** 에 동일한 환율 `rate` 를 사용해 `adRows` 에 `*_krw` 컬럼을 주입 후 upsert:

```ts
const adRowsWithKrw = adRows.map((r) => ({
  ...r,
  gmv_krw:        rate !== null ? (r.gmv as number)        * rate : null,
  direct_gmv_krw: rate !== null ? (r.direct_gmv as number) * rate : null,
  expense_krw:    rate !== null ? (r.expense as number)    * rate : null,
}))

if (adRowsWithKrw.length > 0) {
  const { error: adErr } = await supabase
    .from('shopee_inapp_ad_stats')
    .upsert(adRowsWithKrw, { onConflict: 'shopee_account_id,date,ad_name' })

  if (adErr) {
    // 기존 inapp_stats upsert 는 이미 성공했을 수 있으므로, 실패만 에러로 반환
    return { success: false, error: `per-ad 저장 실패: ${adErr.message}` }
  }
}
```

> **롤백 정책**: 기존 `shopee_inapp_stats` upsert 가 실패한 경우엔 기존처럼 그 시점에 return 된다. per-ad upsert 는 마지막 단계라 영향 범위 최소.

---

## 3. 스냅샷 빌더 수정 — `snapshot/route.ts`

### 3.1 쿼리 추가 (Promise.all 블록)
쇼피 스냅샷 빌더의 `Promise.all` (기존 `productStats` 쿼리 등 있는 곳)에 **월간 per-ad 쿼리** 추가:

```ts
const [/* ... 기존 ... */, curAdStatsRes, prevAdStatsRes] = await Promise.all([
  /* ... 기존 쿼리들 ... */,
  shoppingAccountIds.length > 0
    ? supabaseAdmin
        .from('shopee_inapp_ad_stats')
        .select('ad_name, product_id, ads_type, impressions, clicks, conversions, gmv, expense, gmv_krw, expense_krw, currency')
        .in('shopee_account_id', inappAccountIds)
        .gte('date', thisMonthStart)
        .lte('date', thisMonthEnd)
    : Promise.resolve({ data: [] }),
  // prev 도 동일하게 prevMonthStart~End 로 한 번 더 (필요 없으면 생략 가능)
  Promise.resolve({ data: [] }),
])
```

### 3.2 ROAS TOP 5 집계
`ads_breakdown` 계산 블록 **대체** 또는 그 옆에 Top5 계산 추가:

```ts
type AdDayRow = {
  ad_name: string
  product_id: string | null
  ads_type: string
  impressions: number | null
  clicks: number | null
  conversions: number | null
  gmv: number | null
  expense: number | null
  gmv_krw: number | null
  expense_krw: number | null
  currency: string | null
}

const adDayRows: AdDayRow[] = (curAdStatsRes.data ?? []) as AdDayRow[]

// ad_name 기준 월간 합산
const byAd = new Map<string, {
  ad_name: string
  product_id: string | null
  ads_type: string
  impressions: number
  clicks: number
  conversions: number
  gmv: number
  expense: number
  gmv_krw: number
  expense_krw: number
  currency: string
}>()

for (const r of adDayRows) {
  const key = r.ad_name
  const cur = byAd.get(key) ?? {
    ad_name: r.ad_name,
    product_id: r.product_id,
    ads_type: r.ads_type,
    impressions: 0, clicks: 0, conversions: 0,
    gmv: 0, expense: 0, gmv_krw: 0, expense_krw: 0,
    currency: r.currency ?? '',
  }
  cur.impressions += r.impressions ?? 0
  cur.clicks      += r.clicks ?? 0
  cur.conversions += r.conversions ?? 0
  cur.gmv         += r.gmv ?? 0
  cur.expense     += r.expense ?? 0
  cur.gmv_krw     += r.gmv_krw ?? 0
  cur.expense_krw += r.expense_krw ?? 0
  byAd.set(key, cur)
}

const allAgg = Array.from(byAd.values())

// ROAS DESC TOP 5 (expense > 0 인 것만)
const top5 = allAgg
  .filter((a) => a.expense > 0)
  .map((a) => ({
    product: a.ad_name,                    // 표시용 (컴포넌트에서 truncate)
    ads_type: a.ads_type,
    impressions: a.impressions || null,
    clicks: a.clicks || null,
    ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : null,
    conversions: a.conversions || null,
    conversion_rate: a.clicks > 0 ? (a.conversions / a.clicks) * 100 : null,
    gmv: a.gmv || null,
    expense: a.expense || null,
    roas: a.expense > 0 ? a.gmv / a.expense : null,
    gmv_krw: a.gmv_krw || null,
    expense_krw: a.expense_krw || null,
    currency: a.currency || '',
  }))
  .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
  .slice(0, 5)

// 합계 (TOP5 에 포함된 5행만의 합 — 이미지와 동일 "합계" 행)
const sum = top5.reduce((s, r) => ({
  impressions: (s.impressions ?? 0) + (r.impressions ?? 0),
  clicks:      (s.clicks ?? 0)      + (r.clicks ?? 0),
  conversions: (s.conversions ?? 0) + (r.conversions ?? 0),
  gmv:         (s.gmv ?? 0)         + (r.gmv ?? 0),
  expense:     (s.expense ?? 0)     + (r.expense ?? 0),
  gmv_krw:     (s.gmv_krw ?? 0)     + (r.gmv_krw ?? 0),
  expense_krw: (s.expense_krw ?? 0) + (r.expense_krw ?? 0),
}), { impressions: 0, clicks: 0, conversions: 0, gmv: 0, expense: 0, gmv_krw: 0, expense_krw: 0 })

const ads_top5_total = {
  impressions: sum.impressions || null,
  clicks: sum.clicks || null,
  ctr: sum.impressions > 0 ? (sum.clicks / sum.impressions) * 100 : null,
  conversions: sum.conversions || null,
  conversion_rate: sum.clicks > 0 ? (sum.conversions / sum.clicks) * 100 : null,
  gmv: sum.gmv || null,
  expense: sum.expense || null,
  roas: sum.expense > 0 ? sum.gmv / sum.expense : null,
  gmv_krw: sum.gmv_krw || null,
  expense_krw: sum.expense_krw || null,
}

const ads_fx_rate_krw: number | null = (rate as number | null) ?? null   // 상단 우측 표기용
const ads_currency: string = inappCurrency                                // 'SGD' 등
```

### 3.3 반환 페이로드 업데이트
```ts
return {
  platform: 'shopee_inapp',
  data: {
    monthly,
    weekly,
    // ⛔ ads_breakdown 제거
    ads_top5: top5,          // NEW
    ads_top5_total,          // NEW
    ads_currency,            // NEW  ex) 'SGD'
    ads_fx_rate_krw,         // NEW  ex) 1143.14
    voucher_top3,
    product_top5,
  },
}
```

> 기존 `ads_breakdown` 을 참조하는 곳(`shopee-report-detail.tsx` L472) 을 전부 제거. 타입/Import 도 정리.

---

## 4. 타입 수정 — `src/types/database.ts`

### 4.1 `ShopeeAdsBreakdownData` 제거 또는 deprecated 주석, `ShopeeReportData` 갱신
```ts
export type ShopeeReportData = {
  monthly: ShopeeMonthlyData
  weekly: ShopeeWeeklyData[]
  // ads_breakdown: ShopeeAdsBreakdownData[]   ← 삭제
  ads_top5: ShopeeAdsTopRow[]              // NEW
  ads_top5_total: ShopeeAdsTopTotalRow     // NEW
  ads_currency: string                     // NEW  ex) 'SGD'
  ads_fx_rate_krw: number | null           // NEW  ex) 1143.14
  voucher_top3?: ShopeeVoucherTopRow[]
  product_top5?: ShopeeProductTopRow[]
}

export type ShopeeAdsTopRow = {
  product: string                // Ad Name (표시용)
  ads_type: string               // 'product_ad' | 'shop_ad' | 'other'
  impressions: number | null
  clicks: number | null
  ctr: number | null             // %
  conversions: number | null
  conversion_rate: number | null // %
  gmv: number | null             // 현지통화
  expense: number | null         // 현지통화
  roas: number | null            // 배수 (예: 4.03). UI에서 % 로 포맷 ("403%") 필요하면 ×100
  gmv_krw: number | null
  expense_krw: number | null
  currency: string
}

export type ShopeeAdsTopTotalRow = Omit<ShopeeAdsTopRow, 'product' | 'ads_type' | 'currency'>
```

---

## 5. 컴포넌트 — `ShopeeAdsRoasTop5Section` (바우처 스타일 미러)

`src/components/dashboard/report/shopee-ads-roas-top5-section.tsx` 신규 생성.

기반: `shopee-voucher-top3-section.tsx` 의 Card + Table 구조를 그대로 복제. 상품명이 길어질 수 있으므로 product 열은 `shopee-product-top5-section.tsx` 와 동일하게 **sticky left + truncate(+Tooltip)** 패턴을 적용.

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ShopeeAdsTopRow, ShopeeAdsTopTotalRow } from '@/types/database'

interface Props {
  rows: ShopeeAdsTopRow[]
  total: ShopeeAdsTopTotalRow
  currency: string       // 'SGD'
  fxRateKrw: number | null  // 1143.14
}

// 포맷 유틸 (바우처 섹션과 동일 포맷 재사용)
function fmtNum(v: number | null) { return v == null ? '-' : v.toLocaleString() }
function fmtPct(v: number | null) { return v == null ? '-' : `${v.toFixed(2)}%` }
function fmtCurrency(v: number | null, cur: string) {
  if (v == null) return '-'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(v)
  } catch {
    return `${cur} ${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }
}
function fmtKRW(v: number | null) {
  if (v == null) return '-'
  return `₩${Math.round(v).toLocaleString()}`
}
function fmtRoasPct(v: number | null) {
  // 이미지 포맷: ROAS 는 "%" 표기 (403%, 146.33%)
  if (v == null) return '-'
  return `${(v * 100).toFixed(2)}%`
}

function truncateName(name: string, max = 50) {
  if (!name) return { display: '', truncated: false }
  if (name.length <= max) return { display: name, truncated: false }
  return { display: name.slice(0, max) + '...', truncated: true }
}

const STICKY_HEAD = 'sticky left-0 z-10 bg-background border-r w-[240px] min-w-[240px] max-w-[240px] overflow-hidden whitespace-nowrap font-bold'
const STICKY_CELL = 'sticky left-0 z-10 bg-background border-r w-[240px] min-w-[240px] max-w-[240px] overflow-hidden whitespace-nowrap'
const ROAS_CELL = 'whitespace-nowrap bg-yellow-100/60'   // 이미지의 옅은 노란 배경

export function ShopeeAdsRoasTop5Section({ rows, total, currency, fxRateKrw }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">🎯 Shopee Ads (ROAS TOP 5)</CardTitle>
        <div className="text-xs text-muted-foreground">
          환율({currency}) {fxRateKrw == null ? '-' : `₩${fxRateKrw.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={STICKY_HEAD}>Product</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Impression</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Clicks</TableHead>
                <TableHead className="whitespace-nowrap font-bold">CTR</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Conversions</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Conversion Rate</TableHead>
                <TableHead className="whitespace-nowrap font-bold">GMV</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Expense</TableHead>
                <TableHead className={`${ROAS_CELL} font-bold`}>ROAS</TableHead>
                <TableHead className="whitespace-nowrap font-bold">GMV(한화)</TableHead>
                <TableHead className="whitespace-nowrap font-bold">Expense(한화)</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                    광고 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {rows.map((r) => {
                    const { display, truncated } = truncateName(r.product)
                    return (
                      <TableRow key={r.product}>
                        <TableCell className={STICKY_CELL}>
                          {truncated ? (
                            <Tooltip>
                              <TooltipTrigger asChild><span className="cursor-help">{display}</span></TooltipTrigger>
                              <TooltipContent className="max-w-md">{r.product}</TooltipContent>
                            </Tooltip>
                          ) : <span>{display}</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{fmtNum(r.impressions)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtNum(r.clicks)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtPct(r.ctr)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtNum(r.conversions)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtPct(r.conversion_rate)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtCurrency(r.gmv, currency)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtCurrency(r.expense, currency)}</TableCell>
                        <TableCell className={ROAS_CELL}>{fmtRoasPct(r.roas)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtKRW(r.gmv_krw)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtKRW(r.expense_krw)}</TableCell>
                      </TableRow>
                    )
                  })}
                  {/* 합계 행 */}
                  <TableRow className="bg-yellow-50/60 font-semibold">
                    <TableCell className={STICKY_CELL}>합계</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtNum(total.impressions)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtNum(total.clicks)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtPct(total.ctr)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtNum(total.conversions)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtPct(total.conversion_rate)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtCurrency(total.gmv, currency)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtCurrency(total.expense, currency)}</TableCell>
                    <TableCell className={ROAS_CELL}>{fmtRoasPct(total.roas)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtKRW(total.gmv_krw)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtKRW(total.expense_krw)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 6. 메인 컴포넌트 수정 — `shopee-report-detail.tsx`

### 6.1 Import 교체
```ts
// 제거
import type { ShopeeAdsBreakdownData, ... } from '@/types/database'
// AdsBreakdownTable(function) 전체 삭제 (L228~283)

// 추가
import { ShopeeAdsRoasTop5Section } from './shopee-ads-roas-top5-section'
```

### 6.2 섹션 3 교체 (L471~472)
```tsx
{/* 섹션 3: Shopee Ads (ROAS TOP 5) */}
<ShopeeAdsRoasTop5Section
  rows={data.ads_top5}
  total={data.ads_top5_total}
  currency={data.ads_currency}
  fxRateKrw={data.ads_fx_rate_krw}
/>
```

### 6.3 잔여 청소
- `AdsBreakdownTable`, `AdsCell` 등 더 이상 안 쓰는 보조 함수 삭제.
- 타입 `ShopeeAdsBreakdownData` import 제거.

---

## 7. CSV 컬럼 매핑 (참고용)

업로드 파일 헤더(`Shopee Ads Overall Data …csv` 의 line 8):

| CSV 컬럼 | 사용 |
|---|---|
| Sequence | 무시 |
| **Ad Name** | `ad_name` / 표시용 `product` |
| Status | 무시 (필요 시 추가 가능) |
| **Ads Type** | `ads_type_raw`, `determineAdsType()` 입력 |
| **Product ID** | `product_id` (`-` → null) |
| Creative / Placement | 무시 |
| **Bidding Method** | `bidding_method` |
| Start/End Date | 무시 |
| **Impression** | `impressions` |
| **Clicks** | `clicks` |
| **CTR** | `ctr` (% 제거) |
| **Conversions** | `conversions` |
| Direct Conversions | `direct_conversions` |
| **Conversion Rate** | `conversion_rate` (% 제거) |
| Direct Conversion Rate | 무시 |
| Cost per Conversion | 무시 (필요 시 저장 가능) |
| Cost per Direct Conversion | 무시 |
| Items Sold | `items_sold` |
| Direct Items Sold | `direct_items_sold` |
| **GMV** | `gmv` |
| Direct GMV | `direct_gmv` |
| **Expense** | `expense` |
| **ROAS** | `roas` |
| Direct ROAS | `direct_roas` |
| ACOS | `acos` |
| Direct ACOS | `direct_acos` |
| Product Impressions / Clicks / CTR | 무시 (shop ad 에만 값 있음) |

> `-` 문자열은 `parseNum` 이 이미 `0` 반환. ratio(CTR/Conversion Rate/ROAS) 는 `-` 일 때 `null` 저장이 바람직 → `parseNumOrNull('-') → null` 분기 추가.

---

## 8. 작업 순서

1. `supabase/migrations/030_add_shopee_inapp_ad_stats.sql` 작성 & 적용.
2. `parseInappStat.ts` 에 per-ad 저장 로직 추가 (기존 로직 유지).
3. `src/types/database.ts` — 타입 추가/교체.
4. `src/app/api/reports/[id]/snapshot/route.ts` — per-ad 쿼리 + TOP 5/합계 계산 + 반환 payload 변경.
5. `shopee-ads-roas-top5-section.tsx` 신규 컴포넌트 추가.
6. `shopee-report-detail.tsx` — AdsBreakdownTable 제거, 신규 섹션 연결.
7. 기존 저장된 스냅샷(`reports.snapshot`) 에는 `ads_breakdown` 이 남아있을 수 있으므로 **렌더 분기 처리**(`data.ads_top5 ? <new/> : <legacy/>`) 또는 스냅샷 재생성 권장. 가능하면 재생성으로 단순화.
8. 로컬 테스트:
   - 업로드한 샘플 CSV(08_02_2026) 재업로드 후 `shopee_inapp_ad_stats` 9행 저장 확인.
   - ROAS 값 `로우 1 = 1.39`, `로우 4 = 8.49` 등이 그대로 들어가는지.
   - 리포트 페이지에서 TOP 5 정렬/합계 행/환율 표기 확인.

---

## 9. 주의사항

- **UNIQUE 충돌**: 동일 CSV 재업로드 시 `UNIQUE(shopee_account_id, date, ad_name)` 로 upsert 되어 중복 없이 갱신됨. Ad Name 이 동일 계정에서 변경될 수도 있으므로 **Ad Name 변경 = 신규 행** 으로 취급.
- **expense = 0 인 행**: ROAS 무한대가 되므로 TOP 5 필터에서 제외 (`filter(a.expense > 0)`).
- **`-` 수치**: ratio 컬럼은 `null` 저장이 맞다. `parseNumOrNull` 을 파서에 추가해 CTR/Conv Rate/ROAS/ACOS 에 적용.
- **환율 표기**: 스냅샷 빌더에서 `ads_fx_rate_krw` 를 `exchange_rates` 월/국가 키로 조회(기존 로직 재사용). 없으면 `null` 표시.
- **합계 행 ROAS**: 평균이 아니라 `SUM(gmv) / SUM(expense)` 로 재계산해야 이미지(146.33%) 와 일치.
- **Legacy 스냅샷 호환**: 이미 발행된 리포트는 `ads_top5` 가 없을 수 있으므로 Safe-guard (`?? []`) 필요.
- **권한**: 새 테이블도 기존과 동일하게 admin 만 insert/update, 브랜드 owner select.
- **문자 인코딩**: CSV UTF-8 BOM 제거는 기존 파서에 이미 존재 — 그대로 사용.
- **차트 미반영**: 주간 차트(`WeeklyCharts`) 는 기존 `shopee_inapp_stats` 기반으로 유지. per-ad 테이블과 무관.

---

## 10. 체크리스트

- [ ] 030 마이그레이션 적용 OK / RLS 동작 OK
- [ ] `parseInappStat.ts` 업로드 → `shopee_inapp_stats` 와 `shopee_inapp_ad_stats` 동시 저장 OK
- [ ] ROAS 값 CSV 그대로 들어가는지 (parseNum 으로 % 제거 없이 그대로)
- [ ] 스냅샷 payload 에 `ads_top5`, `ads_top5_total`, `ads_currency`, `ads_fx_rate_krw` 존재
- [ ] 리포트 화면에서 섹션 3 이 신규 테이블로 교체됨
- [ ] 합계 행 CTR/Conversion Rate/ROAS 재계산 일치
- [ ] 환율 SGD 표기 `₩1,143.14` 형식
- [ ] ROAS 열 노란색 배경
- [ ] Product 열 sticky + 긴 이름 truncate + Tooltip 동작

---

## 11. 샘플 파일 위치

- `/sessions/epic-affectionate-albattani/mnt/uploads/Shopee-Ads-Overall-Data-08_02_2026-08_02_2026 (3).csv`
