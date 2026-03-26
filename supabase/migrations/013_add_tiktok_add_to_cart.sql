-- tiktok_daily_stats 테이블에 장바구니 담기/전환값 컬럼 추가
ALTER TABLE public.tiktok_daily_stats
  ADD COLUMN IF NOT EXISTS add_to_cart       bigint,
  ADD COLUMN IF NOT EXISTS add_to_cart_value numeric(15,2);
