# 아마존 대시보드 (요약 페이지) 구현 프롬프트

## 개요

기존 Meta/TikTok/Shopee 대시보드 요약 페이지와 동일한 패턴으로 **아마존(Amazon)** 대시보드를 구현해줘.

아마존은 **검색 기반 마켓플레이스**라서 Meta(디스커버리 광고)나 TikTok(소셜 광고)와는 성격이 다르다.
아마존에서 가장 중요한 지표는 **ACoS(Advertising Cost of Sales)**, **TACoS(Total Advertising Cost of Sales)**, **전환율**, **바이박스 비율** 등이다.

대시보드는 쇼피처럼 **오가닉 섹션 + 광고 섹션**을 세로로 나란히 배치하되, 상단에 **통합 핵심 지표(TACoS 등)**를 추가로 보여줘야 한다.

---

## 1. 아마존 대시보드 전체 구조

```
┌─────────────────────────────────────────────┐
│  필터 바 (브랜드 / 계정 / 기간)              │
├─────────────────────────────────────────────┤
│  🔗 통합 핵심 지표 (Combined KPIs)          │  ← 오가닉+광고 합산 지표
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│  │TACoS│ │총매출│ │광고비│ │광고비│               │
│  │    │ │    │ │비중 │ │    │               │
│  └────┘ └────┘ └────┘ └────┘               │
├─────────────────────────────────────────────┤
│  📦 오가닉 (Organic)                        │
│  ┌ KPI 효율 ─────────────────────────────┐  │
│  │ 전환율 │ AOV │ 바이박스% │              │  │
│  └──────────────────────────────────────┘  │
│  ┌ KPI 원본 ─────────────────────────────┐  │
│  │ 매출 │ 주문수 │ 세션수 │ 페이지뷰 │     │  │
│  └──────────────────────────────────────┘  │
│  ┌ 일별 추이 차트 ──────────────────────┐  │
│  │  LineChart (선택된 지표 최대 3개)      │  │
│  └──────────────────────────────────────┘  │
│  ┌ 성과 분석 그래프 ─── 2열 그리드 ────┐  │
│  │ [세션 퍼널]       [전환율 추이]       │  │
│  └──────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│  📢 광고 (Sponsored Ads)                    │
│  ┌ KPI 효율 ─────────────────────────────┐  │
│  │ ACoS │ ROAS │ CPC │ CTR │             │  │
│  └──────────────────────────────────────┘  │
│  ┌ KPI 원본 ─────────────────────────────┐  │
│  │ 광고비 │ 광고매출 │ 구매수 │ 노출수 │   │  │
│  │ 클릭수 │ 신규고객구매 │               │  │
│  └──────────────────────────────────────┘  │
│  ┌ 일별 추이 차트 ──────────────────────┐  │
│  │  LineChart (선택된 지표 최대 3개)      │  │
│  └──────────────────────────────────────┘  │
│  ┌ 성과 분석 그래프 ─── 2열 그리드 ────┐  │
│  │ [광고 효율]         [ROAS 스케일링]   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 2. Summary API 수정

### 2-1. summary/route.ts에 amazon 분기 추가

파일 경로: `src/app/api/dashboard/summary/route.ts`

기존 shopee 분기 패턴을 참고하여 amazon 분기를 추가한다.

**accountType 타입 확장:**
```typescript
const accountType = searchParams.get('account_type') as
  | 'meta'
  | 'tiktok'
  | 'shopee'
  | 'amazon'      // ← 추가
  | 'amazon_organic'
  | 'amazon_ads'
  | null
```

**Amazon 분기 로직 (shopee 분기 참고):**

```typescript
} else if (accountType === 'amazon' || accountType === 'amazon_organic' || accountType === 'amazon_ads' || accountType === 'amazon_asin') {
  // 1. amazon_accounts에서 account_id 획득
  const { data: refAcct } = await supabase
    .from('amazon_accounts')
    .select('account_id, brand_id')
    .eq('id', accountId)
    .single()

  // 2. 같은 account_id의 organic/ads 계정 ID 조회
  const organicIds = ...
  const adsIds = ...

  // 3. 오가닉 데이터 조회 + 변환
  // 4. 광고 데이터 조회 + 변환
  // 5. 통합 지표 계산 (TACoS 등)

  return NextResponse.json({
    platform: 'amazon',
    // 오가닉 섹션
    organicDailyData: SummaryDayData[],
    organicTotals: SummaryTotals,
    // 광고 섹션
    adsDailyData: AmazonAdsSummaryDayData[],
    adsTotals: AmazonAdsSummaryTotals,
    // 통합 지표
    combinedTotals: AmazonCombinedTotals,
    // 메타정보
    amazonExtra: { currency: string }
  })
}
```

### 2-2. 오가닉 데이터 변환 로직

`amazon_organic_stats` 테이블에서 조회하여 `SummaryDayData` 형태로 변환:

```typescript
// 매핑 규칙:
// spend → null (오가닉이므로 광고비 없음)
// revenue → ordered_product_sales
// purchases → orders
// impressions → sessions (아마존에서 세션 = 트래픽의 기본 단위)
// clicks → page_views (페이지뷰를 클릭 개념으로 매핑)

// 계산 지표:
// conversion_rate = orders / sessions * 100
// aov = ordered_product_sales / orders
// buy_box_percentage = 원본값 그대로
// unit_session_percentage = 원본값 그대로
```

**오가닉 totals 합산:**
- ordered_product_sales, orders, sessions, page_views → SUM
- conversion_rate, aov, buy_box_percentage → 합산 후 재계산

### 2-3. 광고 데이터 변환 로직

`amazon_ads_stats` 테이블에서 조회 (이미 날짜별 집계됨):

```typescript
// 전용 타입이 필요 (SummaryDayData와 구조가 다름)
type AmazonAdsSummaryDayData = {
  date: string
  cost: number | null          // 광고비
  sales: number | null         // 광고매출
  impressions: number | null   // 노출수
  clicks: number | null        // 클릭수
  purchases: number | null     // 구매수
  purchases_new_to_brand: number | null  // 신규 브랜드 고객 구매
  // 계산 지표
  acos: number | null          // cost / sales * 100
  roas: number | null          // sales / cost
  cpc: number | null           // cost / clicks
  ctr: number | null           // clicks / impressions * 100
  cost_per_purchase: number | null  // cost / purchases
}

type AmazonAdsSummaryTotals = Omit<AmazonAdsSummaryDayData, 'date'>
```

### 2-4. 통합 지표 계산

```typescript
type AmazonCombinedTotals = {
  total_sales: number | null           // 오가닉 매출 + 광고매출은 별도
  organic_sales: number | null         // 오가닉 매출
  ad_sales: number | null              // 광고 매출
  ad_cost: number | null               // 총 광고비
  tacos: number | null                 // ad_cost / organic_sales * 100 (Total ACoS)
  ad_sales_ratio: number | null        // ad_sales / organic_sales * 100 (광고매출 비중)
  total_orders: number | null          // 총 주문수 (오가닉 기준)
  total_sessions: number | null        // 총 세션수
}
```

**TACoS 계산:**
```
TACoS = 총 광고비 / 총 오가닉 매출 × 100
```
- TACoS가 낮을수록 좋음 (광고비 대비 전체 매출이 크다는 의미)
- 아마존 셀러에게 가장 중요한 통합 지표

---

## 3. TypeScript 타입 추가

`src/types/database.ts`에 추가:

```typescript
// ── Amazon Dashboard ──────────────────────────

// 광고 요약 일별 데이터
export type AmazonAdsSummaryDayData = {
  date: string
  cost: number | null
  sales: number | null
  impressions: number | null
  clicks: number | null
  purchases: number | null
  purchases_new_to_brand: number | null
  acos: number | null
  roas: number | null
  cpc: number | null
  ctr: number | null
  cost_per_purchase: number | null
}

export type AmazonAdsSummaryTotals = Omit<AmazonAdsSummaryDayData, 'date'>

// 통합 핵심 지표
export type AmazonCombinedTotals = {
  total_sales: number | null
  organic_sales: number | null
  ad_sales: number | null
  ad_cost: number | null
  tacos: number | null
  ad_sales_ratio: number | null
  total_orders: number | null
  total_sessions: number | null
}

// Summary API 응답 타입 확장
// 기존 SummaryResponse 유니온에 amazon 추가:
// | {
//     platform: 'amazon'
//     dailyData: SummaryDayData[]    // 오가닉 (하위호환용)
//     totals: SummaryTotals           // 오가닉 (하위호환용)
//     organicDailyData: SummaryDayData[]
//     organicTotals: SummaryTotals
//     adsDailyData: AmazonAdsSummaryDayData[]
//     adsTotals: AmazonAdsSummaryTotals
//     combinedTotals: AmazonCombinedTotals
//     amazonExtra: { currency: string }
//   }
```

---

## 4. KPI 지표 정의

### 4-1. 통합 핵심 지표 (Combined KPIs)

이것은 **기존 KpiSection과 별도**로 만들어야 한다.
`amazon-combined-kpi.tsx` 컴포넌트로 구현한다.

```
표시할 지표:
┌──────────┬──────────────────┬────────────────────────────────────────┐
│ 지표     │ 값 예시          │ 설명                                  │
├──────────┼──────────────────┼────────────────────────────────────────┤
│ TACoS    │ 12.5%            │ 총 광고비 / 오가닉 총 매출 × 100     │
│ 총 매출  │ $26,262.93       │ 오가닉 ordered_product_sales 합산     │
│ 총 광고비│ $3,280.50        │ 광고 cost 합산                       │
│ 광고매출 │ $8,450.00        │ 광고 sales 합산                      │
│ 비중     │ 32.2%            │ 광고매출 / 오가닉매출 × 100          │
│ 총 주문수│ 1,233            │ 오가닉 orders 합산                   │
│ 총 세션수│ 68,193           │ 오가닉 sessions 합산                 │
└──────────┴──────────────────┴────────────────────────────────────────┘
```

**디자인:**
- 가로 스크롤 가능한 카드 형태
- 배경색을 약간 다르게 (예: 연한 파란 배경) 해서 오가닉/광고 섹션과 시각적으로 구분
- KpiBox와 유사하지만 선택 기능 없음 (표시 전용)

### 4-2. 오가닉 효율 지표 (KpiSection에 추가)

`kpi-section.tsx`에 `AMAZON_ORGANIC_EFFICIENCY`, `AMAZON_ORGANIC_RAW` 추가:

```typescript
// Amazon 오가닉 효율 지표 (3개)
const AMAZON_ORGANIC_EFFICIENCY: MetricDef[] = [
  { key: 'order_conversion_rate', label: '전환율', format: 'percent', icon: RefreshCw },
  { key: 'aov', label: 'AOV (객단가)', format: 'currency', icon: Banknote },
  { key: 'buy_box_percentage', label: '바이박스 비율', format: 'percent', icon: TrendingUp },
]

// Amazon 오가닉 원본 지표 (5개)
const AMAZON_ORGANIC_RAW: MetricDef[] = [
  { key: 'revenue', label: '총 매출', format: 'currency' },
  { key: 'purchases', label: '주문수', format: 'number' },
  { key: 'impressions', label: '세션수', format: 'number' },
  { key: 'clicks', label: '페이지뷰', format: 'number' },
  { key: 'unit_session_percentage', label: '상품 세션 비율', format: 'percent' },
]
```

**주의:**
- `format: 'currency'`에서 아마존은 KRW가 아닌 **USD** 표시
- 통화 표시를 위해 `amazonExtra: { currency: 'USD' }` 전달 필요
- formatValue 함수에서 amazon용 통화 처리 추가 필요:
  ```typescript
  case 'currency':
    if (opts?.isAmazon && opts.currency) {
      return `${opts.currency} ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    // ... 기존 KRW 로직
  ```

### 4-3. 광고 효율 지표

**별도 KPI 컴포넌트 또는 KpiSection 확장:**

```typescript
// Amazon 광고 효율 지표 (4개)
const AMAZON_ADS_EFFICIENCY: MetricDef[] = [
  { key: 'acos', label: 'ACoS', format: 'percent', icon: TrendingUp },
  { key: 'roas', label: 'ROAS', format: 'number2', icon: TrendingUp },
  { key: 'cpc', label: 'CPC', format: 'currency', icon: DollarSign },
  { key: 'ctr', label: 'CTR', format: 'percent', icon: MousePointer },
]

// Amazon 광고 원본 지표 (6개)
const AMAZON_ADS_RAW: MetricDef[] = [
  { key: 'cost', label: '광고비', format: 'currency' },
  { key: 'sales', label: '광고매출', format: 'currency' },
  { key: 'purchases', label: '구매수', format: 'number' },
  { key: 'purchases_new_to_brand', label: '신규고객 구매', format: 'number' },
  { key: 'impressions', label: '노출수', format: 'number' },
  { key: 'clicks', label: '클릭수', format: 'number' },
]
```

---

## 5. 분석 차트 구현

### 5-1. 오가닉 분석 차트 (2개)

파일: `src/components/dashboard/summary/amazon-organic-analytics-charts.tsx`

**차트 1: 세션 퍼널 (Session Funnel)**
- Meta의 퍼널 차트(`analysis-charts.tsx`의 `CustomFunnel`) 재활용
- 단계: 세션(Sessions) → 페이지뷰(Page Views) → 주문(Orders)
- 3단계 퍼널 (Meta는 4단계)

```typescript
const funnelSteps = [
  { key: 'sessions', label: '세션' },
  { key: 'page_views', label: '페이지뷰' },
  { key: 'orders', label: '주문' },
]
```

**차트 2: 전환율 & AOV 추이**
- ComposedChart (Recharts)
- X축: 날짜
- Bar: 주문수 (좌축)
- Line 1: 전환율 % (우축)
- Line 2: AOV $ (우축)

```typescript
// 데이터 구조:
const chartData = organicDailyData.map(d => ({
  date: d.date.slice(5),
  orders: d.purchases,
  conversion_rate: d.order_conversion_rate,
  aov: d.aov,
}))
```

### 5-2. 광고 분석 차트 (2개)

파일: `src/components/dashboard/summary/amazon-ads-analytics-charts.tsx`

**차트 1: 광고 효율 (Cost Efficiency)**
- ComposedChart
- X축: 날짜
- Bar 1: 광고비 (좌축)
- Bar 2: 광고매출 (좌축)
- Line: ACoS % (우축)

```typescript
const costData = adsDailyData.map(d => ({
  date: d.date.slice(5),
  cost: d.cost,
  sales: d.sales,
  acos: d.acos,
}))
```

**차트 2: ROAS 스케일링**
- ComposedChart
- X축: 날짜
- Bar: 구매수 (좌축)
- Line 1: ROAS (우축)
- Line 2: CPC (우축)

```typescript
const roasData = adsDailyData.map(d => ({
  date: d.date.slice(5),
  purchases: d.purchases,
  roas: d.roas,
  cpc: d.cpc,
}))
```

---

## 6. SummaryShell 수정

파일: `src/components/dashboard/summary/summary-shell.tsx`

### 6-1. amazonAccounts 추가

```typescript
const { role, initialBrandId, brands, metaAccounts, tiktokAccounts, shopeeAccounts, amazonAccounts } =
  useDashboardData()
```

### 6-2. 계정 타입 변경 시 기본 지표

```typescript
// amazon 계열 기본 지표
const defaultMetrics =
  (newFilters.accountType === 'amazon_organic' || newFilters.accountType === 'amazon_ads' || newFilters.accountType === 'amazon_asin')
    ? ['revenue', 'purchases']
    : ...기존 로직
```

### 6-3. Amazon 렌더링 분기

기존 `shopee` 분기 아래에 amazon 분기 추가:

```tsx
) : (filters.accountType === 'amazon_organic' || filters.accountType === 'amazon_ads' || filters.accountType === 'amazon_asin') ? (
  <>
    {/* 데이터 없음 안내 */}
    {!data && !isFetching && (
      <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
        계정을 선택하고 조회하기 버튼을 눌러주세요
      </div>
    )}

    {data && data.platform === 'amazon' && (
      <div className="space-y-8">
        {/* 1. 통합 핵심 지표 */}
        <AmazonCombinedKpi totals={data.combinedTotals} currency={data.amazonExtra?.currency} />

        {/* 2. 오가닉 섹션 */}
        <div className="space-y-6">
          <h2 className="text-base font-semibold">📦 오가닉 (Organic)</h2>
          <KpiSection
            totals={data.organicTotals}
            accountType="amazon_organic"
            selectedMetrics={selectedMetrics}
            onSelect={handleMetricSelect}
            isLoading={isFetching}
            amazonExtra={data.amazonExtra}
          />
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              일별 추이
            </h3>
            <div className="bg-card rounded-lg border p-4">
              <SummaryChart
                data={data.organicDailyData}
                selectedMetrics={selectedMetrics}
                platform="amazon_organic"
              />
            </div>
          </div>
          <AmazonOrganicAnalyticsCharts data={data.organicDailyData} />
        </div>

        {/* 3. 광고 섹션 */}
        <div className="space-y-6">
          <h2 className="text-base font-semibold">📢 광고 (Sponsored Ads)</h2>
          <AmazonAdsKpiSection
            totals={data.adsTotals}
            selectedMetrics={selectedAdsMetrics}
            onSelect={handleAdsMetricSelect}
            isLoading={isFetching}
            currency={data.amazonExtra?.currency}
          />
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              일별 추이
            </h3>
            <div className="bg-card rounded-lg border p-4">
              <AmazonAdsSummaryChart
                data={data.adsDailyData}
                selectedMetrics={selectedAdsMetrics}
              />
            </div>
          </div>
          <AmazonAdsAnalyticsCharts data={data.adsDailyData} />
        </div>
      </div>
    )}
  </>
```

**주의:** 아마존은 오가닉/광고 각각 별도의 selectedMetrics 상태가 필요할 수 있다.
간단하게는 하나의 selectedMetrics로 오가닉 차트만 제어하고, 광고 차트는 별도 상태를 사용.

```typescript
const [selectedAdsMetrics, setSelectedAdsMetrics] = useState<string[]>(['cost', 'sales', 'acos'])
```

---

## 7. SummaryFilterBar 수정

파일: `src/components/dashboard/summary/summary-filter-bar.tsx`

아마존 계정을 필터바에 추가 (daily-filter-bar.tsx 수정한 것과 동일 패턴):

```typescript
// amazonAccounts prop 추가
// amazonOptions 생성 (organic 행 우선 중복 제거)
// allOptions에 amazonOptions 합치기
```

---

## 8. 광고 전용 컴포넌트

### 8-1. AmazonAdsKpiSection (광고 KPI)

파일: `src/components/dashboard/summary/amazon-ads-kpi-section.tsx`

기존 `KpiSection`을 참고하되, `AmazonAdsSummaryTotals` 타입에 맞게 구현:

```typescript
interface AmazonAdsKpiSectionProps {
  totals: AmazonAdsSummaryTotals | null
  selectedMetrics: string[]
  onSelect: (key: string) => void
  isLoading: boolean
  currency?: string
}
```

### 8-2. AmazonAdsSummaryChart (광고 일별 차트)

파일: `src/components/dashboard/summary/amazon-ads-summary-chart.tsx`

기존 `SummaryChart`를 참고하되, `AmazonAdsSummaryDayData[]` 데이터에 맞게 구현.
- X축: 날짜
- 선택된 지표를 LineChart로 표시
- 듀얼 Y축 (format 기반 그룹핑)

### 8-3. AmazonCombinedKpi (통합 지표)

파일: `src/components/dashboard/summary/amazon-combined-kpi.tsx`

```typescript
interface AmazonCombinedKpiProps {
  totals: AmazonCombinedTotals | null
  currency?: string
}
```

**디자인:**
- 연한 파란 배경의 카드 (`bg-blue-50 border-blue-200`)
- 가로 배열 KPI 박스들 (선택 기능 없음, 표시 전용)
- 모바일에서 2열 그리드

```tsx
<div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
  <h3 className="text-xs font-semibold tracking-widest uppercase text-blue-600 mb-3">
    통합 핵심 지표 (Combined)
  </h3>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
    {/* TACoS, 총매출, 총광고비, 광고매출, 광고매출비중, 총주문수, 총세션수 */}
  </div>
</div>
```

---

## 9. SummaryChart 수정 (오가닉 차트용)

파일: `src/components/dashboard/summary/summary-chart.tsx`

`platform` prop에 `'amazon_organic'` 추가:

```typescript
interface SummaryChartProps {
  data: SummaryDayData[] | GmvMaxSummaryDayData[]
  selectedMetrics: string[]
  platform: 'meta' | 'tiktok' | 'shopee_shopping' | 'shopee_inapp' | 'amazon_organic'
}
```

`METRIC_META` 객체에 amazon_organic 전용 지표 매핑 추가:
```typescript
// 아마존 오가닉 지표별 포맷/이름 정의
// revenue → currency, purchases → number, impressions → number (세션),
// clicks → number (페이지뷰), order_conversion_rate → percent, aov → currency,
// buy_box_percentage → percent, unit_session_percentage → percent
```

**통화 처리:** 아마존은 USD이므로, 차트 Y축 tickFormatter에서 USD 포맷 적용:
```typescript
if (platform === 'amazon_organic') {
  // Y축: $ 표시 (₩ 대신)
  tickFormatter = (v) => `$${v.toLocaleString()}`
}
```

---

## 10. 신규 생성 파일 목록

| 파일 경로 | 용도 |
|----------|------|
| `src/components/dashboard/summary/amazon-combined-kpi.tsx` | 통합 핵심 지표 (TACoS 등) |
| `src/components/dashboard/summary/amazon-ads-kpi-section.tsx` | 광고 KPI 섹션 |
| `src/components/dashboard/summary/amazon-ads-summary-chart.tsx` | 광고 일별 LineChart |
| `src/components/dashboard/summary/amazon-organic-analytics-charts.tsx` | 오가닉 분석 차트 2개 |
| `src/components/dashboard/summary/amazon-ads-analytics-charts.tsx` | 광고 분석 차트 2개 |

---

## 11. 수정 파일 목록

| 파일 경로 | 수정 내용 |
|----------|----------|
| `src/app/api/dashboard/summary/route.ts` | amazon 분기 추가 |
| `src/types/database.ts` | Amazon 대시보드 관련 타입 추가 |
| `src/components/dashboard/summary/summary-shell.tsx` | amazon 렌더링 분기, amazonAccounts 추가 |
| `src/components/dashboard/summary/summary-filter-bar.tsx` | amazonAccounts 필터 옵션 추가 |
| `src/components/dashboard/summary/kpi-section.tsx` | amazon_organic 효율/원본 지표 추가, USD 통화 처리 |
| `src/components/dashboard/summary/summary-chart.tsx` | amazon_organic platform 지원, USD Y축 |

---

## 12. 참고 파일 (기존 구현)

| 용도 | 파일 경로 |
|------|----------|
| 메인 셸 | `src/components/dashboard/summary/summary-shell.tsx` |
| Summary API | `src/app/api/dashboard/summary/route.ts` |
| KPI 컴포넌트 | `src/components/dashboard/summary/kpi-section.tsx` |
| 일별 차트 | `src/components/dashboard/summary/summary-chart.tsx` |
| Meta 분석차트 | `src/components/dashboard/summary/analysis-charts.tsx` |
| TikTok 분석차트 | `src/components/dashboard/summary/tiktok-analytics-charts.tsx` |
| GMV Max 분석차트 | `src/components/dashboard/summary/gmvmax-analytics-charts.tsx` |
| 쇼피쇼핑 분석차트 | `src/components/dashboard/summary/shopee-shopping-analytics-charts.tsx` |
| 쇼피인앱 분석차트 | `src/components/dashboard/summary/shopee-inapp-analytics-charts.tsx` |
| 필터바 | `src/components/dashboard/summary/summary-filter-bar.tsx` |
| 타입 정의 | `src/types/database.ts` |
| 포맷 유틸 | `src/lib/format.ts` |
| 공통 데이터 | `src/lib/supabase/fetch-common-data.ts` (이미 amazonAccounts 추가됨) |

---

## 13. 구현 순서 권장

1. **타입 추가** — `AmazonAdsSummaryDayData`, `AmazonAdsSummaryTotals`, `AmazonCombinedTotals` (database.ts)
2. **Summary API 수정** — amazon 분기 추가 (summary/route.ts)
3. **SummaryFilterBar 수정** — amazonAccounts 옵션 추가
4. **KpiSection 수정** — amazon_organic 효율/원본 지표, USD 통화 처리
5. **SummaryChart 수정** — amazon_organic platform 지원
6. **통합 KPI 컴포넌트** — amazon-combined-kpi.tsx
7. **광고 KPI 컴포넌트** — amazon-ads-kpi-section.tsx
8. **광고 일별 차트** — amazon-ads-summary-chart.tsx
9. **오가닉 분석 차트** — amazon-organic-analytics-charts.tsx
10. **광고 분석 차트** — amazon-ads-analytics-charts.tsx
11. **SummaryShell 수정** — amazon 렌더링 분기 통합

---

## 14. 아마존 마케터 관점 핵심 포인트

1. **TACoS가 가장 중요한 통합 지표** — 광고비가 전체 매출에 미치는 영향을 한눈에 파악
2. **ACoS vs ROAS** — ACoS는 아마존 고유 지표 (광고비/광고매출×100), ROAS의 역수와 비슷하지만 아마존 셀러에게 더 직관적
3. **바이박스(Buy Box) 비율** — 아마존에서 판매의 80% 이상이 바이박스를 통해 발생, 낮으면 매출이 급감
4. **전환율** — 아마존은 구매 의도가 높은 플랫폼이므로 전환율이 Meta/TikTok보다 훨씬 높음 (보통 10-15%)
5. **세션 기반** — Meta는 노출/도달, TikTok은 조회수가 기본이지만, 아마존은 세션(Session)이 트래픽의 기본 단위
6. **신규 브랜드 고객(New-to-Brand)** — 아마존 광고의 독특한 지표, 브랜드 성장성 판단에 중요
7. **USD 통화** — 아마존 US 기준이므로 KRW 변환 없이 USD 그대로 표시
