import type {
  MetaMonthlyData,
  MetaCampaignData,
  MetaAdsetData,
  ShopeeMonthlyData,
  TiktokMonthlyData,
} from '@/types/database'

// ── 공통 유틸 ──────────────────────────────────────────────────────────────

export function divOrNull(n: number, d: number): number | null {
  return d > 0 ? n / d : null
}

export function sumRows(arr: (number | null | undefined)[]): number {
  return arr.reduce<number>((acc, v) => acc + (v ?? 0), 0)
}

// ── Meta ───────────────────────────────────────────────────────────────────

export type MetaDailyRow = {
  date: string
  spend: number | null
  revenue: number | null
  impressions: number | null
  reach: number | null
  clicks: number | null
  purchases: number | null
  add_to_cart: number | null
  add_to_cart_value: number | null
}

// prev_ 필드가 없는 중간 타입
export type MetaCampaignCurrent = Omit<
  MetaCampaignData,
  | 'prev_spend'
  | 'prev_revenue'
  | 'prev_roas'
  | 'prev_purchases'
  | 'prev_impressions'
  | 'prev_reach'
  | 'prev_frequency'
  | 'prev_cpm'
  | 'prev_clicks'
  | 'prev_ctr'
  | 'prev_cpc'
  | 'prev_add_to_cart'
  | 'prev_cost_per_add_to_cart'
>

export type MetaAdsetCurrent = Omit<
  MetaAdsetData,
  | 'prev_spend'
  | 'prev_revenue'
  | 'prev_roas'
  | 'prev_purchases'
  | 'prev_impressions'
  | 'prev_reach'
  | 'prev_frequency'
  | 'prev_cpm'
  | 'prev_clicks'
  | 'prev_ctr'
  | 'prev_cpc'
  | 'prev_add_to_cart'
  | 'prev_cost_per_add_to_cart'
>

function calcMetaAgg(rows: MetaDailyRow[]) {
  const spend = sumRows(rows.map((r) => r.spend))
  const revenue = sumRows(rows.map((r) => r.revenue))
  const impressions = sumRows(rows.map((r) => r.impressions))
  const reach = sumRows(rows.map((r) => r.reach))
  const clicks = sumRows(rows.map((r) => r.clicks))
  const purchases = sumRows(rows.map((r) => r.purchases))
  const add_to_cart = sumRows(rows.map((r) => r.add_to_cart))
  return {
    spend: spend || null,
    revenue: revenue || null,
    roas: divOrNull(revenue * 100, spend),
    purchases: purchases || null,
    impressions: impressions || null,
    reach: reach || null,
    frequency: divOrNull(impressions, reach),
    cpm: divOrNull(spend * 1000, impressions),
    clicks: clicks || null,
    ctr: divOrNull(clicks * 100, impressions),
    cpc: divOrNull(spend, clicks),
    add_to_cart: add_to_cart || null,
    cost_per_add_to_cart: divOrNull(spend, add_to_cart),
  }
}

export function aggregateMetaMonthly(
  rows: MetaDailyRow[],
  prevRows: MetaDailyRow[],
): MetaMonthlyData {
  const cur = calcMetaAgg(rows)
  const prev = calcMetaAgg(prevRows)
  return {
    ...cur,
    prev_spend: prev.spend,
    prev_revenue: prev.revenue,
    prev_roas: prev.roas,
    prev_purchases: prev.purchases,
    prev_impressions: prev.impressions,
    prev_reach: prev.reach,
    prev_frequency: prev.frequency,
    prev_cpm: prev.cpm,
    prev_clicks: prev.clicks,
    prev_ctr: prev.ctr,
    prev_cpc: prev.cpc,
    prev_add_to_cart: prev.add_to_cart,
    prev_cost_per_add_to_cart: prev.cost_per_add_to_cart,
  }
}

// ── Shopee Inapp ───────────────────────────────────────────────────────────

export type ShopeeInappRow = {
  date: string
  ads_type: string
  expense_krw: number | null
  gmv_krw: number | null
  conversions: number | null
  clicks: number | null
  impressions: number | null
  items_sold?: number | null
}

export type ShopeeShoppingRow = {
  date: string
  sales_krw: number | null
  orders: number | null
  product_clicks: number | null
  visitors: number | null
  buyers: number | null
  new_buyers: number | null
  existing_buyers: number | null
}

export type MetaSpendRow = {
  date: string
  spend: number | null
}

// 기존 calcShopeeAgg는 주간/breakdown 계산에 계속 사용
function calcShopeeAgg(rows: ShopeeInappRow[]) {
  const spend_krw = sumRows(rows.map((r) => r.expense_krw))
  const revenue_krw = sumRows(rows.map((r) => r.gmv_krw))
  const purchases = sumRows(rows.map((r) => r.conversions))
  const clicks = sumRows(rows.map((r) => r.clicks))
  const impressions = sumRows(rows.map((r) => r.impressions))
  return {
    spend_krw: spend_krw || null,
    revenue_krw: revenue_krw || null,
    roas: divOrNull(revenue_krw * 100, spend_krw),
    purchases: purchases || null,
    conversion_rate: divOrNull(purchases * 100, clicks),
    impressions: impressions || null,
    clicks: clicks || null,
    cpc_krw: divOrNull(spend_krw, clicks),
    ctr: divOrNull(clicks * 100, impressions),
  }
}

function calcShopeeMonthlyAgg(
  shoppingRows: ShopeeShoppingRow[],
  inappRows: ShopeeInappRow[],
  metaRows: MetaSpendRow[],
) {
  const sales_krw = sumRows(shoppingRows.map((r) => r.sales_krw))
  const orders = sumRows(shoppingRows.map((r) => r.orders))
  const product_clicks = sumRows(shoppingRows.map((r) => r.product_clicks))
  const visitors = sumRows(shoppingRows.map((r) => r.visitors))
  const buyers = sumRows(shoppingRows.map((r) => r.buyers))
  const new_buyers = sumRows(shoppingRows.map((r) => r.new_buyers))
  const existing_buyers = sumRows(shoppingRows.map((r) => r.existing_buyers))
  const units_sold = sumRows(inappRows.map((r) => r.items_sold))
  const ad_spend_inapp_krw = sumRows(inappRows.map((r) => r.expense_krw))
  const ad_spend_meta = sumRows(metaRows.map((r) => r.spend))
  return {
    sales_krw: sales_krw || null,
    orders: orders || null,
    product_clicks: product_clicks || null,
    visitors: visitors || null,
    cvr: divOrNull(orders * 100, visitors),
    units_sold: units_sold || null,
    sales_per_buyer: divOrNull(sales_krw, buyers),
    new_buyers: new_buyers || null,
    existing_buyers: existing_buyers || null,
    ad_spend_inapp_krw: ad_spend_inapp_krw || null,
    ad_spend_meta: ad_spend_meta || null,
  }
}

export function aggregateShopeeMonthly(
  curShopping: ShopeeShoppingRow[],
  prevShopping: ShopeeShoppingRow[],
  curInapp: ShopeeInappRow[],
  prevInapp: ShopeeInappRow[],
  curMeta: MetaSpendRow[],
  prevMeta: MetaSpendRow[],
): ShopeeMonthlyData {
  const cur = calcShopeeMonthlyAgg(curShopping, curInapp, curMeta)
  const prev = calcShopeeMonthlyAgg(prevShopping, prevInapp, prevMeta)
  return {
    ...cur,
    prev_sales_krw: prev.sales_krw,
    prev_orders: prev.orders,
    prev_product_clicks: prev.product_clicks,
    prev_visitors: prev.visitors,
    prev_cvr: prev.cvr,
    prev_units_sold: prev.units_sold,
    prev_sales_per_buyer: prev.sales_per_buyer,
    prev_new_buyers: prev.new_buyers,
    prev_existing_buyers: prev.existing_buyers,
    prev_ad_spend_inapp_krw: prev.ad_spend_inapp_krw,
    prev_ad_spend_meta: prev.ad_spend_meta,
  }
}

// ── TikTok ─────────────────────────────────────────────────────────────────

export type TiktokDailyRow = {
  date: string
  spend: number | null
  revenue: number | null
  impressions: number | null
  reach: number | null
  clicks: number | null
  purchases: number | null
  video_views: number | null
  views_2s: number | null
  views_6s: number | null
  views_25pct: number | null
  views_100pct: number | null
  add_to_cart: number | null
  add_to_cart_value: number | null
}

function calcTiktokAgg(rows: TiktokDailyRow[]) {
  const spend = sumRows(rows.map((r) => r.spend))
  const revenue = sumRows(rows.map((r) => r.revenue))
  const impressions = sumRows(rows.map((r) => r.impressions))
  const reach = sumRows(rows.map((r) => r.reach))
  const clicks = sumRows(rows.map((r) => r.clicks))
  const purchases = sumRows(rows.map((r) => r.purchases))
  const video_views = sumRows(rows.map((r) => r.video_views))
  const views_2s = sumRows(rows.map((r) => r.views_2s))
  const views_6s = sumRows(rows.map((r) => r.views_6s))
  const views_25pct = sumRows(rows.map((r) => r.views_25pct))
  const views_100pct = sumRows(rows.map((r) => r.views_100pct))
  const add_to_cart = sumRows(rows.map((r) => r.add_to_cart))
  const add_to_cart_value = sumRows(rows.map((r) => r.add_to_cart_value))
  return {
    spend: spend || null,
    revenue: revenue || null,
    roas: divOrNull(revenue * 100, spend),
    purchases: purchases || null,
    impressions: impressions || null,
    reach: reach || null,
    frequency: divOrNull(impressions, reach),
    clicks: clicks || null,
    ctr: divOrNull(clicks * 100, impressions),
    cpc: divOrNull(spend, clicks),
    cpm: divOrNull(spend * 1000, impressions),
    video_views: video_views || null,
    views_2s: views_2s || null,
    views_6s: views_6s || null,
    views_25pct: views_25pct || null,
    views_100pct: views_100pct || null,
    add_to_cart: add_to_cart || null,
    add_to_cart_value: add_to_cart_value || null,
  }
}

export function aggregateTiktokMonthly(
  rows: TiktokDailyRow[],
  prevRows: TiktokDailyRow[],
): TiktokMonthlyData {
  const cur = calcTiktokAgg(rows)
  const prev = calcTiktokAgg(prevRows)
  return {
    ...cur,
    prev_spend: prev.spend,
    prev_revenue: prev.revenue,
    prev_roas: prev.roas,
    prev_purchases: prev.purchases,
    prev_impressions: prev.impressions,
    prev_reach: prev.reach,
    prev_frequency: prev.frequency,
    prev_clicks: prev.clicks,
    prev_ctr: prev.ctr,
    prev_cpc: prev.cpc,
    prev_cpm: prev.cpm,
    prev_video_views: prev.video_views,
    prev_views_2s: prev.views_2s,
    prev_views_6s: prev.views_6s,
    prev_views_25pct: prev.views_25pct,
    prev_views_100pct: prev.views_100pct,
  }
}

// ── GMV Max ────────────────────────────────────────────────────────────────

type GmvMaxDailyInput = {
  date: string
  cost: number | null
  gross_revenue: number | null
  orders: number | null
}

function calcGmvMaxAgg(rows: GmvMaxDailyInput[]) {
  const cost = sumRows(rows.map((r) => r.cost))
  const gross_revenue = sumRows(rows.map((r) => r.gross_revenue))
  const orders = sumRows(rows.map((r) => r.orders))
  return {
    cost: cost || null,
    gross_revenue: gross_revenue || null,
    roi: divOrNull(gross_revenue * 100, cost),
    orders: orders || null,
    cost_per_order: divOrNull(cost, orders),
  }
}

export function aggregateGmvMaxMonthly(
  rows: GmvMaxDailyInput[],
  prevRows: GmvMaxDailyInput[],
) {
  const cur = calcGmvMaxAgg(rows)
  const prev = calcGmvMaxAgg(prevRows)
  return {
    ...cur,
    prev_cost: prev.cost,
    prev_gross_revenue: prev.gross_revenue,
    prev_roi: prev.roi,
    prev_orders: prev.orders,
    prev_cost_per_order: prev.cost_per_order,
  }
}
