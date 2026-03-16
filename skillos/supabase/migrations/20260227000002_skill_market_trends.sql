-- Skill Market Trends — stores aggregated demand data from Chrome extension scraping

CREATE TABLE IF NOT EXISTS public.skill_market_trends (
  skill TEXT PRIMARY KEY,
  demand_score NUMERIC NOT NULL DEFAULT 0,
  job_count INTEGER NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'extension',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.skill_market_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read trends" ON public.skill_market_trends
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service upsert" ON public.skill_market_trends
  FOR ALL TO service_role USING (true);
