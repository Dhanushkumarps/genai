-- User Activity & Stats Tracking
-- Tables for tracking streaks, XP, study sessions, and achievements

-- Daily activity log for streak tracking
CREATE TABLE IF NOT EXISTS public.daily_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Study metrics
    study_minutes INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    skills_practiced TEXT[] DEFAULT '{}',
    
    -- Focus sessions
    focus_sessions_count INTEGER DEFAULT 0,
    focus_total_minutes INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, activity_date)
);

-- User stats summary (calculated/cached)
CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Streak tracking
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    
    -- Totals
    total_xp INTEGER DEFAULT 0,
    total_study_minutes INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    total_focus_sessions INTEGER DEFAULT 0,
    
    -- Levels
    current_level INTEGER DEFAULT 1,
    xp_to_next_level INTEGER DEFAULT 100,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Achievements/badges unlocked
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    achievement_type TEXT NOT NULL, -- 'streak', 'xp', 'tasks', 'skill', 'milestone'
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    xp_reward INTEGER DEFAULT 0,
    icon TEXT,
    
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, achievement_type, achievement_name)
);

-- Focus session logs
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    session_type TEXT NOT NULL CHECK (session_type IN ('25', '50', 'custom')),
    duration_minutes INTEGER NOT NULL,
    completed BOOLEAN DEFAULT false,
    
    skill_practiced TEXT,
    notes TEXT,
    
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own activity" ON public.daily_activity FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own stats" ON public.user_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sessions" ON public.focus_sessions FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON public.daily_activity(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON public.focus_sessions(user_id);

-- Function to calculate and update streak
CREATE OR REPLACE FUNCTION calculate_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_streak INTEGER := 0;
    v_date DATE := CURRENT_DATE;
    v_has_activity BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM public.daily_activity 
            WHERE user_id = p_user_id 
            AND activity_date = v_date 
            AND (study_minutes > 0 OR tasks_completed > 0)
        ) INTO v_has_activity;
        
        IF v_has_activity THEN
            v_streak := v_streak + 1;
            v_date := v_date - 1;
        ELSE
            EXIT;
        END IF;
    END LOOP;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql;

-- Function to log activity and update stats
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_study_minutes INTEGER DEFAULT 0,
    p_xp_earned INTEGER DEFAULT 0,
    p_task_completed BOOLEAN DEFAULT false,
    p_skill TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_streak INTEGER;
BEGIN
    -- Upsert daily activity
    INSERT INTO public.daily_activity (user_id, activity_date, study_minutes, xp_earned, tasks_completed, skills_practiced)
    VALUES (p_user_id, CURRENT_DATE, p_study_minutes, p_xp_earned, CASE WHEN p_task_completed THEN 1 ELSE 0 END, 
            CASE WHEN p_skill IS NOT NULL THEN ARRAY[p_skill] ELSE '{}' END)
    ON CONFLICT (user_id, activity_date) 
    DO UPDATE SET 
        study_minutes = daily_activity.study_minutes + EXCLUDED.study_minutes,
        xp_earned = daily_activity.xp_earned + EXCLUDED.xp_earned,
        tasks_completed = daily_activity.tasks_completed + EXCLUDED.tasks_completed,
        skills_practiced = array_cat(daily_activity.skills_practiced, EXCLUDED.skills_practiced),
        updated_at = now();
    
    -- Calculate streak
    v_streak := calculate_streak(p_user_id);
    
    -- Update user stats
    INSERT INTO public.user_stats (user_id, current_streak, total_xp, total_study_minutes, total_tasks_completed, last_active_date)
    VALUES (p_user_id, v_streak, p_xp_earned, p_study_minutes, CASE WHEN p_task_completed THEN 1 ELSE 0 END, CURRENT_DATE)
    ON CONFLICT (user_id)
    DO UPDATE SET
        current_streak = v_streak,
        longest_streak = GREATEST(user_stats.longest_streak, v_streak),
        total_xp = user_stats.total_xp + EXCLUDED.total_xp,
        total_study_minutes = user_stats.total_study_minutes + EXCLUDED.total_study_minutes,
        total_tasks_completed = user_stats.total_tasks_completed + EXCLUDED.total_tasks_completed,
        last_active_date = CURRENT_DATE,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;
