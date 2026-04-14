-- ============================================================
-- 025_add_qoo10_tables.sql
-- Qoo10 매체 데이터 테이블 추가
-- ============================================================

-- ===== 테이블 생성 =====

-- 1. qoo10_accounts (아마존과 동일 패턴: account_type으로 ads/organic 구분)
CREATE TABLE IF NOT EXISTS public.qoo10_accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  account_id   text        NOT NULL,          -- 브랜드명 입력 (헬퍼 텍스트: "브랜드명을 입력하세요")
  account_name text        NOT NULL DEFAULT '',
  account_type text        NOT NULL CHECK (account_type IN ('ads', 'organic')),
  country      text,
  is_active    boolean     NOT NULL DEFAULT TRUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, account_type)
);

-- 2. qoo10_ads_stats (내부광고 = 새 광고 성과 보고서, 상품×광고유형별 행)
CREATE TABLE IF NOT EXISTS public.qoo10_ads_stats (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  qoo10_account_id         uuid        NOT NULL REFERENCES public.qoo10_accounts(id) ON DELETE CASCADE,
  brand_id                 uuid        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  date                     date        NOT NULL,

  product_name             text,
  product_code             text,
  ad_name                  text,         -- 광고 유형 (파워랭크업, 키워드플러스 등)
  cost                     numeric,      -- 광고비 (Qcash)
  sales                    numeric,      -- 광고 매출
  roas                     numeric,      -- ROAS (%)
  impressions              integer,      -- 노출수
  clicks                   integer,      -- 클릭수(PV)
  ctr                      numeric,      -- 클릭률 (%)
  carts                    integer,      -- 카트수
  cart_conversion_rate     numeric,      -- 카트 전환율 (%)
  purchases                integer,      -- 구매수
  purchase_conversion_rate numeric,      -- 구매 전환율 (%)

  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (qoo10_account_id, date, product_code, ad_name)
);

-- 3-1. qoo10_organic_visitor_stats (CVR 유입자수 + 장바구니, 일별 1행)
CREATE TABLE IF NOT EXISTS public.qoo10_organic_visitor_stats (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  qoo10_account_id         uuid        NOT NULL REFERENCES public.qoo10_accounts(id) ON DELETE CASCADE,
  brand_id                 uuid        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  date                     date        NOT NULL,

  visitors                 integer,      -- 유입자수
  add_to_cart              integer,      -- 장바구니

  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (qoo10_account_id, date)
);

-- 3-2. qoo10_organic_transaction_stats (거래 데이터, 일별 상품별 다수행)
CREATE TABLE IF NOT EXISTS public.qoo10_organic_transaction_stats (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  qoo10_account_id         uuid        NOT NULL REFERENCES public.qoo10_accounts(id) ON DELETE CASCADE,
  brand_id                 uuid        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  date                     date        NOT NULL,

  product_name             text,         -- 상품명
  transaction_amount       numeric,      -- 취소분반영 거래금액
  transaction_quantity     integer,      -- 취소분반영 거래상품수량

  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (qoo10_account_id, date, product_name)
);

-- ===== RLS 활성화 =====

ALTER TABLE public.qoo10_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qoo10_ads_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qoo10_organic_visitor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qoo10_organic_transaction_stats ENABLE ROW LEVEL SECURITY;

-- ===== RLS 정책 =====

-- qoo10_accounts
CREATE POLICY "qoo10_accounts_select"
  ON public.qoo10_accounts FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "qoo10_accounts_insert"
  ON public.qoo10_accounts FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "qoo10_accounts_update"
  ON public.qoo10_accounts FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "qoo10_accounts_delete"
  ON public.qoo10_accounts FOR DELETE
  USING (get_my_role() = 'admin');

-- qoo10_ads_stats
CREATE POLICY "qoo10_ads_stats_select"
  ON public.qoo10_ads_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "qoo10_ads_stats_insert"
  ON public.qoo10_ads_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "qoo10_ads_stats_update"
  ON public.qoo10_ads_stats FOR UPDATE
  USING (get_my_role() = 'admin');

-- qoo10_organic_visitor_stats
CREATE POLICY "qoo10_organic_visitor_stats_select"
  ON public.qoo10_organic_visitor_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "qoo10_organic_visitor_stats_insert"
  ON public.qoo10_organic_visitor_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "qoo10_organic_visitor_stats_update"
  ON public.qoo10_organic_visitor_stats FOR UPDATE
  USING (get_my_role() = 'admin');

-- qoo10_organic_transaction_stats
CREATE POLICY "qoo10_organic_transaction_stats_select"
  ON public.qoo10_organic_transaction_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "qoo10_organic_transaction_stats_insert"
  ON public.qoo10_organic_transaction_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "qoo10_organic_transaction_stats_update"
  ON public.qoo10_organic_transaction_stats FOR UPDATE
  USING (get_my_role() = 'admin');

-- ===== 인덱스 =====

CREATE INDEX idx_qoo10_accounts_brand
  ON public.qoo10_accounts (brand_id);

CREATE INDEX idx_qoo10_ads_stats_account_date
  ON public.qoo10_ads_stats (qoo10_account_id, date);

CREATE INDEX idx_qoo10_ads_stats_brand_date
  ON public.qoo10_ads_stats (brand_id, date);

CREATE INDEX idx_qoo10_organic_visitor_stats_account_date
  ON public.qoo10_organic_visitor_stats (qoo10_account_id, date);

CREATE INDEX idx_qoo10_organic_visitor_stats_brand_date
  ON public.qoo10_organic_visitor_stats (brand_id, date);

CREATE INDEX idx_qoo10_organic_transaction_stats_account_date
  ON public.qoo10_organic_transaction_stats (qoo10_account_id, date);

CREATE INDEX idx_qoo10_organic_transaction_stats_brand_date
  ON public.qoo10_organic_transaction_stats (brand_id, date);
