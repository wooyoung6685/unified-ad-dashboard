-- tiktok_accounts에 store_id 컬럼 추가 (GMV Max 리포트 API 호출에 필요)
ALTER TABLE public.tiktok_accounts
  ADD COLUMN IF NOT EXISTS store_id text;
