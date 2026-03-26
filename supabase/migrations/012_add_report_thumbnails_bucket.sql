-- report-thumbnails 버킷 생성 (Meta 소재 썸네일 영구 저장)
insert into storage.buckets (id, name, public)
values ('report-thumbnails', 'report-thumbnails', true)
on conflict (id) do nothing;

-- 공개 읽기 정책
create policy "report-thumbnails public read"
  on storage.objects for select
  using (bucket_id = 'report-thumbnails');

-- 관리자(service_role)만 업로드/삭제 가능 (서버에서만 업로드하므로 별도 INSERT 정책 불필요)
