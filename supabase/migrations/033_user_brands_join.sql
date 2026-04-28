-- ============================================================
-- 033_user_brands_join.sql
-- users 1:N brands 전환을 위한 join 테이블 신설
-- 기존 users.brand_id 컬럼은 롤백 안전망으로 유지 (035에서 DROP 예정)
-- ============================================================

CREATE TABLE public.user_brands (
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  brand_id   uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brand_id)
);

CREATE INDEX idx_user_brands_user  ON public.user_brands (user_id);
CREATE INDEX idx_user_brands_brand ON public.user_brands (brand_id);

-- 기존 users.brand_id 데이터를 user_brands 로 백필 (NOT NULL 행만)
INSERT INTO public.user_brands (user_id, brand_id)
SELECT id, brand_id
FROM public.users
WHERE brand_id IS NOT NULL
ON CONFLICT (user_id, brand_id) DO NOTHING;

-- RLS
ALTER TABLE public.user_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_brands_select" ON public.user_brands
  FOR SELECT USING (
    user_id = auth.uid() OR get_my_role() = 'admin'
  );

CREATE POLICY "user_brands_insert" ON public.user_brands
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "user_brands_delete" ON public.user_brands
  FOR DELETE USING (get_my_role() = 'admin');
