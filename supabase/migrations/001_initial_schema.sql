-- ============================================================
-- 001_initial_schema.sql
-- ad-dashboard 초기 데이터베이스 스키마
-- ============================================================

-- 1. brands
CREATE TABLE public.brands (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. users (auth.users 연동)
CREATE TABLE public.users (
  id         uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  brand_id   uuid        REFERENCES public.brands,
  role       text        DEFAULT 'viewer',
  created_at timestamptz DEFAULT now()
);

-- 3. global_settings
CREATE TABLE public.global_settings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         text        UNIQUE NOT NULL,
  access_token     text,
  token_expires_at timestamptz,
  app_id           text,
  secret           text,
  updated_at       timestamptz DEFAULT now()
);

-- 4. meta_accounts
CREATE TABLE public.meta_accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid        REFERENCES public.brands,
  account_id   text        NOT NULL,
  account_name text        NOT NULL,
  is_active    boolean     DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (account_id)
);

-- 5. tiktok_accounts
CREATE TABLE public.tiktok_accounts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      uuid        REFERENCES public.brands,
  advertiser_id text        NOT NULL,
  account_name  text        NOT NULL,
  is_active     boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (advertiser_id)
);

-- 6. meta_daily_stats
CREATE TABLE public.meta_daily_stats (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_account_id         uuid        REFERENCES public.meta_accounts ON DELETE CASCADE,
  brand_id                uuid        REFERENCES public.brands,
  date                    date        NOT NULL,
  spend                   numeric(15,2),
  purchases               integer,
  revenue                 numeric(15,2),
  roas                    numeric(10,4),
  cpa                     numeric(15,2),
  conversion_rate         numeric(10,4),
  avg_order_value         numeric(15,2),
  reach                   bigint,
  impressions             bigint,
  frequency               numeric(10,4),
  cpm                     numeric(15,2),
  clicks                  bigint,
  cpc                     numeric(15,2),
  ctr                     numeric(10,4),
  content_views           bigint,
  cost_per_content_view   numeric(15,2),
  add_to_cart             bigint,
  cost_per_add_to_cart    numeric(15,2),
  add_to_cart_value       numeric(15,2),
  outbound_clicks         bigint,
  cost_per_outbound_click numeric(15,2),
  created_at              timestamptz DEFAULT now(),
  UNIQUE (meta_account_id, date)
);

-- 7. tiktok_daily_stats
CREATE TABLE public.tiktok_daily_stats (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_account_id uuid        REFERENCES public.tiktok_accounts ON DELETE CASCADE,
  brand_id          uuid        REFERENCES public.brands,
  date              date        NOT NULL,
  spend             numeric(15,2),
  impressions       bigint,
  reach             bigint,
  clicks            bigint,
  frequency         numeric(10,4),
  cpc               numeric(15,2),
  ctr               numeric(10,4),
  cpm               numeric(15,2),
  video_views       bigint,
  views_2s          bigint,
  views_6s          bigint,
  views_25pct       bigint,
  views_100pct      bigint,
  avg_play_time     numeric(10,2),
  followers         bigint,
  likes             bigint,
  purchases         integer,
  revenue           numeric(15,2),
  roas              numeric(10,4),
  created_at        timestamptz DEFAULT now(),
  UNIQUE (tiktok_account_id, date)
);
