-- reports 테이블 생성
CREATE TABLE public.reports (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid        REFERENCES public.brands ON DELETE CASCADE,
  title                text        NOT NULL,
  platform             text        NOT NULL,  -- 'meta' | 'shopee_inapp'
  country              text,
  internal_account_id  uuid,                  -- meta_accounts 또는 shopee_accounts의 id
  year                 integer     NOT NULL,
  month                integer     NOT NULL,
  status               text        NOT NULL DEFAULT 'published',
  snapshot             jsonb,
  created_by           uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- SELECT 정책: admin이거나 본인 brand
CREATE POLICY "reports_select" ON public.reports
  FOR SELECT USING (
    get_my_role() = 'admin'
    OR brand_id = get_my_brand_id()
  );

-- INSERT 정책: admin만
CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

-- UPDATE 정책: admin만
CREATE POLICY "reports_update" ON public.reports
  FOR UPDATE USING (get_my_role() = 'admin');

-- DELETE 정책: admin만
CREATE POLICY "reports_delete" ON public.reports
  FOR DELETE USING (get_my_role() = 'admin');

-- 인덱스
CREATE INDEX ON public.reports (brand_id, year, month);
CREATE INDEX ON public.reports (brand_id, created_at DESC);
