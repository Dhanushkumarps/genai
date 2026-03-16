-- Interview Sessions table
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    session_config JSONB NOT NULL,
    transcript JSONB NOT NULL DEFAULT '[]',
    evaluation JSONB DEFAULT '{}'
);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interview sessions"
    ON public.interview_sessions
    FOR ALL
    USING (auth.uid() = user_id);
