-- ============================================================
-- 007_add_shopee_tables.sql
-- Shopee 쇼핑/인앱 광고 데이터 테이블 추가
-- ============================================================

-- ===== 테이블 생성 =====

-- 1. shopee_accounts
CREATE TABLE public.shopee_accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid        REFERENCES public.brands,
  account_id   text        NOT NULL,
  account_name text        NOT NULL,
  account_type text        NOT NULL,  -- 'shopping' | 'inapp'
  country      text,
  is_active    boolean     DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (account_id, account_type)
);

-- 2. shopee_shopping_stats
CREATE TABLE public.shopee_shopping_stats (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_account_id  uuid        REFERENCES public.shopee_accounts ON DELETE CASCADE,
  brand_id           uuid        REFERENCES public.brands,
  date               date        NOT NULL,
  spend              numeric(15,2),
  impressions        bigint,
  clicks             bigint,
  ctr                numeric(10,4),
  cpc                numeric(15,2),
  orders             integer,
  revenue            numeric(15,2),
  roas               numeric(10,4),
  -- SG 전용 (nullable)
  sales_without_rebate numeric(15,2),
  created_at         timestamptz DEFAULT now(),
  UNIQUE (shopee_account_id, date)
);

-- 3. shopee_inapp_stats
CREATE TABLE public.shopee_inapp_stats (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_account_id uuid        REFERENCES public.shopee_accounts ON DELETE CASCADE,
  brand_id          uuid        REFERENCES public.brands,
  date              date        NOT NULL,
  ads_type          text        NOT NULL,  -- 'product_ad' | 'shop_ad' | 'other'
  spend             numeric(15,2),
  impressions       bigint,
  clicks            bigint,
  ctr               numeric(10,4),
  cpc               numeric(15,2),
  orders            integer,
  revenue           numeric(15,2),
  roas              numeric(10,4),
  created_at        timestamptz DEFAULT now(),
  UNIQUE (shopee_account_id, date, ads_type)
);

-- ===== RLS 활성화 =====

ALTER TABLE public.shopee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_shopping_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_inapp_stats ENABLE ROW LEVEL SECURITY;

-- ===== RLS 정책 =====

-- shopee_accounts
CREATE POLICY "shopee_accounts_select"
  ON public.shopee_accounts FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "shopee_accounts_insert"
  ON public.shopee_accounts FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "shopee_accounts_update"
  ON public.shopee_accounts FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "shopee_accounts_delete"
  ON public.shopee_accounts FOR DELETE
  USING (get_my_role() = 'admin');

-- shopee_shopping_stats
CREATE POLICY "shopee_shopping_stats_select"
  ON public.shopee_shopping_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

-- shopee_inapp_stats
CREATE POLICY "shopee_inapp_stats_select"
  ON public.shopee_inapp_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

-- ===== 인덱스 =====

CREATE INDEX idx_shopee_shopping_stats_brand_date
  ON public.shopee_shopping_stats (brand_id, date);

CREATE INDEX idx_shopee_shopping_stats_account_date
  ON public.shopee_shopping_stats (shopee_account_id, date);

CREATE INDEX idx_shopee_inapp_stats_brand_date
  ON public.shopee_inapp_stats (brand_id, date);

CREATE INDEX idx_shopee_inapp_stats_account_date
  ON public.shopee_inapp_stats (shopee_account_id, date);
