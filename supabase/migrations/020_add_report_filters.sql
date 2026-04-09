-- reports 테이블에 admin 설정 필터 컬럼 추가
-- null = 전체 표시 (기본), 배열 = 선택된 ID만 표시
ALTER TABLE public.reports
  ADD COLUMN filters jsonb DEFAULT NULL;
