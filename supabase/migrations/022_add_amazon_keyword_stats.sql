-- 아마존 광고 키워드별 데이터 테이블
-- 광고 CSV 업로드 시 검색어(keyword)별로 데이터를 저장
-- 리포트 스냅샷에서 키워드 Top 15 추출에 사용

CREATE TABLE IF NOT EXISTS amazon_ads_keyword_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_account_id UUID NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  keyword TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  sales NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(amazon_account_id, date, keyword)
);

ALTER TABLE amazon_ads_keyword_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amazon_ads_keyword_stats_select" ON amazon_ads_keyword_stats FOR SELECT USING (
  brand_id = get_my_brand_id() OR get_my_role() = 'admin'
);
CREATE POLICY "amazon_ads_keyword_stats_insert" ON amazon_ads_keyword_stats FOR INSERT WITH CHECK (
  get_my_role() = 'admin'
);
CREATE POLICY "amazon_ads_keyword_stats_update" ON amazon_ads_keyword_stats FOR UPDATE USING (
  get_my_role() = 'admin'
);

CREATE INDEX idx_amazon_ads_keyword_stats_account_date ON amazon_ads_keyword_stats(amazon_account_id, date);
