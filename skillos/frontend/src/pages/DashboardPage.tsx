import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import MacWindow from '@/components/ui/MacWindow'
import { PixelCanvas } from '@/components/ui/pixel-canvas'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import {
    Flame, Trophy, Clock, Target, ChevronRight, Play, Pause,
    BookOpen, Zap, Star, CheckCircle, Sparkles, TrendingUp,
    Calendar, ArrowRight, RotateCcw, Award, Rocket
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserStats {
    current_streak: number
    longest_streak: number
    total_xp: number
    total_study_minutes: number
    total_tasks_completed: number
    current_level: number
}

interface DailyActivity {
    study_minutes: number
    xp_earned: number
    tasks_completed: number
    skills_practiced: string[]
}

interface Achievement {
    achievement_name: string
    achievement_type: string
    xp_reward: number
    unlocked_at: string
}

export default function DashboardPage() {
    const { user } = useAuth()
    const navigate = useNavigate()

    // Data states
    const [profile, setProfile] = useState<any>(null)
    const [learningPath, setLearningPath] = useState<any>(null)
    const [tasks, setTasks] = useState<any[]>([])
    const [userStats, setUserStats] = useState<UserStats | null>(null)
    const [todayActivity, setTodayActivity] = useState<DailyActivity | null>(null)
    const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([])
    const [recentSessions, setRecentSessions] = useState<any[]>([])

    // Focus session state
    const [sessionActive, setSessionActive] = useState(false)
    const [sessionSeconds, setSessionSeconds] = useState(0)
    const [sessionType, setSessionType] = useState<25 | 50>(25)
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

    // Loading state
    const [loading, setLoading] = useState(true)

    // Fetch all dashboard data
    const fetchDashboardData = useCallback(async () => {
        if (!user) return
        setLoading(true)

        try {
            // Fetch user skill profile
            const { data: profileData } = await (supabase as any)
                .from('user_skill_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single()
            if (profileData) setProfile(profileData)

            // Fetch active learning path
            const { data: pathData } = await (supabase as any)
                .from('learning_paths')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single()
            if (pathData) setLearningPath(pathData)

            // Fetch tasks
            const { data: tasksData } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5)
            if (tasksData) setTasks(tasksData)

            // Fetch user stats
            const { data: statsData } = await (supabase as any)
                .from('user_stats')
                .select('*')
                .eq('user_id', user.id)
                .single()
            if (statsData) {
                setUserStats(statsData)
            } else {
                // Initialize stats if not exists
                await (supabase as any).from('user_stats').insert({
                    user_id: user.id,
                    current_streak: 0,
                    longest_streak: 0,
                    total_xp: 0,
                    total_study_minutes: 0,
                    total_tasks_completed: 0,
                    current_level: 1
                })
                setUserStats({
                    current_streak: 0,
                    longest_streak: 0,
                    total_xp: 0,
                    total_study_minutes: 0,
                    total_tasks_completed: 0,
                    current_level: 1
                })
            }

            // Fetch today's activity
            const today = new Date().toISOString().split('T')[0]
            const { data: activityData } = await (supabase as any)
                .from('daily_activity')
                .select('*')
                .eq('user_id', user.id)
                .eq('activity_date', today)
                .single()
            if (activityData) {
                setTodayActivity(activityData)
            } else {
                setTodayActivity({
                    study_minutes: 0,
                    xp_earned: 0,
                    tasks_completed: 0,
                    skills_practiced: []
                })
            }

            // Fetch recent achievements
            const { data: achievementsData } = await (supabase as any)
                .from('achievements')
                .select('*')
                .eq('user_id', user.id)
                .order('unlocked_at', { ascending: false })
                .limit(5)
            if (achievementsData) setRecentAchievements(achievementsData)

            // Fetch recent focus sessions (last 7 days)
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            const { data: sessionsData } = await (supabase as any)
                .from('focus_sessions')
                .select('*')
                .eq('user_id', user.id)
                .gte('started_at', weekAgo.toISOString())
                .order('started_at', { ascending: false })
                .limit(10)
            if (sessionsData) setRecentSessions(sessionsData)

        } catch (err) {
            console.error('Error fetching dashboard data:', err)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

    // Session timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null
        if (sessionActive) {
            interval = setInterval(() => {
                setSessionSeconds(prev => {
                    if (prev >= sessionType * 60) {
                        // Session complete - log it
                        completeSession()
                        return 0
                    }
                    return prev + 1
                })
            }, 1000)
        }
        return () => { if (interval) clearInterval(interval) }
    }, [sessionActive, sessionType])

    // Start a focus session
    const startSession = async () => {
        if (!user) return

        const { data, error } = await (supabase as any)
            .from('focus_sessions')
            .insert({
                user_id: user.id,
                session_type: sessionType.toString(),
                duration_minutes: sessionType,
                completed: false
            })
            .select()
            .single()

        if (!error && data) {
            setCurrentSessionId(data.id)
            setSessionActive(true)
            setSessionSeconds(0)
        }
    }

    // Complete a focus session
    const completeSession = async () => {
        if (!user || !currentSessionId) return

        const minutesCompleted = Math.floor(sessionSeconds / 60)
        const xpEarned = minutesCompleted * 2 // 2 XP per minute

        // Update session record
        await (supabase as any)
            .from('focus_sessions')
            .update({
                completed: true,
                ended_at: new Date().toISOString()
            })
            .eq('id', currentSessionId)

        // Log activity
        await logActivity(minutesCompleted, xpEarned)

        setSessionActive(false)
        setCurrentSessionId(null)
        setSessionSeconds(0)

        // Refresh data
        fetchDashboardData()
    }

    // Stop session early
    const stopSession = async () => {
        if (!user || !currentSessionId) return

        const minutesCompleted = Math.floor(sessionSeconds / 60)
        const xpEarned = minutesCompleted * 1 // 1 XP per minute for incomplete

        // Update session record (not marked completed)
        await (supabase as any)
            .from('focus_sessions')
            .update({
                ended_at: new Date().toISOString(),
                duration_minutes: minutesCompleted
            })
            .eq('id', currentSessionId)

        if (minutesCompleted > 0) {
            await logActivity(minutesCompleted, xpEarned)
        }

        setSessionActive(false)
        setCurrentSessionId(null)
        setSessionSeconds(0)

        fetchDashboardData()
    }

    // Log user activity
    const logActivity = async (studyMinutes: number, xpEarned: number) => {
        if (!user) return

        const today = new Date().toISOString().split('T')[0]

        // Upsert daily activity
        const { data: existing } = await (supabase as any)
            .from('daily_activity')
            .select('*')
            .eq('user_id', user.id)
            .eq('activity_date', today)
            .single()

        if (existing) {
            await (supabase as any)
                .from('daily_activity')
                .update({
                    study_minutes: existing.study_minutes + studyMinutes,
                    xp_earned: existing.xp_earned + xpEarned,
                    focus_sessions_count: existing.focus_sessions_count + 1,
                    focus_total_minutes: existing.focus_total_minutes + studyMinutes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
        } else {
            await (supabase as any)
                .from('daily_activity')
                .insert({
                    user_id: user.id,
                    activity_date: today,
                    study_minutes: studyMinutes,
                    xp_earned: xpEarned,
                    focus_sessions_count: 1,
                    focus_total_minutes: studyMinutes
                })
        }

        // Update user stats
        const { data: stats } = await (supabase as any)
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (stats) {
            // Calculate streak
            const streak = await calculateStreak()

            await (supabase as any)
                .from('user_stats')
                .update({
                    total_xp: stats.total_xp + xpEarned,
                    total_study_minutes: stats.total_study_minutes + studyMinutes,
                    total_focus_sessions: stats.total_focus_sessions + 1,
                    current_streak: streak,
                    longest_streak: Math.max(stats.longest_streak, streak),
                    last_active_date: today,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
        }
    }

    // Calculate streak from daily activity
    const calculateStreak = async (): Promise<number> => {
        if (!user) return 0

        const { data: activities } = await (supabase as any)
            .from('daily_activity')
            .select('activity_date, study_minutes')
            .eq('user_id', user.id)
            .order('activity_date', { ascending: false })
            .limit(30)

        if (!activities || activities.length === 0) return 0

        let streak = 0
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today)
            checkDate.setDate(checkDate.getDate() - i)
            const dateStr = checkDate.toISOString().split('T')[0]

            const dayActivity = activities.find((a: any) => a.activity_date === dateStr)
            if (dayActivity && dayActivity.study_minutes > 0) {
                streak++
            } else if (i > 0) { // Allow missing today
                break
            }
        }

        return streak
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 18) return 'Good afternoon'
        return 'Good evening'
    }

    const currentMilestone = learningPath?.milestones?.[learningPath?.current_milestone || 0]

    // Calculate daily goal progress
    const dailyGoalMinutes = profile?.hours_per_week ? (profile.hours_per_week * 60) / 7 : 60
    const dailyProgress = todayActivity ? (todayActivity.study_minutes / dailyGoalMinutes) * 100 : 0

    // Build recent activity from real data
    const buildRecentActivity = () => {
        const activities: any[] = []

        // Add recent achievements
        recentAchievements.slice(0, 2).forEach(a => {
            activities.push({
                type: 'achievement',
                title: a.achievement_name,
                xp: a.xp_reward,
                time: formatRelativeTime(a.unlocked_at)
            })
        })

        // Add recent completed sessions
        recentSessions.filter(s => s.completed).slice(0, 2).forEach(s => {
            activities.push({
                type: 'session',
                title: `Completed ${s.duration_minutes}min focus session`,
                xp: s.duration_minutes * 2,
                time: formatRelativeTime(s.ended_at)
            })
        })

        // Add from tasks completed today
        const completedTasks = tasks.filter(t => t.status === 'completed')
        completedTasks.slice(0, 2).forEach(t => {
            activities.push({
                type: 'task',
                title: `Completed: ${t.title}`,
                xp: (t.difficulty || 1) * 10,
                time: formatRelativeTime(t.updated_at)
            })
        })

        return activities.slice(0, 5)
    }

    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays === 1) return 'Yesterday'
        return `${diffDays} days ago`
    }

    // Get week activity for calendar
    const getWeekActivity = () => {
        const today = new Date()
        const dayOfWeek = today.getDay() || 7 // Convert Sunday (0) to 7
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - dayOfWeek + 1)

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(weekStart)
            date.setDate(weekStart.getDate() + i)
            const dateStr = date.toISOString().split('T')[0]
            const isToday = dateStr === today.toISOString().split('T')[0]
            const isPast = date < today && !isToday

            // Check if there was activity on this day (from streak logic)
            const hasActivity = userStats && userStats.current_streak > 0 &&
                isPast && (dayOfWeek - i - 1) < userStats.current_streak

            return { date, isToday, isPast, hasActivity, dayOfMonth: date.getDate() }
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-[#C49B3A] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const recentActivity = buildRecentActivity()
    const weekDays = getWeekActivity()

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
            {/* Hero Section - Today's Mission */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A1D20] via-[#1E2227] to-[#1A1D20] border border-[rgba(255,255,255,0.06)] p-6">
                <PixelCanvas gap={12} speed={25} colors={["#C49B3A15", "#C49B3A08"]} noFocus />

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[#C49B3A] text-sm font-medium">🎯 Today's Mission</span>
                            {userStats && userStats.current_streak > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-[rgba(196,155,58,0.15)] rounded-full text-xs text-[#C49B3A]">
                                    <Flame className="w-3 h-3" />
                                    {userStats.current_streak} day streak
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-semibold text-[#E8E6E3] mb-2">
                            {getGreeting()}, {user?.email?.split('@')[0] || 'Learner'}!
                        </h1>
                        <p className="text-[#9A9996] text-sm max-w-md">
                            {currentMilestone
                                ? `Continue working on: ${currentMilestone.title}`
                                : profile?.learning_goals
                                    ? `Focus: ${profile.learning_goals.slice(0, 80)}...`
                                    : 'Ready to level up your skills today?'
                            }
                        </p>

                        <div className="flex gap-3 mt-4">
                            <Button
                                className="bg-[#C49B3A] hover:bg-[#D4AB4A] text-black gap-2"
                                onClick={startSession}
                                disabled={sessionActive}
                            >
                                <Play className="w-4 h-4" />
                                Start Learning Session
                            </Button>
                            <Button
                                variant="secondary"
                                className="gap-2"
                                onClick={() => navigate('/tasks')}
                            >
                                View Tasks
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Daily progress ring */}
                    <div className="hidden md:flex flex-col items-center">
                        <div className="relative w-28 h-28">
                            <svg className="w-28 h-28 -rotate-90">
                                <circle cx="56" cy="56" r="48" stroke="#23262A" strokeWidth="8" fill="none" />
                                <circle
                                    cx="56" cy="56" r="48"
                                    stroke="#C49B3A"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${Math.min(dailyProgress, 100) * 3.01} 301`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-[#E8E6E3]">{todayActivity?.study_minutes || 0}m</span>
                                <span className="text-[10px] text-[#6B6966]">of {Math.round(dailyGoalMinutes)}m goal</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats - Real Data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: Flame, label: 'Day Streak', value: userStats?.current_streak || 0, suffix: ' days', color: '#F59E0B' },
                    { icon: Zap, label: 'XP Today', value: todayActivity?.xp_earned || 0, suffix: ' XP', color: '#8B5CF6' },
                    { icon: Clock, label: 'Study Time', value: todayActivity?.study_minutes || 0, suffix: 'm', color: '#10B981' },
                    { icon: TrendingUp, label: 'Total XP', value: userStats?.total_xp || 0, suffix: '', color: '#3B82F6' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative group bg-[#1A1D20] border border-[rgba(255,255,255,0.04)] rounded-xl p-4 hover:border-[rgba(255,255,255,0.08)] transition-all overflow-hidden"
                    >
                        <PixelCanvas gap={10} speed={15} colors={[stat.color + '15', stat.color + '08']} noFocus />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.color + '20' }}>
                                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                                </div>
                            </div>
                            <p className="text-[#E8E6E3] text-xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {stat.value}{stat.suffix}
                            </p>
                            <p className="text-[#6B6966] text-xs uppercase tracking-wide mt-1">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-5">
                    {/* What's Next Card */}
                    <MacWindow title="What's Next" icon={<Rocket className="w-4 h-4" />}>
                        <div className="p-5">
                            {currentMilestone ? (
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-[#E8E6E3] font-semibold text-lg">{currentMilestone.title}</h3>
                                            <p className="text-[#6B6966] text-sm mt-1">{currentMilestone.description}</p>
                                        </div>
                                        <span className="px-2 py-1 bg-[rgba(196,155,58,0.15)] rounded text-xs text-[#C49B3A] font-medium">
                                            Week {currentMilestone.estimatedWeeks || 1}
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs text-[#6B6966] mb-1">
                                            <span>Progress</span>
                                            <span>{Math.round(learningPath?.completion_percentage || 0)}%</span>
                                        </div>
                                        <div className="h-2 bg-[#23262A] rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-[#C49B3A] to-[#E8C547] rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${learningPath?.completion_percentage || 0}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {currentMilestone.skills?.slice(0, 4).map((skill: string, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-[#23262A] rounded-lg text-xs text-[#9A9996]">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>

                                    <Button className="w-full bg-[#23262A] hover:bg-[#2A2E33] text-[#E8E6E3] gap-2" onClick={() => navigate('/learning', { state: { autoLoad: true } })}>
                                        Continue Learning
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Sparkles className="w-10 h-10 text-[#C49B3A] mx-auto mb-3" />
                                    <h3 className="text-[#E8E6E3] font-semibold mb-1">No Learning Path Yet</h3>
                                    <p className="text-[#6B6966] text-sm mb-4">Complete onboarding to get your personalized path</p>
                                    <Button onClick={() => navigate('/onboarding')} className="gap-2">
                                        Configure Learning Path
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </MacWindow>

                    {/* Recommended Tasks */}
                    <MacWindow title="Recommended Tasks" icon={<Target className="w-4 h-4" />}>
                        <div className="p-5">
                            {tasks.length > 0 ? (
                                <div className="space-y-2">
                                    {tasks.slice(0, 4).map((task, i) => (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#23262A] transition-all group cursor-pointer"
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                task.status === 'completed'
                                                    ? "bg-[#5A9A5A] border-[#5A9A5A]"
                                                    : "border-[#4A4845] group-hover:border-[#C49B3A]"
                                            )}>
                                                {task.status === 'completed' && <CheckCircle className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className={cn(
                                                    "text-sm font-medium",
                                                    task.status === 'completed' ? "text-[#6B6966] line-through" : "text-[#E8E6E3]"
                                                )}>
                                                    {task.title}
                                                </p>
                                            </div>
                                            <span className="text-xs px-2 py-1 rounded bg-[rgba(255,255,255,0.04)] text-[#6B6966]">
                                                +{(task.difficulty || 1) * 10} XP
                                            </span>
                                        </motion.div>
                                    ))}
                                    <Button
                                        variant="ghost"
                                        className="w-full text-[#6B6966] hover:text-[#9A9996]"
                                        onClick={() => navigate('/tasks')}
                                    >
                                        View All Tasks →
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-[#6B6966]">
                                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No tasks yet. Create your first task!</p>
                                    <Button
                                        variant="secondary"
                                        className="mt-3"
                                        onClick={() => navigate('/tasks')}
                                    >
                                        Add Task
                                    </Button>
                                </div>
                            )}
                        </div>
                    </MacWindow>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                    {/* Focus Session */}
                    <MacWindow title="Focus Session" icon={<Clock className="w-4 h-4" />}>
                        <div className="p-5">
                            <div className="text-center mb-4">
                                <div className="text-4xl font-bold text-[#E8E6E3] font-mono mb-1">
                                    {sessionActive
                                        ? formatTime(sessionType * 60 - sessionSeconds)
                                        : formatTime(sessionType * 60)
                                    }
                                </div>
                                <p className="text-xs text-[#6B6966]">
                                    {sessionActive ? 'Session in progress...' : 'Ready to focus'}
                                </p>
                            </div>

                            {!sessionActive && (
                                <div className="flex gap-2 mb-4">
                                    {[25, 50].map((mins) => (
                                        <button
                                            key={mins}
                                            onClick={() => setSessionType(mins as 25 | 50)}
                                            className={cn(
                                                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                                                sessionType === mins
                                                    ? "bg-[#C49B3A] text-black"
                                                    : "bg-[#23262A] text-[#9A9996] hover:bg-[#2A2E33]"
                                            )}
                                        >
                                            {mins} min
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    className={cn(
                                        "flex-1 gap-2",
                                        sessionActive ? "bg-[#B85450] hover:bg-[#C86460]" : "bg-[#5A9A5A] hover:bg-[#6AAA6A]"
                                    )}
                                    onClick={sessionActive ? stopSession : startSession}
                                >
                                    {sessionActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    {sessionActive ? 'Stop' : 'Start'}
                                </Button>
                                {sessionActive && (
                                    <Button
                                        variant="secondary"
                                        onClick={stopSession}
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            {/* Session stats */}
                            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
                                <div className="flex justify-between text-xs text-[#6B6966]">
                                    <span>Sessions today</span>
                                    <span className="text-[#E8E6E3]">{recentSessions.filter(s => {
                                        const today = new Date().toISOString().split('T')[0]
                                        return s.started_at?.startsWith(today)
                                    }).length}</span>
                                </div>
                            </div>
                        </div>
                    </MacWindow>

                    {/* Recent Activity */}
                    <MacWindow title="Recent Activity" icon={<Award className="w-4 h-4" />}>
                        <div className="p-5 space-y-3">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((activity, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-start gap-3 p-2"
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            activity.type === 'achievement' ? "bg-[rgba(196,155,58,0.2)]" :
                                                activity.type === 'session' ? "bg-[rgba(90,154,90,0.2)]" :
                                                    "bg-[rgba(139,92,246,0.2)]"
                                        )}>
                                            {activity.type === 'achievement' ? <Trophy className="w-4 h-4 text-[#C49B3A]" /> :
                                                activity.type === 'session' ? <Star className="w-4 h-4 text-[#5A9A5A]" /> :
                                                    <CheckCircle className="w-4 h-4 text-[#8B5CF6]" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[#E8E6E3] truncate">{activity.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-[#C49B3A]">+{activity.xp} XP</span>
                                                <span className="text-xs text-[#4A4845]">•</span>
                                                <span className="text-xs text-[#6B6966]">{activity.time}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-[#6B6966] text-sm">
                                    No recent activity. Start a focus session!
                                </div>
                            )}
                        </div>
                    </MacWindow>

                    {/* Weekly Calendar */}
                    <MacWindow title="This Week" icon={<Calendar className="w-4 h-4" />}>
                        <div className="p-5">
                            <div className="grid grid-cols-7 gap-1">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                                    const dayInfo = weekDays[i]
                                    return (
                                        <div key={i} className="text-center">
                                            <span className="text-[10px] text-[#6B6966]">{day}</span>
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center mt-1 text-xs",
                                                dayInfo.isToday
                                                    ? "bg-[#C49B3A] text-black font-bold"
                                                    : dayInfo.hasActivity
                                                        ? "bg-[#5A9A5A] text-white"
                                                        : dayInfo.isPast
                                                            ? "bg-[#23262A] text-[#6B6966]"
                                                            : "bg-[#1A1D20] text-[#4A4845]"
                                            )}>
                                                {dayInfo.hasActivity && !dayInfo.isToday ? (
                                                    <Flame className="w-3 h-3" />
                                                ) : (
                                                    dayInfo.dayOfMonth
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Streak info */}
                            <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)] flex justify-between text-xs">
                                <span className="text-[#6B6966]">Longest streak</span>
                                <span className="text-[#E8E6E3]">{userStats?.longest_streak || 0} days</span>
                            </div>
                        </div>
                    </MacWindow>
                </div>
            </div>
        </div>
    )
}
