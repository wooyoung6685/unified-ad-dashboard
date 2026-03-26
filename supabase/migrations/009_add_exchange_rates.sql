-- ============================================================
-- 009_add_exchange_rates.sql
-- 환율 테이블 생성 및 Shopee 통계 테이블에 원화 환산 컬럼 추가
-- ============================================================

-- ===== exchange_rates 테이블 생성 =====

CREATE TABLE public.exchange_rates (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month text          NOT NULL,  -- 'YYYY-MM'
  country    text          NOT NULL,  -- 'kr'|'us'|'jp'|'vn'|'tw'|'sg'|'ph'|'my'|'th'|'id'
  currency   text          NOT NULL,  -- 'KRW'|'USD'|'JPY'|'VND'|'TWD'|'SGD'|'PHP'|'MYR'|'THB'|'IDR'
  rate       numeric(15,4) NOT NULL,  -- 1 현지통화 → KRW
  created_at timestamptz   DEFAULT now(),
  updated_at timestamptz   DEFAULT now(),
  UNIQUE (year_month, country)
);

-- ===== shopee_shopping_stats 원화 환산 컬럼 추가 =====

ALTER TABLE public.shopee_shopping_stats
  ADD COLUMN sales_krw                numeric(15,2),
  ADD COLUMN sales_without_rebate_krw numeric(15,2),
  ADD COLUMN cancelled_sales_krw      numeric(15,2),
  ADD COLUMN refunded_sales_krw       numeric(15,2),
  ADD COLUMN sales_per_order_krw      numeric(15,2);

-- ===== shopee_inapp_stats 원화 환산 컬럼 추가 =====

ALTER TABLE public.shopee_inapp_stats
  ADD COLUMN gmv_krw                        numeric(15,2),
  ADD COLUMN direct_gmv_krw                 numeric(15,2),
  ADD COLUMN expense_krw                    numeric(15,2),
  ADD COLUMN cost_per_conversion_krw        numeric(15,2),
  ADD COLUMN cost_per_direct_conversion_krw numeric(15,2);

-- ===== RLS 활성화 =====

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- ===== RLS 정책 =====

CREATE POLICY "exchange_rates_select"
  ON public.exchange_rates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "exchange_rates_insert"
  ON public.exchange_rates FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "exchange_rates_update"
  ON public.exchange_rates FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "exchange_rates_delete"
  ON public.exchange_rates FOR DELETE
  USING (get_my_role() = 'admin');
