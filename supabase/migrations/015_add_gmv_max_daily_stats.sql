-- GMV Max 일별 통계 테이블 (일별 합산 기준, tiktok_daily_stats와 동일한 패턴)
CREATE TABLE public.gmv_max_daily_stats (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_account_id uuid        REFERENCES public.tiktok_accounts ON DELETE CASCADE,
  brand_id          uuid        REFERENCES public.brands,
  date              date        NOT NULL,
  cost              numeric(15,2),
  gross_revenue     numeric(15,2),
  roi               numeric(10,4),
  orders            integer,
  cost_per_order    numeric(15,2),
  created_at        timestamptz DEFAULT now(),
  UNIQUE (tiktok_account_id, date)
);

ALTER TABLE public.gmv_max_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gmv_max_daily_stats_select"
  ON public.gmv_max_daily_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

-- INSERT/UPDATE는 service role(서버 API)에서만 수행
CREATE POLICY "gmv_max_daily_stats_insert"
  ON public.gmv_max_daily_stats FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "gmv_max_daily_stats_update"
  ON public.gmv_max_daily_stats FOR UPDATE
  USING (get_my_role() = 'admin');
