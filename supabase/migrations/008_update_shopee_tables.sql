-- ============================================================
-- 008_update_shopee_tables.sql
-- Shopee 테이블 스키마 업데이트 (007 기준으로 재생성)
-- ============================================================

-- ===== 기존 테이블 삭제 =====

DROP TABLE IF EXISTS public.shopee_inapp_stats CASCADE;
DROP TABLE IF EXISTS public.shopee_shopping_stats CASCADE;

-- ===== 재생성: shopee_shopping_stats =====

CREATE TABLE public.shopee_shopping_stats (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_account_id       uuid        REFERENCES public.shopee_accounts ON DELETE CASCADE,
  brand_id                uuid        REFERENCES public.brands,
  date                    date        NOT NULL,
  currency                text,
  sales                   numeric(15,2),
  sales_without_rebate    numeric(15,2),           -- SG 전용 (nullable)
  orders                  integer,
  sales_per_order         numeric(10,4),
  product_clicks          bigint,
  visitors                bigint,
  order_conversion_rate   numeric(10,4),            -- % 제거된 값
  cancelled_orders        integer,
  cancelled_sales         numeric(15,2),
  refunded_orders         integer,
  refunded_sales          numeric(15,2),
  buyers                  integer,
  new_buyers              integer,
  existing_buyers         integer,
  potential_buyers        integer,
  repeat_purchase_rate    numeric(10,4),            -- % 제거된 값
  created_at              timestamptz DEFAULT now(),
  UNIQUE (shopee_account_id, date)
);

-- ===== 재생성: shopee_inapp_stats =====

CREATE TABLE public.shopee_inapp_stats (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_account_id           uuid        REFERENCES public.shopee_accounts ON DELETE CASCADE,
  brand_id                    uuid        REFERENCES public.brands,
  date                        date        NOT NULL,
  ads_type                    text        NOT NULL,  -- 'product_ad' | 'shop_ad' | 'other'
  currency                    text,
  impressions                 bigint,
  clicks                      bigint,
  ctr                         numeric(10,4),
  conversions                 integer,
  direct_conversions          integer,
  conversion_rate             numeric(10,4),
  direct_conversion_rate      numeric(10,4),
  cost_per_conversion         numeric(15,4),
  cost_per_direct_conversion  numeric(15,4),
  items_sold                  integer,
  direct_items_sold           integer,
  gmv                         numeric(15,2),
  direct_gmv                  numeric(15,2),
  expense                     numeric(15,2),
  roas                        numeric(10,4),
  direct_roas                 numeric(10,4),
  acos                        numeric(10,4),
  direct_acos                 numeric(10,4),
  created_at                  timestamptz DEFAULT now(),
  UNIQUE (shopee_account_id, date, ads_type)
);

-- ===== RLS 활성화 =====

ALTER TABLE public.shopee_shopping_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_inapp_stats ENABLE ROW LEVEL SECURITY;

-- ===== RLS 정책 =====

CREATE POLICY "shopee_shopping_stats_select"
  ON public.shopee_shopping_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "shopee_shopping_stats_insert"
  ON public.shopee_shopping_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "shopee_shopping_stats_update"
  ON public.shopee_shopping_stats FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "shopee_inapp_stats_select"
  ON public.shopee_inapp_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "shopee_inapp_stats_insert"
  ON public.shopee_inapp_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "shopee_inapp_stats_update"
  ON public.shopee_inapp_stats FOR UPDATE
  USING (get_my_role() = 'admin');

-- ===== 인덱스 =====

CREATE INDEX idx_shopee_shopping_stats_brand_date
  ON public.shopee_shopping_stats (brand_id, date);

CREATE INDEX idx_shopee_shopping_stats_account_date
  ON public.shopee_shopping_stats (shopee_account_id, date);

CREATE INDEX idx_shopee_inapp_stats_brand_date
  ON public.shopee_inapp_stats (brand_id, date);

CREATE INDEX idx_shopee_inapp_stats_account_date
  ON public.shopee_inapp_stats (shopee_account_id, date);
