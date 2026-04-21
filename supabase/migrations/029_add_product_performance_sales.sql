-- ============================================================
-- 029_add_product_performance_sales.sql
-- 쇼피 프로덕트 퍼포먼스에 Sales(Confirmed) 컬럼 추가
-- ============================================================

ALTER TABLE public.shopee_product_performance_stats
  ADD COLUMN IF NOT EXISTS sales_confirmed numeric(15, 2);
