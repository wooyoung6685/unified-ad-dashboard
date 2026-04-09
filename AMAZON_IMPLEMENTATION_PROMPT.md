# 아마존(Amazon) 매체 추가 구현 프롬프트

## 개요

기존 쇼피(Shopee) 구현 패턴을 그대로 따라서 **아마존(Amazon)** 매체를 프로젝트에 추가해줘.
파일 업로드 방식으로 CSV 데이터를 서버에 저장하고, 일별 데이터 조회 탭에서 조회할 수 있어야 해.

---

## 1. 아마존 데이터 파일 3종류

### 1-1. 오가닉 데이터 (BusinessReport CSV)

**파일명 규칙:** 파일명에 `BusinessReport`가 포함되어야 업로드 가능

**CSV 헤더 (한국어):**
```
날짜,주문 상품 판매량,주문 상품 판매 - B2B,주문 수량,주문 수량 - B2B,총 주문 아이템,총 주문 아이템 - B2B,페이지 조회수 - 합계,페이지 조회수 - 총계 - B2B,세션 - 합계,세션 - 총계 - B2B,추천 오퍼(바이 박스) 비율,추천 오퍼(바이 박스) 비율 - B2B,상품 세션 비율,단위 세션 비율 - B2B,평균 오퍼 개수,평균 상위 아이템
```

**샘플 데이터:**
```
26. 4. 1.,"US$3,620.53",US$0.00,176,0,174,0,"3,477",40,"2,550",25,97.63%,100.00%,6.90%,0.00%,36,26
```

**날짜 형식:** `26. 4. 1.` → `2026-04-01` (YY. M. D. 형식, 파싱 필요)

**금액 형식:** `"US$3,620.53"` → 숫자 3620.53 (통화 기호 제거, 콤마 제거 파싱 필요)

**퍼센트 형식:** `97.63%` → 97.63 (% 제거)

**일별 조회 시 표시할 컬럼:**
- 날짜 (date)
- 전체 매출 (주문 상품 판매량 = ordered_product_sales)
- 구매수 (주문 수량 = orders)
- 전체 세션수 (세션 - 합계 = sessions)
- 전환율 (주문 수량 / 세션 합계 * 100 = conversion_rate, 계산)
- AOV (전체 매출 / 구매수 = aov, 계산)

---

### 1-2. 내부광고 데이터 (Sponsored Products CSV)

**파일명 규칙:** 광고계정 추가 시 입력한 `광고계정 ID(account_id)`가 파일명에 포함되어야 업로드 가능
- 예: 광고계정 ID가 `TEST_SHAISHAISHAI`이면, 파일명에 `TEST_SHAISHAISHAI`이 포함되어야 함

**CSV 헤더 (한국어):**
```
날짜,광고 상품,캠페인 ID,캠페인 이름,글로벌 캠페인 ID,예산 통화,검색어,노출수,조회 가능 노출수,클릭수,CTR,조회 가능 클릭률(CTR),총 비용,구매수,구매(신규 브랜드 고객),구매당 비용,구매당 비용(브랜드 신규 고객),매출,장기 판매,ROAS,장기 ROAS,CPC
```

**샘플 데이터:**
```
2026. 4. 7.,Sponsored Products,"=""229476204339956""",TOFU - Prospecting - SPA - Algorithm- Banana Cream,,USD,shaishaishai - banana conceal eye cream,14,0,5,35.7143%,,1.53,0,,,,0.0,,0.0,,0.306
```

**날짜 형식:** `2026. 4. 7.` → `2026-04-07` (YYYY. M. D. 형식)

**주의사항:**
- 캠페인 ID가 `="229476204339956"` 형식 (Excel 방지 포맷) → 정리 필요
- 하루에 여러 행(검색어별/캠페인별)이 있으므로 **날짜별로 집계(SUM)** 필요
- 빈 값이 있을 수 있음 (예: 구매당 비용이 비어있는 경우)

**DB 저장 시 날짜별 집계 대상 필드:**
- impressions: 노출수 합산
- clicks: 클릭수 합산
- cost: 총 비용 합산
- purchases: 구매수 합산
- sales: 매출 합산
- 계산 필드는 집계 후 재계산: ROAS = sales / cost, CPC = cost / clicks, CTR = clicks / impressions * 100

**일별 조회 시 표시할 컬럼:**
- 날짜 (date)
- 전체광고비 (cost)
- 광고매출 (sales)
- ROAS (sales / cost)
- 광고노출수 (impressions)
- 광고클릭수 (clicks)
- CPC (cost / clicks)
- CTR (clicks / impressions * 100)

---

### 1-3. 제품별 데이터 (ASIN Report CSV)

**파일명 규칙:** 파일명에 `asin`이 포함되어야 업로드 가능 (대소문자 무관)

**CSV 헤더 (한국어):**
```
날짜,(상위) ASIN,(하위) ASIN,제목,세션 - 합계,세션 - 총계 - B2B,세션 비율 - 총계,세션 비율 - 합계 - B2B,페이지 조회수 - 합계,페이지 조회수 - 총계 - B2B,페이지 조회수 비율 - 총계,페이지 조회수 비율 - 총계 - B2B,추천 오퍼(바이 박스) 비율,추천 오퍼(바이 박스) 비율 - B2B,주문 수량,주문 수량 - B2B,상품 세션 비율,단위 세션 비율 - B2B,주문 상품 판매량,주문 상품 판매 - B2B,총 주문 아이템,총 주문 아이템 - B2B
```

**샘플 데이터:**
```
26. 4. 6.,B0GT8LYW4L,B0GSCSV8N5,"shaishaishai BANANA PDRN Conceal...","1,104",10,16.90%,50.00%,"1,465",11,17.94%,47.83%,98.85%,100.00%,48,0,4.35%,0.00%,US$960.00 ,US$0.00 ,48,0
```

**날짜 형식:** `26. 4. 6.` → `2026-04-06` (YY. M. D. 형식)

---

## 2. Supabase 마이그레이션

마이그레이션 파일명: `supabase/migrations/021_add_amazon_tables.sql`
(현재 마지막이 020_add_report_filters.sql)

### 2-1. amazon_accounts 테이블

쇼피의 `shopee_accounts`를 참고하여 생성:

```sql
CREATE TABLE IF NOT EXISTS amazon_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,          -- 외부 광고계정 ID (예: TEST_SHAISHAISHAI)
  account_name TEXT NOT NULL DEFAULT '',  -- 서브브랜드명 (UI 표시용)
  account_type TEXT NOT NULL CHECK (account_type IN ('organic', 'ads', 'asin')),
  country TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, account_type)
);
```

### 2-2. amazon_organic_stats 테이블 (오가닉 = BusinessReport)

```sql
CREATE TABLE IF NOT EXISTS amazon_organic_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_account_id UUID NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  currency TEXT,

  -- 원본 필드
  ordered_product_sales NUMERIC,          -- 주문 상품 판매량
  ordered_product_sales_b2b NUMERIC,      -- 주문 상품 판매 - B2B
  orders INTEGER,                          -- 주문 수량
  orders_b2b INTEGER,                      -- 주문 수량 - B2B
  total_order_items INTEGER,               -- 총 주문 아이템
  total_order_items_b2b INTEGER,           -- 총 주문 아이템 - B2B
  page_views INTEGER,                      -- 페이지 조회수 - 합계
  page_views_b2b INTEGER,                  -- 페이지 조회수 - 총계 - B2B
  sessions INTEGER,                        -- 세션 - 합계
  sessions_b2b INTEGER,                    -- 세션 - 총계 - B2B
  buy_box_percentage NUMERIC,              -- 추천 오퍼(바이 박스) 비율
  buy_box_percentage_b2b NUMERIC,          -- 추천 오퍼(바이 박스) 비율 - B2B
  unit_session_percentage NUMERIC,         -- 상품 세션 비율
  unit_session_percentage_b2b NUMERIC,     -- 단위 세션 비율 - B2B
  average_offer_count INTEGER,             -- 평균 오퍼 개수
  average_parent_items INTEGER,            -- 평균 상위 아이템

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(amazon_account_id, date)
);
```

### 2-3. amazon_ads_stats 테이블 (내부광고 = Sponsored Products)

```sql
CREATE TABLE IF NOT EXISTS amazon_ads_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_account_id UUID NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  currency TEXT,

  -- 날짜별 집계 필드
  impressions INTEGER,                -- 노출수 합산
  viewable_impressions INTEGER,       -- 조회 가능 노출수 합산
  clicks INTEGER,                     -- 클릭수 합산
  cost NUMERIC,                       -- 총 비용 합산
  purchases INTEGER,                  -- 구매수 합산
  purchases_new_to_brand INTEGER,     -- 구매(신규 브랜드 고객) 합산
  sales NUMERIC,                      -- 매출 합산
  long_term_sales NUMERIC,            -- 장기 판매 합산

  -- 계산 필드 (집계 후 계산)
  ctr NUMERIC,                        -- clicks / impressions * 100
  cpc NUMERIC,                        -- cost / clicks
  roas NUMERIC,                       -- sales / cost
  long_term_roas NUMERIC,             -- long_term_sales / cost
  cost_per_purchase NUMERIC,          -- cost / purchases

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(amazon_account_id, date)
);
```

### 2-4. amazon_asin_stats 테이블 (제품별 = ASIN Report)

```sql
CREATE TABLE IF NOT EXISTS amazon_asin_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_account_id UUID NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  currency TEXT,

  parent_asin TEXT,                         -- (상위) ASIN
  child_asin TEXT,                          -- (하위) ASIN
  title TEXT,                               -- 제목
  sessions INTEGER,                         -- 세션 - 합계
  sessions_b2b INTEGER,                     -- 세션 - 총계 - B2B
  session_percentage NUMERIC,               -- 세션 비율 - 총계
  session_percentage_b2b NUMERIC,           -- 세션 비율 - 합계 - B2B
  page_views INTEGER,                       -- 페이지 조회수 - 합계
  page_views_b2b INTEGER,                   -- 페이지 조회수 - 총계 - B2B
  page_views_percentage NUMERIC,            -- 페이지 조회수 비율 - 총계
  page_views_percentage_b2b NUMERIC,        -- 페이지 조회수 비율 - 총계 - B2B
  buy_box_percentage NUMERIC,               -- 추천 오퍼(바이 박스) 비율
  buy_box_percentage_b2b NUMERIC,           -- 추천 오퍼(바이 박스) 비율 - B2B
  orders INTEGER,                           -- 주문 수량
  orders_b2b INTEGER,                       -- 주문 수량 - B2B
  unit_session_percentage NUMERIC,          -- 상품 세션 비율
  unit_session_percentage_b2b NUMERIC,      -- 단위 세션 비율 - B2B
  ordered_product_sales NUMERIC,            -- 주문 상품 판매량
  ordered_product_sales_b2b NUMERIC,        -- 주문 상품 판매 - B2B
  total_order_items INTEGER,                -- 총 주문 아이템
  total_order_items_b2b INTEGER,            -- 총 주문 아이템 - B2B

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(amazon_account_id, date, child_asin)
);
```

### 2-5. RLS 정책

쇼피와 동일한 패턴:

```sql
-- amazon_accounts
ALTER TABLE amazon_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amazon_accounts_select" ON amazon_accounts FOR SELECT USING (
  brand_id IN (SELECT brand_id FROM user_profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "amazon_accounts_insert" ON amazon_accounts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "amazon_accounts_update" ON amazon_accounts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "amazon_accounts_delete" ON amazon_accounts FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- amazon_organic_stats (동일 패턴 반복)
ALTER TABLE amazon_organic_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amazon_organic_stats_select" ON amazon_organic_stats FOR SELECT USING (
  brand_id IN (SELECT brand_id FROM user_profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "amazon_organic_stats_insert" ON amazon_organic_stats FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "amazon_organic_stats_update" ON amazon_organic_stats FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- amazon_ads_stats (동일 패턴)
ALTER TABLE amazon_ads_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amazon_ads_stats_select" ON amazon_ads_stats FOR SELECT USING (
  brand_id IN (SELECT brand_id FROM user_profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "amazon_ads_stats_insert" ON amazon_ads_stats FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "amazon_ads_stats_update" ON amazon_ads_stats FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- amazon_asin_stats (동일 패턴)
ALTER TABLE amazon_asin_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amazon_asin_stats_select" ON amazon_asin_stats FOR SELECT USING (
  brand_id IN (SELECT brand_id FROM user_profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "amazon_asin_stats_insert" ON amazon_asin_stats FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "amazon_asin_stats_update" ON amazon_asin_stats FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
```

### 2-6. 인덱스

```sql
CREATE INDEX idx_amazon_organic_stats_account_date ON amazon_organic_stats(amazon_account_id, date);
CREATE INDEX idx_amazon_ads_stats_account_date ON amazon_ads_stats(amazon_account_id, date);
CREATE INDEX idx_amazon_asin_stats_account_date ON amazon_asin_stats(amazon_account_id, date);
CREATE INDEX idx_amazon_accounts_brand ON amazon_accounts(brand_id);
```

---

## 3. 파일 파서 구현

`src/lib/amazon/` 디렉토리에 3개 파서 생성. 쇼피의 `src/lib/shopee/parseShoppingStat.ts`, `src/lib/shopee/parseInappStat.ts` 패턴을 참고.

### 3-1. parseOrganicStat.ts (오가닉 데이터 파서)

```
경로: src/lib/amazon/parseOrganicStat.ts
```

**구현 요구사항:**
- CSV 파일 파싱 (UTF-8 BOM 처리)
- 날짜 파싱: `26. 4. 1.` → `2026-04-01` (YY. M. D. 형식)
  - 첫 두 자리가 연도 약자 (26 → 2026)
- 금액 파싱: `"US$3,620.53"` → 3620.53 (통화기호+콤마 제거)
  - 통화 코드 추출 (US$ → USD)
- 퍼센트 파싱: `97.63%` → 97.63
- 콤마가 포함된 숫자: `"3,477"` → 3477
- Supabase upsert: `(amazon_account_id, date)` 기준
- 반환: `{ success: true, inserted: number, updated: number }` 또는 `{ success: false, error: string }`

### 3-2. parseAdsStat.ts (내부광고 데이터 파서)

```
경로: src/lib/amazon/parseAdsStat.ts
```

**구현 요구사항:**
- CSV 파일 파싱 (UTF-8 BOM 처리)
- 날짜 파싱: `2026. 4. 7.` → `2026-04-07` (YYYY. M. D. 형식)
- 캠페인 ID 정리: `="229476204339956"` → `229476204339956` (=""...""" 제거)
- **핵심: 날짜별로 모든 행을 집계(SUM)**
  - 노출수, 클릭수, 총 비용, 구매수, 매출, 장기 판매 → 합산
  - CTR, CPC, ROAS, 장기 ROAS, 구매당 비용 → 집계 후 재계산
- 빈 값 처리: 빈 문자열 → null 또는 0
- Supabase upsert: `(amazon_account_id, date)` 기준
- 반환: `{ success: true, inserted: number, updated: number }` 또는 `{ success: false, error: string }`

### 3-3. parseAsinStat.ts (제품별 데이터 파서)

```
경로: src/lib/amazon/parseAsinStat.ts
```

**구현 요구사항:**
- CSV 파일 파싱 (UTF-8 BOM 처리, RFC 4180 준수)
- 날짜 파싱: `26. 4. 6.` → `2026-04-06`
- 금액 파싱: `US$960.00 ` → 960.00 (통화기호+공백 제거)
- 콤마 포함 숫자: `"1,104"` → 1104
- 퍼센트 파싱: `16.90%` → 16.90
- 제목에 콤마가 포함될 수 있음 → CSV 파싱 시 RFC 4180 quote 처리 필수
- Supabase upsert: `(amazon_account_id, date, child_asin)` 기준
- 반환: `{ success: true, inserted: number, updated: number }` 또는 `{ success: false, error: string }`

---

## 4. API 라우트 구현

### 4-1. 관리자 계정 관리 API

```
경로: src/app/api/admin/accounts/amazon/route.ts
```

쇼피의 `src/app/api/admin/accounts/shopee/route.ts`를 참고하여 동일 패턴:

- **GET**: amazon_accounts + brands JOIN 조회
- **POST**: upsert
  - account_type 없으면 organic + ads + asin 3행 동시 upsert (통합 모드)
  - account_type 있으면 단건 upsert
  - onConflict: `account_id,account_type`
- **DELETE**: account_id 기준 전체 삭제 또는 id 단건 삭제

### 4-2. 파일 업로드 API

```
경로: src/app/api/dashboard/daily/amazon-upload/route.ts
```

쇼피의 `src/app/api/dashboard/daily/shopee-upload/route.ts`를 참고:

- **POST**: multipart/form-data (file, amazon_account_id, account_type)
- Admin 전용 (requireAdmin())
- 파일명 검증 로직:
  - `account_type === 'organic'`: 파일명에 `BusinessReport` 포함 필수
  - `account_type === 'ads'`: 파일명에 해당 계정의 `account_id` 포함 필수
  - `account_type === 'asin'`: 파일명에 `asin` 포함 필수 (대소문자 무관, toLowerCase 비교)
- account_type에 따라 적절한 파서 호출

### 4-3. 일별 데이터 조회 API 수정

```
경로: src/app/api/dashboard/daily/route.ts (기존 파일 수정)
```

기존 `shopee` 분기 아래에 `amazon` 분기 추가:

```typescript
} else if (accountType === 'amazon' || accountType === 'amazon_organic' || accountType === 'amazon_ads' || accountType === 'amazon_asin') {
  // 전달된 accountId로 amazon_accounts 조회
  const { data: refAcct } = await supabase
    .from('amazon_accounts')
    .select('account_id, brand_id, country')
    .eq('id', accountId)
    .single()

  // 같은 account_id의 organic/ads/asin 계정 ID 조회
  // organic_rows: amazon_organic_stats 조회
  // ads_rows: amazon_ads_stats 조회 (날짜별 집계된 상태)
  // asin_rows: amazon_asin_stats 조회 (제품별 상세)

  return NextResponse.json({
    platform: 'amazon',
    organic_rows,
    ads_rows,
    asin_rows
  })
}
```

---

## 5. TypeScript 타입 추가

`src/types/database.ts`에 추가:

```typescript
// ── Amazon ──────────────────────────────────

export type AmazonAccount = {
  id: string
  brand_id: string
  account_id: string
  account_name: string
  account_type: 'organic' | 'ads' | 'asin'
  country: string | null
  is_active: boolean
  created_at: string
}

export type AmazonOrganicStat = {
  id: string
  amazon_account_id: string
  brand_id: string
  date: string
  currency: string | null
  ordered_product_sales: number | null
  ordered_product_sales_b2b: number | null
  orders: number | null
  orders_b2b: number | null
  total_order_items: number | null
  total_order_items_b2b: number | null
  page_views: number | null
  page_views_b2b: number | null
  sessions: number | null
  sessions_b2b: number | null
  buy_box_percentage: number | null
  buy_box_percentage_b2b: number | null
  unit_session_percentage: number | null
  unit_session_percentage_b2b: number | null
  average_offer_count: number | null
  average_parent_items: number | null
  created_at: string
}

export type AmazonAdsStat = {
  id: string
  amazon_account_id: string
  brand_id: string
  date: string
  currency: string | null
  impressions: number | null
  viewable_impressions: number | null
  clicks: number | null
  cost: number | null
  purchases: number | null
  purchases_new_to_brand: number | null
  sales: number | null
  long_term_sales: number | null
  ctr: number | null
  cpc: number | null
  roas: number | null
  long_term_roas: number | null
  cost_per_purchase: number | null
  created_at: string
}

export type AmazonAsinStat = {
  id: string
  amazon_account_id: string
  brand_id: string
  date: string
  currency: string | null
  parent_asin: string | null
  child_asin: string | null
  title: string | null
  sessions: number | null
  sessions_b2b: number | null
  session_percentage: number | null
  session_percentage_b2b: number | null
  page_views: number | null
  page_views_b2b: number | null
  page_views_percentage: number | null
  page_views_percentage_b2b: number | null
  buy_box_percentage: number | null
  buy_box_percentage_b2b: number | null
  orders: number | null
  orders_b2b: number | null
  unit_session_percentage: number | null
  unit_session_percentage_b2b: number | null
  ordered_product_sales: number | null
  ordered_product_sales_b2b: number | null
  total_order_items: number | null
  total_order_items_b2b: number | null
  created_at: string
}
```

`DailyFilters.accountType`에 `'amazon_organic' | 'amazon_ads' | 'amazon_asin'` 추가:

```typescript
export type DailyFilters = {
  brandId: string
  accountId: string
  accountType: 'meta' | 'tiktok' | 'shopee_shopping' | 'shopee_inapp' | 'amazon_organic' | 'amazon_ads' | 'amazon_asin'
  startDate: string
  endDate: string
}
```

`DailyApiResponse`에 amazon 케이스 추가:

```typescript
type DailyApiResponse =
  | { platform: 'meta'; rows: MetaDailyStatFull[] }
  | { platform: 'tiktok'; rows: TiktokDailyStatFull[]; gmvMaxRows: GmvMaxDailyRow[] | null }
  | { platform: 'shopee'; shopping_rows: ShopeeShoppingStat[]; inapp_rows: ShopeeInappDayRow[] }
  | { platform: 'amazon'; organic_rows: AmazonOrganicStat[]; ads_rows: AmazonAdsStat[]; asin_rows: AmazonAsinStat[] }
```

---

## 6. UI 컴포넌트 구현

### 6-1. fetch-common-data.ts 수정

`src/lib/supabase/fetch-common-data.ts`에 amazonAccounts 추가:

```typescript
import type { AmazonAccount } from '@/types/database'

export type CommonDashboardData = {
  // ... 기존 필드
  amazonAccounts: (AmazonAccount & { brands: { name: string } | null })[]
}
```

amazon_accounts도 기존 shopee처럼 브랜드 기반으로 조회하도록 추가.

### 6-2. daily-filter-bar.tsx 수정

아마존 계정 옵션 그룹 추가 (쇼피 패턴 참고):

```typescript
// account_id 기준 중복 제거 (organic 행 우선)
const amazonOptions: AccountOption[] = (() => {
  const seen = new Set<string>()
  const result: AccountOption[] = []
  const sorted = [...amazonAccounts.filter(brandFilter)].sort((a) =>
    a.account_type === 'organic' ? -1 : 1
  )
  for (const a of sorted) {
    if (seen.has(a.account_id)) continue
    seen.add(a.account_id)
    result.push({
      id: a.id,
      label: [a.account_name, '아마존', a.country].filter(Boolean).join('_'),
      type: 'amazon_organic',  // 대표 타입
      brandId: a.brand_id,
    })
  }
  return result
})()

const allOptions = [...metaOptions, ...tiktokOptions, ...shopeeOptions, ...amazonOptions]
```

### 6-3. daily-shell.tsx 수정

**업로드 Dialog 추가 (쇼피 Dialog 패턴 참고):**
- 아마존 계정 선택 시 "파일 업로드" 버튼 표시
- Dialog에 3개 업로드 영역 세로 배치:
  1. 오가닉 데이터 (.csv) - BusinessReport
  2. 내부광고 데이터 (.csv) - 광고데이터
  3. 제품별 데이터 (.csv) - ASIN

**데이터 테이블 렌더링:**
```
platform === 'amazon' 일 때:
  - 오가닉 테이블 (organic_rows)
  - 내부광고 테이블 (ads_rows)
  표시
```

### 6-4. amazon-upload-area.tsx (신규)

```
경로: src/components/dashboard/daily/amazon-upload-area.tsx
```

쇼피의 `shopee-upload-area.tsx`를 참고하여 동일 패턴:
- props: amazonAccountId, accountExternalId, accountType ('organic' | 'ads' | 'asin'), onUploadSuccess
- 드래그앤드롭 + 파일 선택
- `/api/dashboard/daily/amazon-upload` POST 호출
- 업로드 진행률 표시
- 파일명 힌트 표시:
  - organic: "BusinessReport가 파일명에 포함되어야 합니다"
  - ads: "{accountId}가 파일명에 포함되어야 합니다"
  - asin: "asin이 파일명에 포함되어야 합니다"

### 6-5. amazon-organic-table.tsx (신규)

```
경로: src/components/dashboard/daily/amazon-organic-table.tsx
```

**표시 컬럼:**
| 날짜 | 전체 매출 | 구매수 | 전체 세션수 | 전환율 | AOV |
|------|----------|--------|-----------|--------|-----|

- 전환율 = orders / sessions * 100 (%)
- AOV = ordered_product_sales / orders

쇼피 `shopee-shopping-table.tsx` 스타일 동일하게:
- sticky header/date column
- totals row (합계 행)
- 숫자 포맷 (천단위 콤마, 소수점 2자리)
- 통화 표시

### 6-6. amazon-ads-table.tsx (신규)

```
경로: src/components/dashboard/daily/amazon-ads-table.tsx
```

**표시 컬럼:**
| 날짜 | 전체광고비 | 광고매출 | ROAS | 광고노출수 | 광고클릭수 | CPC | CTR |
|------|----------|---------|------|----------|----------|-----|-----|

- ROAS = sales / cost
- CPC = cost / clicks
- CTR = clicks / impressions * 100

쇼피 `shopee-inapp-table.tsx` 스타일 동일하게:
- sticky header/date column
- totals row (합계 행)
- 숫자 포맷

---

## 7. 관리자 페이지 (계정 관리)

쇼피 계정 관리 UI가 이미 있다면, 동일한 패턴으로 아마존 계정 관리 섹션 추가:

- 브랜드 선택
- 광고계정 ID 입력 (account_id) - 이것이 광고 데이터 파일명 검증에 사용됨
- 서브브랜드명 입력 (account_name)
- 국가 선택
- 활성/비활성 토글
- 저장 시 organic + ads + asin 3행 동시 생성

---

## 8. 구현 순서 권장

1. **마이그레이션 파일** 생성 및 적용 (`021_add_amazon_tables.sql`)
2. **TypeScript 타입** 추가 (`src/types/database.ts`)
3. **파서 3개** 구현 (`src/lib/amazon/parseOrganicStat.ts`, `parseAdsStat.ts`, `parseAsinStat.ts`)
4. **관리자 계정 API** (`src/app/api/admin/accounts/amazon/route.ts`)
5. **업로드 API** (`src/app/api/dashboard/daily/amazon-upload/route.ts`)
6. **일별 조회 API 수정** (`src/app/api/dashboard/daily/route.ts`)
7. **공통 데이터 로더 수정** (`src/lib/supabase/fetch-common-data.ts`)
8. **UI 컴포넌트**: 필터바 수정, 업로드 영역, 테이블 2개, daily-shell 수정
9. **관리자 계정 관리 페이지** 추가

---

## 9. 참고 파일 (기존 쇼피 구현)

| 용도 | 파일 경로 |
|------|----------|
| 쇼핑몰 파서 | `src/lib/shopee/parseShoppingStat.ts` |
| 인앱 파서 | `src/lib/shopee/parseInappStat.ts` |
| 업로드 API | `src/app/api/dashboard/daily/shopee-upload/route.ts` |
| 일별 조회 API | `src/app/api/dashboard/daily/route.ts` |
| 계정 관리 API | `src/app/api/admin/accounts/shopee/route.ts` |
| 업로드 UI | `src/components/dashboard/daily/shopee-upload-area.tsx` |
| 쇼핑몰 테이블 | `src/components/dashboard/daily/shopee-shopping-table.tsx` |
| 인앱 테이블 | `src/components/dashboard/daily/shopee-inapp-table.tsx` |
| 필터바 | `src/components/dashboard/daily/daily-filter-bar.tsx` |
| 메인 셸 | `src/components/dashboard/daily/daily-shell.tsx` |
| 공통 데이터 | `src/lib/supabase/fetch-common-data.ts` |
| 타입 정의 | `src/types/database.ts` |
| 마이그레이션 (참고) | `supabase/migrations/007_add_shopee_tables.sql` |
| 마이그레이션 (참고) | `supabase/migrations/008_update_shopee_tables.sql` |

---

## 10. 중요 주의사항

1. **파일명 검증은 서버 사이드**에서 반드시 수행 (프론트에서도 힌트 표시)
2. **CSV 파싱 시 RFC 4180** 준수 (제목 필드에 콤마, 큰따옴표 포함 가능)
3. **날짜 형식이 두 가지**: 오가닉/ASIN은 `YY. M. D.`, 광고는 `YYYY. M. D.`
4. **광고 데이터는 검색어별/캠페인별 행** → 반드시 날짜별 SUM 집계 후 DB 저장
5. **upsert 사용**: 같은 날짜 데이터 재업로드 시 갱신 (쇼피와 동일)
6. **환율 변환 불필요**: 아마존은 USD 기준이므로 KRW 변환 로직은 일단 미구현 (추후 필요 시 추가)
