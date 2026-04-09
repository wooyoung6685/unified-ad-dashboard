-- ============================================================
-- 021_add_amazon_tables.sql
-- Amazon 매체 데이터 테이블 추가
-- ============================================================

-- ===== 테이블 생성 =====

-- 1. amazon_accounts
CREATE TABLE IF NOT EXISTS public.amazon_accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  account_id   text        NOT NULL,
  account_name text        NOT NULL DEFAULT '',
  account_type text        NOT NULL CHECK (account_type IN ('organic', 'ads', 'asin')),
  country      text,
  is_active    boolean     NOT NULL DEFAULT TRUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, account_type)
);

-- 2. amazon_organic_stats (오가닉 = BusinessReport)
CREATE TABLE IF NOT EXISTS public.amazon_organic_stats (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_account_id          uuid        NOT NULL REFERENCES public.amazon_accounts(id) ON DELETE CASCADE,
  brand_id                   uuid        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  date                       date        NOT NULL,
  currency                   text,

  -- 원본 필드
  ordered_product_sales      numeric,
  ordered_product_sales_b2b  numeric,
  orders                     integer,
  orders_b2b                 integer,
  total_order_items          integer,
  total_order_items_b2b      integer,
  page_views                 integer,
  page_views_b2b             integer,
  sessions                   integer,
  sessions_b2b               integer,
  buy_box_percentage         numeric,
  buy_box_percentage_b2b     numeric,
  unit_session_percentage    numeric,
  unit_session_percentage_b2b numeric,
  average_offer_count        integer,
  average_parent_items       integer,

  created_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (amazon_account_id, date)
);

-- 3. amazon_ads_stats (내부광고 = Sponsored Products, 날짜별 집계)
CREATE TABLE IF NOT EXISTS public.amazon_ads_stats (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_account_id          uuid        NOT NULL REFERENCES public.amazon_accounts(id) ON DELETE CASCADE,
  brand_id                   uuid        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  date                       date        NOT NULL,
  currency                   text,

  -- 날짜별 집계 필드
  impressions                integer,
  viewable_impressions       integer,
  clicks                     integer,
  cost                       numeric,
  purchases                  integer,
  purchases_new_to_brand     integer,
  sales                      numeric,
  long_term_sales            numeric,

  -- 계산 필드 (집계 후 계산)
  ctr                        numeric,
  cpc                        numeric,
  roas                       numeric,
  long_term_roas             numeric,
  cost_per_purchase          numeric,

  created_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (amazon_account_id, date)
);

-- 4. amazon_asin_stats (제품별 = ASIN Report)
CREATE TABLE IF NOT EXISTS public.amazon_asin_stats (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_account_id          uuid        NOT NULL REFERENCES public.amazon_accounts(id) ON DELETE CASCADE,
  brand_id                   uuid        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  date                       date        NOT NULL,
  currency                   text,

  parent_asin                text,
  child_asin                 text,
  title                      text,
  sessions                   integer,
  sessions_b2b               integer,
  session_percentage         numeric,
  session_percentage_b2b     numeric,
  page_views                 integer,
  page_views_b2b             integer,
  page_views_percentage      numeric,
  page_views_percentage_b2b  numeric,
  buy_box_percentage         numeric,
  buy_box_percentage_b2b     numeric,
  orders                     integer,
  orders_b2b                 integer,
  unit_session_percentage    numeric,
  unit_session_percentage_b2b numeric,
  ordered_product_sales      numeric,
  ordered_product_sales_b2b  numeric,
  total_order_items          integer,
  total_order_items_b2b      integer,

  created_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (amazon_account_id, date, child_asin)
);

-- ===== RLS 활성화 =====

ALTER TABLE public.amazon_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amazon_organic_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amazon_ads_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amazon_asin_stats ENABLE ROW LEVEL SECURITY;

-- ===== RLS 정책 =====

-- amazon_accounts
CREATE POLICY "amazon_accounts_select"
  ON public.amazon_accounts FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "amazon_accounts_insert"
  ON public.amazon_accounts FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "amazon_accounts_update"
  ON public.amazon_accounts FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "amazon_accounts_delete"
  ON public.amazon_accounts FOR DELETE
  USING (get_my_role() = 'admin');

-- amazon_organic_stats
CREATE POLICY "amazon_organic_stats_select"
  ON public.amazon_organic_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "amazon_organic_stats_insert"
  ON public.amazon_organic_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "amazon_organic_stats_update"
  ON public.amazon_organic_stats FOR UPDATE
  USING (get_my_role() = 'admin');

-- amazon_ads_stats
CREATE POLICY "amazon_ads_stats_select"
  ON public.amazon_ads_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "amazon_ads_stats_insert"
  ON public.amazon_ads_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "amazon_ads_stats_update"
  ON public.amazon_ads_stats FOR UPDATE
  USING (get_my_role() = 'admin');

-- amazon_asin_stats
CREATE POLICY "amazon_asin_stats_select"
  ON public.amazon_asin_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "amazon_asin_stats_insert"
  ON public.amazon_asin_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "amazon_asin_stats_update"
  ON public.amazon_asin_stats FOR UPDATE
  USING (get_my_role() = 'admin');

-- ===== 인덱스 =====

CREATE INDEX idx_amazon_accounts_brand
  ON public.amazon_accounts (brand_id);

CREATE INDEX idx_amazon_organic_stats_account_date
  ON public.amazon_organic_stats (amazon_account_id, date);

CREATE INDEX idx_amazon_organic_stats_brand_date
  ON public.amazon_organic_stats (brand_id, date);

CREATE INDEX idx_amazon_ads_stats_account_date
  ON public.amazon_ads_stats (amazon_account_id, date);

CREATE INDEX idx_amazon_ads_stats_brand_date
  ON public.amazon_ads_stats (brand_id, date);

CREATE INDEX idx_amazon_asin_stats_account_date
  ON public.amazon_asin_stats (amazon_account_id, date);

CREATE INDEX idx_amazon_asin_stats_brand_date
  ON public.amazon_asin_stats (brand_id, date);
