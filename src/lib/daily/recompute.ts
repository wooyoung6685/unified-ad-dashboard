// 일별 데이터 관리자 직접 수정 시 파생 지표 재계산 헬퍼

// ── Meta ────────────────────────────────────────────────────────────────────

/** 관리자가 직접 수정할 수 있는 Meta raw 필드 목록 */
export const META_EDITABLE_FIELDS = [
  'spend',
  'impressions',
  'reach',
  'clicks',
  'inline_link_clicks',
  'purchases',
  'revenue',
  'add_to_cart',
  'add_to_cart_value',
  'content_views',
  'outbound_clicks',
] as const

export type MetaEditableFields = {
  spend: number | null
  impressions: number | null
  reach: number | null
  clicks: number | null
  inline_link_clicks: number | null
  purchases: number | null
  revenue: number | null
  add_to_cart: number | null
  add_to_cart_value: number | null
  content_views: number | null
  outbound_clicks: number | null
}

type MetaComputedFields = {
  ctr: number | null
  cpc: number | null
  cpa: number | null
  conversion_rate: number | null
  avg_order_value: number | null
  roas: number | null
  cpm: number | null
  frequency: number | null
  cost_per_add_to_cart: number | null
  cost_per_content_view: number | null
  cost_per_outbound_click: number | null
}

function divOrNull(n: number | null, d: number | null): number | null {
  if (n == null || d == null || d === 0) return null
  return n / d
}

/** raw 필드로부터 Meta 파생 지표를 재계산한다 (fetchStats.ts 공식과 동일) */
export function recomputeMetaRow(raw: MetaEditableFields): MetaComputedFields {
  const { spend, impressions, reach, clicks, inline_link_clicks, purchases, revenue, add_to_cart, content_views, outbound_clicks } = raw

  // CTR/CPC는 inline_link_clicks 기준 (Meta 고유 기준)
  const ctr =
    inline_link_clicks != null && inline_link_clicks > 0 && impressions != null && impressions > 0
      ? (inline_link_clicks / impressions) * 100
      : null

  const cpc =
    inline_link_clicks != null && inline_link_clicks > 0 && spend != null
      ? spend / inline_link_clicks
      : null

  const cpa = divOrNull(spend, purchases)
  const conversion_rate =
    clicks != null && clicks > 0 && purchases != null
      ? (purchases / clicks) * 100
      : null
  const avg_order_value = divOrNull(revenue, purchases)
  const roas = spend != null && spend > 0 && revenue != null ? revenue / spend : null
  const cpm = impressions != null && impressions > 0 && spend != null ? (spend / impressions) * 1000 : null
  const frequency = divOrNull(impressions, reach)
  const cost_per_add_to_cart = divOrNull(spend, add_to_cart)
  const cost_per_content_view = divOrNull(spend, content_views)
  const cost_per_outbound_click = divOrNull(spend, outbound_clicks)

  return {
    ctr,
    cpc,
    cpa,
    conversion_rate,
    avg_order_value,
    roas,
    cpm,
    frequency,
    cost_per_add_to_cart,
    cost_per_content_view,
    cost_per_outbound_click,
  }
}

// ── Shopee 쇼핑몰 ───────────────────────────────────────────────────────────

/** 관리자가 직접 수정할 수 있는 Shopee 쇼핑몰 raw 필드 목록 */
export const SHOPEE_SHOPPING_EDITABLE_FIELDS = [
  'sales',
  'sales_without_rebate',
  'orders',
  'sales_per_order',
  'product_clicks',
  'visitors',
  'order_conversion_rate',
  'cancelled_orders',
  'cancelled_sales',
  'refunded_orders',
  'refunded_sales',
  'buyers',
  'new_buyers',
  'existing_buyers',
  'potential_buyers',
  'repeat_purchase_rate',
] as const

export type ShopeeShoppingEditableFields = {
  sales: number | null
  sales_without_rebate: number | null
  orders: number | null
  sales_per_order: number | null
  product_clicks: number | null
  visitors: number | null
  order_conversion_rate: number | null
  cancelled_orders: number | null
  cancelled_sales: number | null
  refunded_orders: number | null
  refunded_sales: number | null
  buyers: number | null
  new_buyers: number | null
  existing_buyers: number | null
  potential_buyers: number | null
  repeat_purchase_rate: number | null
}

type ShopeeShoppingKrwFields = {
  sales_krw: number | null
  sales_without_rebate_krw: number | null
  cancelled_sales_krw: number | null
  refunded_sales_krw: number | null
  sales_per_order_krw: number | null
}

/** raw 필드와 환율로 Shopee 쇼핑몰 _krw 파생 필드를 재계산한다 (parseShoppingStat.ts 공식과 동일) */
export function recomputeShopeeShoppingKrw(
  raw: ShopeeShoppingEditableFields,
  rate: number | null,
): ShopeeShoppingKrwFields {
  if (rate == null) {
    return {
      sales_krw: null,
      sales_without_rebate_krw: null,
      cancelled_sales_krw: null,
      refunded_sales_krw: null,
      sales_per_order_krw: null,
    }
  }
  return {
    sales_krw: raw.sales != null ? raw.sales * rate : null,
    sales_without_rebate_krw: raw.sales_without_rebate != null ? raw.sales_without_rebate * rate : null,
    cancelled_sales_krw: raw.cancelled_sales != null ? raw.cancelled_sales * rate : null,
    refunded_sales_krw: raw.refunded_sales != null ? raw.refunded_sales * rate : null,
    sales_per_order_krw: raw.sales_per_order != null ? raw.sales_per_order * rate : null,
  }
}
