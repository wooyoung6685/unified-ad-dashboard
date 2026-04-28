-- reports 테이블에 뷰어 노출 여부 컬럼 추가
-- 기본값 false: 신규 및 기존 리포트 모두 기본 비공개 상태
ALTER TABLE public.reports
  ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT false;

-- 뷰어 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS reports_brand_visible_idx
  ON public.reports (brand_id, is_visible);

-- SELECT 정책 교체:
--   admin: 모든 리포트 조회 가능
--   viewer: 자기 brand의 is_visible = true 리포트만 조회 가능
DROP POLICY IF EXISTS "reports_select" ON public.reports;
CREATE POLICY "reports_select" ON public.reports
  FOR SELECT USING (
    get_my_role() = 'admin'
    OR (brand_id = get_my_brand_id() AND is_visible = true)
  );
