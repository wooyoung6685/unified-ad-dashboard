-- 브랜드 및 환율에 소유 어드민 연결
-- 각 어드민이 자기 브랜드/환율만 관리하도록 분리

-- ===== brands =====
ALTER TABLE public.brands
  ADD COLUMN owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX idx_brands_owner ON public.brands (owner_user_id);

-- ===== exchange_rates =====
ALTER TABLE public.exchange_rates
  ADD COLUMN owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- 기존 UNIQUE 제약 (year_month, country) 삭제 후 owner_user_id 포함으로 재생성
-- NULL을 고정 UUID로 대체하여 UNIQUE 인덱스에서 동등 비교 가능하도록 처리
ALTER TABLE public.exchange_rates
  DROP CONSTRAINT IF EXISTS exchange_rates_year_month_country_key;

CREATE UNIQUE INDEX idx_exchange_rates_owner_unique
  ON public.exchange_rates (
    year_month,
    country,
    COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000')
  );
