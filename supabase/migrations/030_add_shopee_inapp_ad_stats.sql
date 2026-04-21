-- ============================================================
-- 030_add_shopee_inapp_ad_stats.sql
-- 쇼피 인앱 광고의 "광고 단위(per-Ad)" 일별 통계 테이블 추가
-- 기존 shopee_inapp_stats (ads_type 3종 합산) 는 그대로 유지.
-- ============================================================

CREATE TABLE public.shopee_inapp_ad_stats (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_account_id   uuid        REFERENCES public.shopee_accounts ON DELETE CASCADE,
  brand_id            uuid        REFERENCES public.brands,
  date                date        NOT NULL,   -- Date Period 시작일 (일별 저장)

  -- 식별자 (광고 단위)
  ad_name             text        NOT NULL,
  ads_type_raw        text,
  ads_type            text        NOT NULL,
  product_id          text,
  bidding_method      text,

  currency            text,

  -- 측정치
  impressions         bigint,
  clicks              bigint,
  ctr                 numeric(10,4),
  conversions         integer,
  conversion_rate     numeric(10,4),
  direct_conversions  integer,
  items_sold          integer,
  direct_items_sold   integer,
  gmv                 numeric(15,2),
  direct_gmv          numeric(15,2),
  expense             numeric(15,2),
  roas                numeric(10,4),
  direct_roas         numeric(10,4),
  acos                numeric(10,4),
  direct_acos         numeric(10,4),

  -- 원화 환산
  gmv_krw             numeric(15,2),
  direct_gmv_krw      numeric(15,2),
  expense_krw         numeric(15,2),

  created_at          timestamptz DEFAULT now(),
  UNIQUE (shopee_account_id, date, ad_name)
);

-- ===== RLS 활성화 =====

ALTER TABLE public.shopee_inapp_ad_stats ENABLE ROW LEVEL SECURITY;

-- ===== RLS 정책 =====

CREATE POLICY "shopee_inapp_ad_stats_select"
  ON public.shopee_inapp_ad_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "shopee_inapp_ad_stats_insert"
  ON public.shopee_inapp_ad_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "shopee_inapp_ad_stats_update"
  ON public.shopee_inapp_ad_stats FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "shopee_inapp_ad_stats_delete"
  ON public.shopee_inapp_ad_stats FOR DELETE
  USING (get_my_role() = 'admin');

-- ===== 인덱스 =====

CREATE INDEX idx_shopee_inapp_ad_stats_brand_date
  ON public.shopee_inapp_ad_stats (brand_id, date);

CREATE INDEX idx_shopee_inapp_ad_stats_account_date
  ON public.shopee_inapp_ad_stats (shopee_account_id, date);

CREATE INDEX idx_shopee_inapp_ad_stats_account_date_adname
  ON public.shopee_inapp_ad_stats (shopee_account_id, date, ad_name);
