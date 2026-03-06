-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security 정책
-- ============================================================

-- 헬퍼 함수: 현재 로그인 유저의 brand_id 반환
CREATE OR REPLACE FUNCTION get_my_brand_id()
RETURNS uuid AS $$
  SELECT brand_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 헬퍼 함수: 현재 로그인 유저의 role 반환
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ===== brands =====
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brands_select"
  ON public.brands FOR SELECT
  USING (id = get_my_brand_id() OR get_my_role() = 'admin');

-- ===== users =====
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR get_my_role() = 'admin');

-- ===== global_settings =====
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_settings_select"
  ON public.global_settings FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "global_settings_update"
  ON public.global_settings FOR UPDATE
  USING (get_my_role() = 'admin');

-- ===== meta_accounts =====
ALTER TABLE public.meta_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_accounts_select"
  ON public.meta_accounts FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "meta_accounts_insert"
  ON public.meta_accounts FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "meta_accounts_update"
  ON public.meta_accounts FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "meta_accounts_delete"
  ON public.meta_accounts FOR DELETE
  USING (get_my_role() = 'admin');

-- ===== tiktok_accounts =====
ALTER TABLE public.tiktok_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tiktok_accounts_select"
  ON public.tiktok_accounts FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

CREATE POLICY "tiktok_accounts_insert"
  ON public.tiktok_accounts FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "tiktok_accounts_update"
  ON public.tiktok_accounts FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "tiktok_accounts_delete"
  ON public.tiktok_accounts FOR DELETE
  USING (get_my_role() = 'admin');

-- ===== meta_daily_stats =====
ALTER TABLE public.meta_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_daily_stats_select"
  ON public.meta_daily_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');

-- ===== tiktok_daily_stats =====
ALTER TABLE public.tiktok_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tiktok_daily_stats_select"
  ON public.tiktok_daily_stats FOR SELECT
  USING (brand_id = get_my_brand_id() OR get_my_role() = 'admin');
