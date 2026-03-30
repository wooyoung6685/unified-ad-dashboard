-- 어드민별 플랫폼 토큰 테이블
-- global_settings는 폴백용으로 유지하고, 어드민마다 개별 토큰을 가짐
CREATE TABLE public.admin_platform_tokens (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform         text        NOT NULL CHECK (platform IN ('meta', 'tiktok')),
  access_token     text,
  app_id           text,
  secret           text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (user_id, platform)
);

-- RLS 활성화
ALTER TABLE public.admin_platform_tokens ENABLE ROW LEVEL SECURITY;

-- 본인 토큰만 조회 가능
CREATE POLICY "admin_platform_tokens_select"
  ON public.admin_platform_tokens FOR SELECT
  USING (user_id = auth.uid());

-- 어드민만 본인 토큰 삽입 가능
CREATE POLICY "admin_platform_tokens_insert"
  ON public.admin_platform_tokens FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 어드민만 본인 토큰 수정 가능
CREATE POLICY "admin_platform_tokens_update"
  ON public.admin_platform_tokens FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 어드민만 본인 토큰 삭제 가능
CREATE POLICY "admin_platform_tokens_delete"
  ON public.admin_platform_tokens FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 조회 성능용 인덱스
CREATE INDEX idx_admin_platform_tokens_user_platform
  ON public.admin_platform_tokens (user_id, platform);

-- 광고계정에 소유 어드민 연결
ALTER TABLE public.meta_accounts
  ADD COLUMN owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.tiktok_accounts
  ADD COLUMN owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX idx_meta_accounts_owner ON public.meta_accounts (owner_user_id);
CREATE INDEX idx_tiktok_accounts_owner ON public.tiktok_accounts (owner_user_id);
