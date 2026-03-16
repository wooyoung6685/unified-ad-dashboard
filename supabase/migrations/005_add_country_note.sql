-- meta_accounts: account_name → note (nullable), country 추가
ALTER TABLE public.meta_accounts
  RENAME COLUMN account_name TO note;

ALTER TABLE public.meta_accounts
  ALTER COLUMN note DROP NOT NULL;

ALTER TABLE public.meta_accounts
  ADD COLUMN country text;

-- tiktok_accounts: account_name → note (nullable), country 추가
ALTER TABLE public.tiktok_accounts
  RENAME COLUMN account_name TO note;

ALTER TABLE public.tiktok_accounts
  ALTER COLUMN note DROP NOT NULL;

ALTER TABLE public.tiktok_accounts
  ADD COLUMN country text;
