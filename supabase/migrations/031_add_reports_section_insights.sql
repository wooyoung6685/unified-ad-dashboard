-- 리포트 섹션별 인사이트 저장용 jsonb 컬럼 추가
-- 형식: { [section_key]: { title: string | null, content: string } }
-- section_key는 src/lib/reports/section-keys.ts의 상수만 허용 (서버 화이트리스트 검증)

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS section_insights jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.reports.section_insights IS
  '섹션별 인사이트 맵: { [section_key]: { title: string|null, content: string } }';
