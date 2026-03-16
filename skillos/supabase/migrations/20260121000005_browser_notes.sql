-- Browser Notes and Session Storage
-- Stores screenshots, notes, and browsing sessions for the Learning Browser

-- Browsing sessions
CREATE TABLE IF NOT EXISTS public.browsing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Session info
    title TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    
    -- Stats
    pages_visited INTEGER DEFAULT 0,
    notes_created INTEGER DEFAULT 0,
    ai_interactions INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Browser notes (screenshots + text)
CREATE TABLE IF NOT EXISTS public.browser_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.browsing_sessions(id) ON DELETE SET NULL,
    
    -- Source
    source_url TEXT NOT NULL,
    page_title TEXT,
    
    -- Note content
    note_title TEXT,
    note_content TEXT,
    screenshot_url TEXT, -- Supabase storage URL
    
    -- AI-generated summary
    ai_summary TEXT,
    ai_tags TEXT[] DEFAULT '{}',
    
    -- Metadata
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI chat history for browser assistant
CREATE TABLE IF NOT EXISTS public.browser_chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.browsing_sessions(id) ON DELETE SET NULL,
    
    -- Message
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    
    -- Context
    current_url TEXT,
    
    -- Voice input
    is_voice_input BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Site recommendations
CREATE TABLE IF NOT EXISTS public.site_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Site info
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'documentation', 'tutorial', 'course', 'tool', 'reference'
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    
    -- Quality
    rating FLOAT DEFAULT 0,
    times_recommended INTEGER DEFAULT 0,
    
    -- Learning domains
    domains TEXT[] DEFAULT '{}', -- Maps to skill domains from onboarding
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default learning sites
INSERT INTO public.site_recommendations (url, title, description, category, tags, difficulty, domains) VALUES
('https://developer.mozilla.org', 'MDN Web Docs', 'Comprehensive web development documentation', 'documentation', ARRAY['html', 'css', 'javascript'], 'beginner', ARRAY['software_engineering']),
('https://react.dev', 'React Documentation', 'Official React documentation and tutorials', 'documentation', ARRAY['react', 'javascript', 'frontend'], 'intermediate', ARRAY['software_engineering']),
('https://www.freecodecamp.org', 'freeCodeCamp', 'Free coding bootcamp with certifications', 'course', ARRAY['web', 'javascript', 'python'], 'beginner', ARRAY['software_engineering']),
('https://www.kaggle.com/learn', 'Kaggle Learn', 'Free data science and ML courses', 'course', ARRAY['python', 'ml', 'data-science'], 'beginner', ARRAY['data_science', 'ai_ml']),
('https://huggingface.co/learn', 'Hugging Face Learn', 'NLP and AI tutorials', 'tutorial', ARRAY['nlp', 'transformers', 'python'], 'intermediate', ARRAY['ai_ml']),
('https://www.figma.com/resources/learn-design', 'Figma Learn', 'Design tutorials and resources', 'tutorial', ARRAY['figma', 'ui', 'design'], 'beginner', ARRAY['design']),
('https://roadmap.sh', 'Roadmap.sh', 'Developer roadmaps and learning paths', 'reference', ARRAY['career', 'learning-path'], 'beginner', ARRAY['software_engineering', 'devops']),
('https://leetcode.com', 'LeetCode', 'Coding challenges and interview prep', 'tool', ARRAY['algorithms', 'interviews', 'coding'], 'intermediate', ARRAY['software_engineering']),
('https://docs.python.org', 'Python Documentation', 'Official Python documentation', 'documentation', ARRAY['python'], 'beginner', ARRAY['software_engineering', 'data_science']),
('https://kubernetes.io/docs', 'Kubernetes Docs', 'Container orchestration documentation', 'documentation', ARRAY['kubernetes', 'devops', 'cloud'], 'advanced', ARRAY['devops'])
ON CONFLICT (url) DO NOTHING;

-- Enable RLS
ALTER TABLE public.browsing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own sessions" ON public.browsing_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own notes" ON public.browser_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own chat" ON public.browser_chat_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read recommendations" ON public.site_recommendations FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_browser_notes_user ON public.browser_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_notes_url ON public.browser_notes(source_url);
CREATE INDEX IF NOT EXISTS idx_chat_history_session ON public.browser_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_domains ON public.site_recommendations USING GIN(domains);
