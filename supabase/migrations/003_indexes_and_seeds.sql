-- ============================================================
-- 003_indexes_and_seeds.sql
-- 인덱스 생성 및 초기 데이터 삽입
-- ============================================================

-- ===== 인덱스 =====

CREATE INDEX idx_meta_daily_stats_brand_date
  ON public.meta_daily_stats (brand_id, date);

CREATE INDEX idx_meta_daily_stats_account_date
  ON public.meta_daily_stats (meta_account_id, date);

CREATE INDEX idx_tiktok_daily_stats_brand_date
  ON public.tiktok_daily_stats (brand_id, date);

CREATE INDEX idx_tiktok_daily_stats_account_date
  ON public.tiktok_daily_stats (tiktok_account_id, date);

-- ===== global_settings 초기 데이터 =====

INSERT INTO public.global_settings (platform, access_token, app_id, secret)
VALUES
  ('meta',   '', '', ''),
  ('tiktok', '', '', '');
