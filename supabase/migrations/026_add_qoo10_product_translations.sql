-- 큐텐 상품명 JP→KO 번역 캐시 테이블
create table if not exists qoo10_product_translations (
  source_text text primary key,      -- 전처리 후 일본어 (캐시 키)
  translated_text text not null,     -- 한국어
  created_at timestamptz not null default now()
);

alter table qoo10_product_translations enable row level security;

-- 인증 없이 읽기만 허용 (번역 캐시는 공개 데이터)
create policy "read translations" on qoo10_product_translations
  for select using (true);
