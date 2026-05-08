-- meta_daily_stats에 링크 클릭수(inline_link_clicks) 컬럼 추가
-- 신규 수집분부터 채워짐, 과거 데이터는 NULL
ALTER TABLE meta_daily_stats
  ADD COLUMN inline_link_clicks bigint;
