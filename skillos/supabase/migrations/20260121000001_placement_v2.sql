-- Enhanced Placement Prep Schema v2
-- Migration: 20260121000001_placement_v2.sql

-- =====================================================
-- 1. Interview Sessions (with voice/text recordings)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.placement_profiles(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('technical', 'behavioral', 'hr', 'system_design', 'coding')),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  company_context TEXT, -- Target company for contextual questions
  questions JSONB DEFAULT '[]',
  answers JSONB DEFAULT '[]',
  scores JSONB DEFAULT '[]',
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  duration_seconds INTEGER,
  ai_feedback TEXT,
  strengths JSONB DEFAULT '[]',
  improvement_areas JSONB DEFAULT '[]',
  follow_up_resources JSONB DEFAULT '[]',
  voice_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. Flashcards (SM-2 Spaced Repetition)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.placement_profiles(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- technical, behavioral, domain
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  next_review TIMESTAMPTZ DEFAULT NOW(),
  ease_factor REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  reviews_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  last_reviewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. Company Research Cache 
-- =====================================================
CREATE TABLE IF NOT EXISTS public.company_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL, -- lowercase, no spaces
  research_data JSONB NOT NULL,
  interview_patterns JSONB DEFAULT '{}',
  culture_summary TEXT,
  salary_data JSONB DEFAULT '{}',
  recent_news JSONB DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(normalized_name)
);

-- =====================================================
-- 4. Deep Role Analysis Cache
-- =====================================================
CREATE TABLE IF NOT EXISTS public.role_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL,
  normalized_role TEXT NOT NULL, -- lowercase
  location TEXT,
  analysis_data JSONB NOT NULL,
  salary_benchmarks JSONB DEFAULT '{}',
  skill_trends JSONB DEFAULT '[]',
  top_companies JSONB DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(normalized_role, location)
);

-- =====================================================
-- 5. User Progress Tracking (aggregated stats)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.placement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.placement_profiles(id) ON DELETE CASCADE,
  total_interviews INTEGER DEFAULT 0,
  avg_interview_score REAL DEFAULT 0,
  total_flashcards_reviewed INTEGER DEFAULT 0,
  flashcard_accuracy REAL DEFAULT 0,
  study_streak_days INTEGER DEFAULT 0,
  last_study_date DATE,
  readiness_score INTEGER DEFAULT 0 CHECK (readiness_score >= 0 AND readiness_score <= 100),
  predicted_success_rate REAL,
  weak_areas JSONB DEFAULT '[]',
  strong_areas JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, profile_id)
);

-- =====================================================
-- 6. Add columns to existing placement_profiles
-- =====================================================
ALTER TABLE public.placement_profiles 
  ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'entry' CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive')),
  ADD COLUMN IF NOT EXISTS target_location TEXT,
  ADD COLUMN IF NOT EXISTS target_salary_min INTEGER,
  ADD COLUMN IF NOT EXISTS target_salary_max INTEGER,
  ADD COLUMN IF NOT EXISTS required_skills JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS interview_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'preparing', 'interviewing', 'completed', 'paused')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- Row Level Security
-- =====================================================
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_progress ENABLE ROW LEVEL SECURITY;

-- Interview Sessions policies
CREATE POLICY "Users view own interview sessions" ON public.interview_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own interview sessions" ON public.interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own interview sessions" ON public.interview_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Flashcards policies
CREATE POLICY "Users view own flashcards" ON public.flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own flashcards" ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own flashcards" ON public.flashcards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own flashcards" ON public.flashcards FOR DELETE USING (auth.uid() = user_id);

-- Company research (public read, restricted write)
CREATE POLICY "Anyone can read company research" ON public.company_research FOR SELECT USING (true);
CREATE POLICY "Service role inserts company research" ON public.company_research FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role updates company research" ON public.company_research FOR UPDATE USING (true);

-- Role analysis cache (public read)
CREATE POLICY "Anyone can read role analysis" ON public.role_analysis_cache FOR SELECT USING (true);
CREATE POLICY "Service role inserts role analysis" ON public.role_analysis_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role updates role analysis" ON public.role_analysis_cache FOR UPDATE USING (true);

-- Placement progress
CREATE POLICY "Users view own progress" ON public.placement_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.placement_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.placement_progress FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_profile ON public.interview_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON public.flashcards(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_company_research_name ON public.company_research(normalized_name);
CREATE INDEX IF NOT EXISTS idx_role_analysis_role ON public.role_analysis_cache(normalized_role);
CREATE INDEX IF NOT EXISTS idx_placement_progress_user ON public.placement_progress(user_id);

-- =====================================================
-- Function: Update flashcard after review (SM-2)
-- =====================================================
CREATE OR REPLACE FUNCTION update_flashcard_review(
  p_flashcard_id UUID,
  p_quality INTEGER -- 0-5 rating
) RETURNS VOID AS $$
DECLARE
  v_ease REAL;
  v_interval INTEGER;
  v_reviews INTEGER;
BEGIN
  SELECT ease_factor, interval_days, reviews_count INTO v_ease, v_interval, v_reviews
  FROM public.flashcards WHERE id = p_flashcard_id;
  
  -- SM-2 Algorithm
  IF p_quality >= 3 THEN
    IF v_reviews = 0 THEN
      v_interval := 1;
    ELSIF v_reviews = 1 THEN
      v_interval := 6;
    ELSE
      v_interval := ROUND(v_interval * v_ease);
    END IF;
  ELSE
    v_interval := 1;
  END IF;
  
  v_ease := v_ease + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
  IF v_ease < 1.3 THEN v_ease := 1.3; END IF;
  
  UPDATE public.flashcards SET
    ease_factor = v_ease,
    interval_days = v_interval,
    reviews_count = v_reviews + 1,
    correct_count = correct_count + CASE WHEN p_quality >= 3 THEN 1 ELSE 0 END,
    next_review = NOW() + (v_interval || ' days')::INTERVAL,
    last_reviewed = NOW()
  WHERE id = p_flashcard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
