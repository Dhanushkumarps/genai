-- Neural Process Manager, Flow Orchestrator, Skill Manager, Cognitive Firewall
-- Migration for all 5 innovative features

-- =====================================================
-- 1. NEURAL PROCESS MANAGER
-- =====================================================

-- Mental processes (active cognitive threads)
CREATE TABLE IF NOT EXISTS public.mental_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  process_name TEXT NOT NULL,
  process_type TEXT DEFAULT 'task' CHECK (process_type IN ('task', 'thought', 'worry', 'planning', 'background')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  cognitive_load INTEGER DEFAULT 20 CHECK (cognitive_load >= 0 AND cognitive_load <= 100),
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'suspended', 'blocked', 'completed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  context_tags JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Context switches (for tracking "thrashing")
CREATE TABLE IF NOT EXISTS public.context_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_process_id UUID REFERENCES public.mental_processes(id),
  to_process_id UUID REFERENCES public.mental_processes(id),
  switch_cost INTEGER DEFAULT 0, -- Cognitive penalty 0-100
  reason TEXT,
  switched_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. FLOW STATE ORCHESTRATOR
-- =====================================================

-- Flow sessions
CREATE TABLE IF NOT EXISTS public.flow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  peak_depth INTEGER DEFAULT 0 CHECK (peak_depth >= 0 AND peak_depth <= 100),
  duration_minutes INTEGER,
  task_context TEXT,
  interruptions INTEGER DEFAULT 0,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  triggers JSONB DEFAULT '[]', -- What helped enter flow
  breakers JSONB DEFAULT '[]', -- What broke flow
  time_of_day TEXT, -- morning, afternoon, evening, night
  day_of_week INTEGER
);

-- Flow patterns (learned preferences)
CREATE TABLE IF NOT EXISTS public.flow_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'time_preference', 'task_type', 'environment'
  pattern_data JSONB NOT NULL,
  confidence REAL DEFAULT 0.5,
  sample_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pattern_type)
);

-- =====================================================
-- 3. SKILL PACKAGE MANAGER
-- =====================================================

-- User skills with versions
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_category TEXT DEFAULT 'general',
  version REAL DEFAULT 0.0, -- 0.0 to 100.0 proficiency
  last_practiced TIMESTAMPTZ DEFAULT NOW(),
  practice_count INTEGER DEFAULT 0,
  decay_rate REAL DEFAULT 0.1, -- How fast skill decays
  dependencies JSONB DEFAULT '[]', -- Other skills this depends on
  related_skills JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);

-- Skill registry (global skill definitions)
CREATE TABLE IF NOT EXISTS public.skill_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  prerequisites JSONB DEFAULT '[]', -- Required skills with min versions
  difficulty TEXT DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  avg_learning_hours INTEGER DEFAULT 40,
  peer_skills JSONB DEFAULT '[]', -- Commonly learned together
  is_deprecated BOOLEAN DEFAULT FALSE,
  successor_skill TEXT, -- If deprecated, what replaces it
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. COGNITIVE FIREWALL
-- =====================================================

-- Distraction events
CREATE TABLE IF NOT EXISTS public.distraction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  distraction_type TEXT NOT NULL, -- 'website', 'app', 'notification', 'internal'
  distraction_source TEXT, -- URL, app name, etc
  trigger_context TEXT, -- What user was avoiding
  duration_seconds INTEGER,
  was_blocked BOOLEAN DEFAULT FALSE,
  intervention_type TEXT, -- 'blocked', 'delayed', 'breathing', 'allowed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Distraction patterns
CREATE TABLE IF NOT EXISTS public.distraction_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'avoidance', 'time_based', 'emotion_based'
  pattern_data JSONB NOT NULL,
  frequency INTEGER DEFAULT 0,
  last_occurred TIMESTAMPTZ,
  root_cause TEXT,
  suggested_intervention TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. DÉJÀ VU ENGINE (Memory Connections)
-- =====================================================

-- Memory connections (semantic links between content)
CREATE TABLE IF NOT EXISTS public.memory_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'brain_dump', 'learning_log', 'task'
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  similarity_score REAL NOT NULL,
  connection_type TEXT, -- 'semantic', 'temporal', 'causal'
  ai_explanation TEXT,
  surfaced_count INTEGER DEFAULT 0,
  was_helpful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE public.mental_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distraction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distraction_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_connections ENABLE ROW LEVEL SECURITY;

-- User-scoped policies
CREATE POLICY "Users manage own processes" ON public.mental_processes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own switches" ON public.context_switches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own flow sessions" ON public.flow_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own flow patterns" ON public.flow_patterns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own skills" ON public.user_skills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone reads skill registry" ON public.skill_registry FOR SELECT USING (true);
CREATE POLICY "Users manage own distractions" ON public.distraction_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own patterns" ON public.distraction_patterns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own connections" ON public.memory_connections FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_mental_processes_user ON public.mental_processes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_context_switches_user ON public.context_switches(user_id, switched_at);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_user ON public.flow_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_distraction_events_user ON public.distraction_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memory_connections_user ON public.memory_connections(user_id, source_type);

-- =====================================================
-- Seed skill registry with common skills
-- =====================================================

INSERT INTO public.skill_registry (skill_name, category, description, prerequisites, difficulty, avg_learning_hours, peer_skills) VALUES
('JavaScript', 'Programming', 'Core web programming language', '[]', 'beginner', 80, '["HTML", "CSS", "TypeScript"]'),
('TypeScript', 'Programming', 'Typed superset of JavaScript', '[{"skill": "JavaScript", "min_version": 60}]', 'intermediate', 40, '["React", "Node.js"]'),
('React', 'Frontend', 'UI component library', '[{"skill": "JavaScript", "min_version": 70}, {"skill": "HTML", "min_version": 50}]', 'intermediate', 60, '["TypeScript", "Next.js", "Redux"]'),
('Python', 'Programming', 'Versatile programming language', '[]', 'beginner', 60, '["Data Science", "Django", "FastAPI"]'),
('SQL', 'Database', 'Database query language', '[]', 'beginner', 30, '["PostgreSQL", "Database Design"]'),
('System Design', 'Architecture', 'Designing scalable systems', '[{"skill": "Programming", "min_version": 70}]', 'advanced', 100, '["Cloud", "Microservices"]'),
('DSA', 'Computer Science', 'Data Structures and Algorithms', '[{"skill": "Programming", "min_version": 50}]', 'intermediate', 120, '["Problem Solving", "Competitive Programming"]'),
('Communication', 'Soft Skills', 'Professional communication', '[]', 'beginner', 40, '["Public Speaking", "Writing"]'),
('Leadership', 'Soft Skills', 'Leading teams effectively', '[{"skill": "Communication", "min_version": 60}]', 'advanced', 100, '["Management", "Mentoring"]')
ON CONFLICT (skill_name) DO NOTHING;
