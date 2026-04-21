-- ============================================================
-- 028_add_reports_promotion_rows.sql
-- 쇼피 리포트 프로모션 성과 행 저장 컬럼 추가
-- ============================================================

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS promotion_rows jsonb DEFAULT '[]'::jsonb;
