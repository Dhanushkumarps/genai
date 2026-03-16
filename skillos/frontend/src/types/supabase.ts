export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    phone: string | null
                    full_name: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    phone?: string | null
                    full_name?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    phone?: string | null
                    full_name?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "users_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            tasks: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    description: string | null
                    difficulty: number | null
                    priority: string | null
                    status: 'pending' | 'active' | 'completed'
                    created_at: string
                    completed_at: string | null
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    description?: string | null
                    difficulty?: number | null
                    priority?: string | null
                    status?: 'pending' | 'active' | 'completed'
                    created_at?: string
                    completed_at?: string | null
                    deleted_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    description?: string | null
                    difficulty?: number | null
                    priority?: string | null
                    status?: 'pending' | 'active' | 'completed'
                    created_at?: string
                    completed_at?: string | null
                    deleted_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "tasks_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            learning_logs: {
                Row: {
                    id: string
                    user_id: string
                    content: string
                    tags: string[]
                    embedding: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    content: string
                    tags?: string[]
                    embedding?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    content?: string
                    tags?: string[]
                    embedding?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "learning_logs_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            system_stats: {
                Row: {
                    id: string
                    user_id: string
                    cognitive_load: number | null
                    energy_level: number | null
                    session_started_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    cognitive_load?: number | null
                    energy_level?: number | null
                    session_started_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    cognitive_load?: number | null
                    energy_level?: number | null
                    session_started_at?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "system_stats_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            brain_dumps: {
                Row: {
                    id: string
                    user_id: string
                    content: string
                    type: 'stress' | 'thoughts' | 'worries' | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    content: string
                    type?: 'stress' | 'thoughts' | 'worries' | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    content?: string
                    type?: 'stress' | 'thoughts' | 'worries' | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "brain_dumps_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            placement_profiles: {
                Row: {
                    id: string
                    user_id: string
                    target_role: string
                    target_company: string | null
                    experience_level: string
                    current_skills: Json
                    required_skills: Json
                    skill_gaps: Json
                    timeline_weeks: number
                    status: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    target_role: string
                    target_company?: string | null
                    experience_level?: string
                    current_skills?: Json
                    required_skills?: Json
                    skill_gaps?: Json
                    timeline_weeks?: number
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    target_role?: string
                    target_company?: string | null
                    experience_level?: string
                    current_skills?: Json
                    required_skills?: Json
                    skill_gaps?: Json
                    timeline_weeks?: number
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            learning_plans: {
                Row: {
                    id: string
                    user_id: string
                    profile_id: string
                    week_number: number
                    daily_plan: Json
                    resources: Json
                    status: string
                    version: number
                    progress_percent: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    profile_id: string
                    week_number?: number
                    daily_plan?: Json
                    resources?: Json
                    status?: string
                    version?: number
                    progress_percent?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    profile_id?: string
                    week_number?: number
                    daily_plan?: Json
                    resources?: Json
                    status?: string
                    version?: number
                    progress_percent?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            mock_interviews: {
                Row: {
                    id: string
                    user_id: string
                    profile_id: string
                    interview_type: string
                    difficulty: string
                    questions: Json
                    overall_score: number | null
                    feedback: string | null
                    tips: string[] | null
                    areas_to_improve: Json
                    audio_url: string | null
                    duration_seconds: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    profile_id: string
                    interview_type?: string
                    difficulty?: string
                    questions?: Json
                    overall_score?: number | null
                    feedback?: string | null
                    tips?: string[] | null
                    areas_to_improve?: Json
                    audio_url?: string | null
                    duration_seconds?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    profile_id?: string
                    interview_type?: string
                    difficulty?: string
                    questions?: Json
                    overall_score?: number | null
                    feedback?: string | null
                    tips?: string[] | null
                    areas_to_improve?: Json
                    audio_url?: string | null
                    duration_seconds?: number | null
                    created_at?: string
                }
                Relationships: []
            }
            skill_progress: {
                Row: {
                    id: string
                    user_id: string
                    profile_id: string
                    skill_name: string
                    initial_level: number
                    current_level: number
                    target_level: number
                    practice_count: number
                    last_practiced: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    profile_id: string
                    skill_name: string
                    initial_level?: number
                    current_level?: number
                    target_level?: number
                    practice_count?: number
                    last_practiced?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    profile_id?: string
                    skill_name?: string
                    initial_level?: number
                    current_level?: number
                    target_level?: number
                    practice_count?: number
                    last_practiced?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            browsing_sessions: {
                Row: {
                    id: string
                    user_id: string
                    started_at: string
                    ended_at: string | null
                    pages_visited: number
                    notes_created: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    started_at?: string
                    ended_at?: string | null
                    pages_visited?: number
                    notes_created?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    started_at?: string
                    ended_at?: string | null
                    pages_visited?: number
                    notes_created?: number
                    created_at?: string
                }
                Relationships: []
            }
            smart_notes: {
                Row: {
                    id: string
                    user_id: string
                    session_id: string | null
                    title: string
                    content: string
                    sources: Json
                    is_favorite: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    session_id?: string | null
                    title: string
                    content: string
                    sources?: Json
                    is_favorite?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    session_id?: string | null
                    title?: string
                    content?: string
                    sources?: Json
                    is_favorite?: boolean
                    created_at?: string
                }
                Relationships: []
            }
            break_logs: {
                Row: {
                    id: string
                    user_id: string
                    break_type: string
                    duration_seconds: number
                    completed: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    break_type: string
                    duration_seconds?: number
                    completed?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    break_type?: string
                    duration_seconds?: number
                    completed?: boolean
                    created_at?: string
                }
                Relationships: []
            }
            panic_events: {
                Row: {
                    id: string
                    user_id: string
                    type: string
                    severity: number
                    resolved: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    type: string
                    severity?: number
                    resolved?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    type?: string
                    severity?: number
                    resolved?: boolean
                    created_at?: string
                }
                Relationships: []
            }
            skill_market_trends: {
                Row: {
                    id: string
                    skill: string
                    demand_score: number
                    job_count: number
                    source: string
                    updated_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    skill: string
                    demand_score?: number
                    job_count?: number
                    source?: string
                    updated_at?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    skill?: string
                    demand_score?: number
                    job_count?: number
                    source?: string
                    updated_at?: string
                    created_at?: string
                }
                Relationships: []
            }
            learning_pathways: {
                Row: {
                    id: string
                    user_id: string
                    created_at: string
                    pathway_data: Json
                    target_role: string | null
                    progress_data: Json
                }
                Insert: {
                    id?: string
                    user_id: string
                    created_at?: string
                    pathway_data: Json
                    target_role?: string | null
                    progress_data?: Json
                }
                Update: {
                    id?: string
                    user_id?: string
                    created_at?: string
                    pathway_data?: Json
                    target_role?: string | null
                    progress_data?: Json
                }
                Relationships: []
            }
            interview_sessions: {
                Row: {
                    id: string
                    user_id: string
                    created_at: string
                    session_config: Json
                    transcript: Json
                    evaluation: Json
                }
                Insert: {
                    id?: string
                    user_id: string
                    created_at?: string
                    session_config: Json
                    transcript: Json
                    evaluation?: Json
                }
                Update: {
                    id?: string
                    user_id?: string
                    created_at?: string
                    session_config?: Json
                    transcript?: Json
                    evaluation?: Json
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            match_learning_logs: {
                Args: {
                    query_embedding: string
                    match_threshold: number
                    match_count: number
                }
                Returns: {
                    id: string
                    content: string
                    similarity: number
                }[]
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
