-- Learning Pathways: stores AI-generated learning plans per user
CREATE TABLE public.learning_pathways (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    pathway_data JSONB NOT NULL,
    target_role TEXT,
    progress_data JSONB DEFAULT '{}'
);

ALTER TABLE public.learning_pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pathways" ON public.learning_pathways
    FOR ALL USING (auth.uid() = user_id);
