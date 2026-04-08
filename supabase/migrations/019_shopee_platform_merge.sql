-- 쇼피 플랫폼 통합 마이그레이션
-- reports 테이블의 platform 값을 shopee_inapp → shopee로 업데이트
-- DB 테이블 구조(shopee_accounts, shopee_shopping_stats, shopee_inapp_stats)는 변경 없음

-- 1. reports 테이블: platform 값 업데이트
UPDATE reports
SET platform = 'shopee'
WHERE platform = 'shopee_inapp';

-- 2. reports 테이블: snapshot JSON 내부의 platform 값도 업데이트
UPDATE reports
SET snapshot = jsonb_set(snapshot, '{platform}', '"shopee"')
WHERE platform = 'shopee'
  AND snapshot IS NOT NULL
  AND snapshot->>'platform' = 'shopee_inapp';
