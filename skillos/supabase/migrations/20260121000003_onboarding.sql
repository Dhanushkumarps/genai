-- Onboarding and Skill Profiling System
-- Stores user preferences, skill assessments, and AI-generated learning paths

-- User skill profiles (preferences and goals)
CREATE TABLE IF NOT EXISTS public.user_skill_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Onboarding status
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    
    -- Career domain preferences (multiple allowed)
    career_domains TEXT[] DEFAULT '{}',
    
    -- Learning goals (natural language from voice/text)
    learning_goals TEXT,
    learning_goals_parsed JSONB DEFAULT '{}',
    
    -- Time commitment
    hours_per_week INTEGER DEFAULT 10,
    preferred_times TEXT[] DEFAULT '{}', -- 'morning', 'afternoon', 'evening', 'night'
    
    -- AI-generated profile analysis
    ai_profile_summary TEXT,
    ai_recommended_focus_areas JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Skill self-assessments (before AI analysis)
CREATE TABLE IF NOT EXISTS public.skill_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Skill category and name
    category TEXT NOT NULL, -- 'technical', 'soft_skills', 'domain_knowledge'
    skill_name TEXT NOT NULL,
    
    -- Self-reported level (1-10)
    current_level INTEGER CHECK (current_level >= 1 AND current_level <= 10),
    target_level INTEGER CHECK (target_level >= 1 AND target_level <= 10),
    
    -- Confidence in self-assessment
    confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
    
    -- AI-adjusted values
    ai_estimated_level FLOAT,
    ai_confidence_score FLOAT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, category, skill_name)
);

-- AI-generated learning paths
CREATE TABLE IF NOT EXISTS public.learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Path metadata
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    
    -- Path structure (JSON of milestones and steps)
    milestones JSONB DEFAULT '[]',
    current_milestone INTEGER DEFAULT 0,
    
    -- Duration and progress
    estimated_weeks INTEGER,
    completion_percentage FLOAT DEFAULT 0,
    
    -- AI generation metadata
    ai_model_used TEXT,
    ai_generation_prompt TEXT,
    ai_confidence_score FLOAT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Skill domains reference table
CREATE TABLE IF NOT EXISTS public.skill_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    parent_domain UUID REFERENCES public.skill_domains(id),
    skills JSONB DEFAULT '[]', -- Default skills for this domain
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default skill domains
INSERT INTO public.skill_domains (name, display_name, description, icon, color, skills) VALUES
('software_engineering', 'Software Engineering', 'Build software applications and systems', 'Code', '#3B82F6', '["JavaScript", "Python", "React", "Node.js", "SQL", "Git", "System Design"]'),
('data_science', 'Data Science', 'Extract insights from data using ML and analytics', 'BarChart', '#8B5CF6', '["Python", "Machine Learning", "Statistics", "SQL", "TensorFlow", "Data Visualization"]'),
('product_management', 'Product Management', 'Lead product strategy and development', 'Package', '#EC4899', '["User Research", "Roadmapping", "Agile", "Analytics", "Communication", "Strategy"]'),
('design', 'UI/UX Design', 'Create beautiful and functional user experiences', 'Palette', '#F59E0B', '["Figma", "UI Design", "UX Research", "Prototyping", "Design Systems", "Typography"]'),
('devops', 'DevOps & Cloud', 'Manage infrastructure and deployment pipelines', 'Cloud', '#10B981', '["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform", "Monitoring"]'),
('cybersecurity', 'Cybersecurity', 'Protect systems and data from threats', 'Shield', '#EF4444', '["Network Security", "Penetration Testing", "Cryptography", "Compliance", "Incident Response"]'),
('ai_ml', 'AI & Machine Learning', 'Build intelligent systems and models', 'Brain', '#6366F1', '["Deep Learning", "NLP", "Computer Vision", "PyTorch", "LLMs", "Reinforcement Learning"]'),
('blockchain', 'Blockchain & Web3', 'Develop decentralized applications', 'Blocks', '#14B8A6', '["Solidity", "Smart Contracts", "DeFi", "NFTs", "Ethereum", "Token Economics"]'),
('mobile_dev', 'Mobile Development', 'Build iOS and Android applications', 'Smartphone', '#F97316', '["React Native", "Swift", "Kotlin", "Flutter", "Mobile UI", "App Store Optimization"]'),
('leadership', 'Leadership & Management', 'Lead teams and organizations effectively', 'Users', '#84CC16', '["Team Building", "Strategic Thinking", "Decision Making", "Mentoring", "Conflict Resolution"]')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.user_skill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own profile" ON public.user_skill_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own assessments" ON public.skill_assessments
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own learning paths" ON public.learning_paths
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read skill domains" ON public.skill_domains
    FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_profiles_user ON public.user_skill_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_user ON public.skill_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user ON public.learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_status ON public.learning_paths(status);
