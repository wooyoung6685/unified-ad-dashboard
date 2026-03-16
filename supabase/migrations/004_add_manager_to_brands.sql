-- brands 테이블에 담당자 컬럼 추가
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS manager TEXT;
