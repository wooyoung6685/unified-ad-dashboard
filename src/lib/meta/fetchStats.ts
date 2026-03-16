// Meta Graph API Insights 엔드포인트 호출 → meta_daily_stats 컬럼과 1:1 매핑

export type MetaStatPayload = {
  spend: number | null
  purchases: number | null
  revenue: number | null
  roas: number | null
  cpa: number | null
  conversion_rate: number | null
  avg_order_value: number | null
  reach: number | null
  impressions: number | null
  frequency: number | null
  cpm: number | null
  clicks: number | null
  cpc: number | null
  ctr: number | null
  content_views: number | null
  cost_per_content_view: number | null
  add_to_cart: number | null
  cost_per_add_to_cart: number | null
  add_to_cart_value: number | null
  outbound_clicks: number | null
  cost_per_outbound_click: number | null
}

// action_type 우선순위 후보 (앞에 있을수록 우선)
const PURCHASE_CANDIDATES = [
  'omni_purchase',
  'purchase',
  'offsite_conversion.fb_pixel_purchase',
  'app_custom_event.fb_mobile_purchase',
]

const ADD_TO_CART_CANDIDATES = [
  'omni_add_to_cart',
  'add_to_cart',
  'offsite_conversion.fb_pixel_add_to_cart',
  'app_custom_event.fb_mobile_add_to_cart',
]

const VIEW_CONTENT_CANDIDATES = [
  'omni_view_content',
  'view_content',
  'offsite_conversion.fb_pixel_view_content',
  'app_custom_event.fb_mobile_content_view',
]

const OUTBOUND_CLICK_CANDIDATES = ['outbound_click']

type ActionEntry = { action_type: string; value: string }

// candidates 순서대로 우선 매칭하여 첫 번째 값을 반환
function findAction(
  actions: ActionEntry[] | undefined,
  candidates: string[],
): number | null {
  if (!actions) return null
  for (const candidate of candidates) {
    const found = actions.find((a) => a.action_type === candidate)
    if (found !== undefined) {
      const parsed = parseFloat(found.value)
      return isNaN(parsed) ? null : parsed
    }
  }
  return null
}

function roundOrNull(v: number | null): number | null {
  return v === null ? null : Math.round(v)
}

export async function fetchStats(params: {
  account_id: string
  access_token: string
  date: string
  api_version?: string
}): Promise<MetaStatPayload | null> {
  const { account_id, access_token, date, api_version = 'v21.0' } = params

  const fields = [
    'spend',
    'impressions',
    'reach',
    'frequency',
    'clicks',
    'cpm',
    'ctr',
    'cpc',
    'actions',
    'action_values',
    'cost_per_action_type',
  ].join(',')

  const searchParams = new URLSearchParams({
    fields,
    time_range: JSON.stringify({ since: date, until: date }),
    level: 'account',
    time_increment: '1',
    access_token,
  })

  const url = `https://graph.facebook.com/${api_version}/act_${account_id}/insights?${searchParams.toString()}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Meta API 오류: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as {
    data?: Array<{
      spend?: string
      impressions?: string
      reach?: string
      frequency?: string
      clicks?: string
      cpm?: string
      ctr?: string
      cpc?: string
      actions?: ActionEntry[]
      action_values?: ActionEntry[]
      cost_per_action_type?: ActionEntry[]
    }>
  }

  const row = data.data?.[0]
  if (!row) return null

  // 기본 지표
  const spend = row.spend ? parseFloat(row.spend) : null
  const impressions = row.impressions ? parseFloat(row.impressions) : null
  const reach = row.reach ? parseFloat(row.reach) : null
  const frequency = row.frequency ? parseFloat(row.frequency) : null
  const clicks = row.clicks ? parseFloat(row.clicks) : null
  const cpm = row.cpm ? parseFloat(row.cpm) : null
  const ctr = row.ctr ? parseFloat(row.ctr) : null
  const cpc = row.cpc ? parseFloat(row.cpc) : null

  // actions → 전환 지표 (정수로 반올림)
  const purchases = roundOrNull(findAction(row.actions, PURCHASE_CANDIDATES))
  const add_to_cart = roundOrNull(
    findAction(row.actions, ADD_TO_CART_CANDIDATES),
  )
  const content_views = roundOrNull(
    findAction(row.actions, VIEW_CONTENT_CANDIDATES),
  )
  const outbound_clicks = roundOrNull(
    findAction(row.actions, OUTBOUND_CLICK_CANDIDATES),
  )

  // action_values → 매출
  const revenue = findAction(row.action_values, PURCHASE_CANDIDATES)
  const add_to_cart_value = findAction(
    row.action_values,
    ADD_TO_CART_CANDIDATES,
  )

  // cost_per_action_type → 전환당 비용
  const cpa = findAction(row.cost_per_action_type, PURCHASE_CANDIDATES)
  const cost_per_add_to_cart = findAction(
    row.cost_per_action_type,
    ADD_TO_CART_CANDIDATES,
  )
  const cost_per_content_view = findAction(
    row.cost_per_action_type,
    VIEW_CONTENT_CANDIDATES,
  )
  const cost_per_outbound_click = findAction(
    row.cost_per_action_type,
    OUTBOUND_CLICK_CANDIDATES,
  )

  // 계산 지표
  const roas =
    spend !== null && spend > 0 && revenue !== null ? revenue / spend : null
  const conversion_rate =
    clicks !== null && clicks > 0 && purchases !== null
      ? (purchases / clicks) * 100
      : null
  const avg_order_value =
    purchases !== null && purchases > 0 && revenue !== null
      ? revenue / purchases
      : null

  return {
    spend,
    purchases,
    revenue,
    roas,
    cpa,
    conversion_rate,
    avg_order_value,
    reach,
    impressions,
    frequency,
    cpm,
    clicks,
    cpc,
    ctr,
    content_views,
    cost_per_content_view,
    add_to_cart,
    cost_per_add_to_cart,
    add_to_cart_value,
    outbound_clicks,
    cost_per_outbound_click,
  }
}
