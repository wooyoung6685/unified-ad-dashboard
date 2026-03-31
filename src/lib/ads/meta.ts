import type { MetaStatsResult } from './types'

const META_API_VERSION = 'v22.0'
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

type MetaActionItem = { action_type: string; value: string }

// actions / action_values / cost_per_action_type 배열에서 특정 action_type 값 추출
function findAction(arr: MetaActionItem[] | undefined, actionType: string): number | null {
  if (!arr) return null
  const item = arr.find((a) => a.action_type === actionType)
  return item ? parseFloat(item.value) : null
}

export async function fetchMetaStats(
  accountId: string,
  date: string,
  accessToken: string,
): Promise<MetaStatsResult | null> {
  try {
    const fields = [
      'spend',
      'reach',
      'impressions',
      'frequency',
      'cpm',
      'clicks',
      'cpc',
      'ctr',
      'actions',
      'action_values',
      'cost_per_action_type',
      'outbound_clicks',
      'cost_per_outbound_click',
    ].join(',')

    const params = new URLSearchParams({
      access_token: accessToken,
      fields,
      level: 'account',
      time_range: JSON.stringify({ since: date, until: date }),
    })

    const res = await fetch(`${META_BASE_URL}/act_${accountId}/insights?${params}`)

    if (!res.ok) {
      console.error(`[meta] API 오류 ${res.status} (account=${accountId}):`, await res.text())
      return null
    }

    const json = await res.json()

    // API 레벨 에러
    if (json.error) {
      console.error(`[meta] API 에러 (account=${accountId}):`, json.error)
      return null
    }

    // 해당 날짜에 데이터 없음 (광고 미집행)
    const data = json.data?.[0]
    if (!data) return null

    const spend = data.spend ? parseFloat(data.spend) : null
    const purchases = findAction(data.actions, 'purchase')
    const revenue = findAction(data.action_values, 'purchase')
    const reach = data.reach ? parseInt(data.reach) : null
    const impressions = data.impressions ? parseInt(data.impressions) : null
    const frequency = data.frequency ? parseFloat(data.frequency) : null
    const cpm = data.cpm ? parseFloat(data.cpm) : null
    const clicks = data.clicks ? parseInt(data.clicks) : null
    const cpc = data.cpc ? parseFloat(data.cpc) : null
    const ctr = data.ctr ? parseFloat(data.ctr) : null

    const contentViews = findAction(data.actions, 'view_content')
    const costPerContentView = findAction(data.cost_per_action_type, 'view_content')
    const addToCart = findAction(data.actions, 'add_to_cart')
    const costPerAddToCart = findAction(data.cost_per_action_type, 'add_to_cart')
    const addToCartValue = findAction(data.action_values, 'add_to_cart')

    // outbound_clicks / cost_per_outbound_click는 [{action_type, value}] 배열 형태
    const outboundClicks = data.outbound_clicks?.[0]?.value
      ? parseInt(data.outbound_clicks[0].value)
      : null
    const costPerOutboundClick = data.cost_per_outbound_click?.[0]?.value
      ? parseFloat(data.cost_per_outbound_click[0].value)
      : null

    // 계산 지표
    const roas = spend && spend > 0 && revenue != null ? revenue / spend : null
    const cpa = spend && spend > 0 && purchases && purchases > 0 ? spend / purchases : null
    const conversionRate =
      clicks && clicks > 0 && purchases != null ? (purchases / clicks) * 100 : null
    const avgOrderValue =
      purchases && purchases > 0 && revenue != null ? revenue / purchases : null

    return {
      spend,
      purchases,
      revenue,
      roas,
      cpa,
      conversion_rate: conversionRate,
      avg_order_value: avgOrderValue,
      reach,
      impressions,
      frequency,
      cpm,
      clicks,
      cpc,
      ctr,
      content_views: contentViews,
      cost_per_content_view: costPerContentView,
      add_to_cart: addToCart,
      cost_per_add_to_cart: costPerAddToCart,
      add_to_cart_value: addToCartValue,
      outbound_clicks: outboundClicks,
      cost_per_outbound_click: costPerOutboundClick,
    }
  } catch (err) {
    console.error(`[meta] fetchMetaStats 예외 (account=${accountId}, date=${date}):`, err)
    return null
  }
}
