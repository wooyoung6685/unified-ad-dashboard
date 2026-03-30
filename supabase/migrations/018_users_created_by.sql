-- users 테이블에 created_by 컬럼 추가
-- 어드민별 유저 격리를 위해 각 유저가 어느 어드민에 의해 생성되었는지 추적

ALTER TABLE public.users
  ADD COLUMN created_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX idx_users_created_by ON public.users (created_by);

-- 기존 viewer 유저의 created_by를 브랜드 소유자로 역추론
UPDATE public.users u
SET created_by = b.owner_user_id
FROM public.brands b
WHERE u.brand_id = b.id
  AND u.role = 'viewer'
  AND u.created_by IS NULL
  AND b.owner_user_id IS NOT NULL;
