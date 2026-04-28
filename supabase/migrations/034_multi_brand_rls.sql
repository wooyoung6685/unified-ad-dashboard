-- ============================================================
-- 034_multi_brand_rls.sql
-- 다중 브랜드 RLS: get_my_brand_ids() 도입 + 모든 SELECT 정책 교체
-- 기존 get_my_brand_id() 함수는 호환성 유지 차원에서 남겨둠
-- ============================================================

-- 신규 헬퍼: 현재 유저에게 매핑된 모든 brand_id 배열 반환
CREATE OR REPLACE FUNCTION get_my_brand_ids()
RETURNS uuid[] AS $$
  SELECT COALESCE(array_agg(brand_id), ARRAY[]::uuid[])
  FROM public.user_brands
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===== brands =====
DROP POLICY IF EXISTS "brands_select" ON public.brands;
CREATE POLICY "brands_select" ON public.brands
  FOR SELECT USING (
    id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== meta_accounts =====
DROP POLICY IF EXISTS "meta_accounts_select" ON public.meta_accounts;
CREATE POLICY "meta_accounts_select" ON public.meta_accounts
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== tiktok_accounts =====
DROP POLICY IF EXISTS "tiktok_accounts_select" ON public.tiktok_accounts;
CREATE POLICY "tiktok_accounts_select" ON public.tiktok_accounts
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== meta_daily_stats =====
DROP POLICY IF EXISTS "meta_daily_stats_select" ON public.meta_daily_stats;
CREATE POLICY "meta_daily_stats_select" ON public.meta_daily_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== tiktok_daily_stats =====
DROP POLICY IF EXISTS "tiktok_daily_stats_select" ON public.tiktok_daily_stats;
CREATE POLICY "tiktok_daily_stats_select" ON public.tiktok_daily_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== shopee_accounts =====
DROP POLICY IF EXISTS "shopee_accounts_select" ON public.shopee_accounts;
CREATE POLICY "shopee_accounts_select" ON public.shopee_accounts
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== shopee_shopping_stats (008에서 마지막 정의) =====
DROP POLICY IF EXISTS "shopee_shopping_stats_select" ON public.shopee_shopping_stats;
CREATE POLICY "shopee_shopping_stats_select" ON public.shopee_shopping_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== shopee_inapp_stats (008에서 마지막 정의) =====
DROP POLICY IF EXISTS "shopee_inapp_stats_select" ON public.shopee_inapp_stats;
CREATE POLICY "shopee_inapp_stats_select" ON public.shopee_inapp_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== reports (032에서 마지막 정의 — is_visible 조건 보존) =====
DROP POLICY IF EXISTS "reports_select" ON public.reports;
CREATE POLICY "reports_select" ON public.reports
  FOR SELECT USING (
    get_my_role() = 'admin'
    OR (brand_id = ANY(get_my_brand_ids()) AND is_visible = true)
  );

-- ===== gmv_max_daily_stats =====
DROP POLICY IF EXISTS "gmv_max_daily_stats_select" ON public.gmv_max_daily_stats;
CREATE POLICY "gmv_max_daily_stats_select" ON public.gmv_max_daily_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== amazon_accounts =====
DROP POLICY IF EXISTS "amazon_accounts_select" ON public.amazon_accounts;
CREATE POLICY "amazon_accounts_select" ON public.amazon_accounts
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== amazon_organic_stats =====
DROP POLICY IF EXISTS "amazon_organic_stats_select" ON public.amazon_organic_stats;
CREATE POLICY "amazon_organic_stats_select" ON public.amazon_organic_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== amazon_ads_stats =====
DROP POLICY IF EXISTS "amazon_ads_stats_select" ON public.amazon_ads_stats;
CREATE POLICY "amazon_ads_stats_select" ON public.amazon_ads_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== amazon_asin_stats =====
DROP POLICY IF EXISTS "amazon_asin_stats_select" ON public.amazon_asin_stats;
CREATE POLICY "amazon_asin_stats_select" ON public.amazon_asin_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== amazon_ads_keyword_stats =====
DROP POLICY IF EXISTS "amazon_ads_keyword_stats_select" ON public.amazon_ads_keyword_stats;
CREATE POLICY "amazon_ads_keyword_stats_select" ON public.amazon_ads_keyword_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== qoo10_accounts =====
DROP POLICY IF EXISTS "qoo10_accounts_select" ON public.qoo10_accounts;
CREATE POLICY "qoo10_accounts_select" ON public.qoo10_accounts
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== qoo10_ads_stats =====
DROP POLICY IF EXISTS "qoo10_ads_stats_select" ON public.qoo10_ads_stats;
CREATE POLICY "qoo10_ads_stats_select" ON public.qoo10_ads_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== qoo10_organic_visitor_stats =====
DROP POLICY IF EXISTS "qoo10_organic_visitor_stats_select" ON public.qoo10_organic_visitor_stats;
CREATE POLICY "qoo10_organic_visitor_stats_select" ON public.qoo10_organic_visitor_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== qoo10_organic_transaction_stats =====
DROP POLICY IF EXISTS "qoo10_organic_transaction_stats_select" ON public.qoo10_organic_transaction_stats;
CREATE POLICY "qoo10_organic_transaction_stats_select" ON public.qoo10_organic_transaction_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== shopee_sales_overview_stats =====
DROP POLICY IF EXISTS "shopee_sales_overview_stats_select" ON public.shopee_sales_overview_stats;
CREATE POLICY "shopee_sales_overview_stats_select" ON public.shopee_sales_overview_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== shopee_voucher_stats =====
DROP POLICY IF EXISTS "shopee_voucher_stats_select" ON public.shopee_voucher_stats;
CREATE POLICY "shopee_voucher_stats_select" ON public.shopee_voucher_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== shopee_product_performance_stats =====
DROP POLICY IF EXISTS "shopee_product_performance_stats_select" ON public.shopee_product_performance_stats;
CREATE POLICY "shopee_product_performance_stats_select" ON public.shopee_product_performance_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );

-- ===== shopee_inapp_ad_stats =====
DROP POLICY IF EXISTS "shopee_inapp_ad_stats_select" ON public.shopee_inapp_ad_stats;
CREATE POLICY "shopee_inapp_ad_stats_select" ON public.shopee_inapp_ad_stats
  FOR SELECT USING (
    brand_id = ANY(get_my_brand_ids()) OR get_my_role() = 'admin'
  );
