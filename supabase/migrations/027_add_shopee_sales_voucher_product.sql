-- ============================================================
-- 027_add_shopee_sales_voucher_product.sql
-- 쇼피 Sales Overview / Voucher / Product Performance 테이블 추가
-- ============================================================

-- ===== 1. shopee_sales_overview_stats (일별) =====

CREATE TABLE public.shopee_sales_overview_stats (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_account_id  uuid        REFERENCES public.shopee_accounts ON DELETE CASCADE,
  brand_id           uuid        REFERENCES public.brands,
  date               date        NOT NULL,
  units_paid_order   integer,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (shopee_account_id, date)
);

-- ===== 2. shopee_voucher_stats (월별) =====

CREATE TABLE public.shopee_voucher_stats (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_account_id  uuid        REFERENCES public.shopee_accounts ON DELETE CASCADE,
  brand_id           uuid        REFERENCES public.brands,
  year_month         text        NOT NULL,
  voucher_name       text        NOT NULL,
  currency           text,
  orders_paid        integer,
  usage_rate_paid    numeric(10,4),
  sales_paid         numeric(15,2),
  sales_paid_krw     numeric(15,2),
  cost_paid          numeric(15,2),
  cost_paid_krw      numeric(15,2),
  units_sold_paid    integer,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (shopee_account_id, year_month, voucher_name)
);

-- ===== 3. shopee_product_performance_stats (월별) =====

CREATE TABLE public.shopee_product_performance_stats (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_account_id           uuid        REFERENCES public.shopee_accounts ON DELETE CASCADE,
  brand_id                    uuid        REFERENCES public.brands,
  year_month                  text        NOT NULL,
  item_id                     text        NOT NULL,
  product_name                text,
  variation_id                text        NOT NULL DEFAULT '',
  variation_name              text,
  sku                         text,
  parent_sku                  text,
  order_conv_rate_paid        numeric(10,4),
  units_paid                  integer,
  buyers_paid                 integer,
  product_visitors            integer,
  product_page_views          integer,
  add_to_cart_visitors        integer,
  add_to_cart_units           integer,
  add_to_cart_conv_rate       numeric(10,4),
  created_at                  timestamptz DEFAULT now(),
  UNIQUE (shopee_account_id, year_month, item_id, variation_id)
);

-- ===== RLS 활성화 =====

ALTER TABLE public.shopee_sales_overview_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_voucher_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_product_performance_stats ENABLE ROW LEVEL SECURITY;

-- ===== RLS 정책: shopee_sales_overview_stats =====

CREATE POLICY "shopee_sales_overview_stats_select"
  ON public.shopee_sales_overview_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "shopee_sales_overview_stats_insert"
  ON public.shopee_sales_overview_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "shopee_sales_overview_stats_update"
  ON public.shopee_sales_overview_stats FOR UPDATE
  USING (get_my_role() = 'admin');

-- ===== RLS 정책: shopee_voucher_stats =====

CREATE POLICY "shopee_voucher_stats_select"
  ON public.shopee_voucher_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "shopee_voucher_stats_insert"
  ON public.shopee_voucher_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "shopee_voucher_stats_update"
  ON public.shopee_voucher_stats FOR UPDATE
  USING (get_my_role() = 'admin');

-- ===== RLS 정책: shopee_product_performance_stats =====

CREATE POLICY "shopee_product_performance_stats_select"
  ON public.shopee_product_performance_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "shopee_product_performance_stats_insert"
  ON public.shopee_product_performance_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "shopee_product_performance_stats_update"
  ON public.shopee_product_performance_stats FOR UPDATE
  USING (get_my_role() = 'admin');

-- ===== 인덱스 =====

-- shopee_sales_overview_stats
CREATE INDEX idx_shopee_sales_overview_brand_date
  ON public.shopee_sales_overview_stats (brand_id, date);

CREATE INDEX idx_shopee_sales_overview_account_date
  ON public.shopee_sales_overview_stats (shopee_account_id, date);

-- shopee_voucher_stats
CREATE INDEX idx_shopee_voucher_stats_brand_month
  ON public.shopee_voucher_stats (brand_id, year_month);

CREATE INDEX idx_shopee_voucher_stats_account_month
  ON public.shopee_voucher_stats (shopee_account_id, year_month);

-- shopee_product_performance_stats
CREATE INDEX idx_shopee_product_performance_brand_month
  ON public.shopee_product_performance_stats (brand_id, year_month);

CREATE INDEX idx_shopee_product_performance_account_month
  ON public.shopee_product_performance_stats (shopee_account_id, year_month);
