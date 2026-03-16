import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

interface PlacementProfile {
    id: string
    target_role: string
    target_company?: string
    experience_level: string
    current_skills: string[]
    required_skills: any[]
    skill_gaps: any[]
    status: string
}

interface LearningPlan {
    weeks: any[]
    resources: any[]
    milestones: any[]
}

interface MockInterviewResult {
    questions?: any[]
    scores?: any[]
    overall_score?: number
    feedback?: string
    tips?: string[]
    areas_to_improve?: string[]
    needs_adaptation?: boolean
    audio_base64?: string
}

// Offline skill requirements database
const ROLE_REQUIREMENTS: Record<string, any> = {
    'frontend developer': {
        required_skills: [
            { name: 'JavaScript', importance: 'critical', category: 'technical' },
            { name: 'React', importance: 'critical', category: 'technical' },
            { name: 'CSS', importance: 'important', category: 'technical' },
            { name: 'TypeScript', importance: 'important', category: 'technical' },
            { name: 'Git', importance: 'important', category: 'technical' },
            { name: 'REST APIs', importance: 'important', category: 'technical' },
            { name: 'Testing', importance: 'nice-to-have', category: 'technical' },
        ],
        interview_topics: ['DOM manipulation', 'React hooks', 'State management', 'Performance optimization', 'Responsive design'],
        common_questions: [
            'Explain the virtual DOM in React',
            'What are React hooks and when would you use each?',
            'How do you optimize React performance?',
            'Explain CSS specificity',
            'What is the difference between var, let, and const?'
        ]
    },
    'backend developer': {
        required_skills: [
            { name: 'Node.js', importance: 'critical', category: 'technical' },
            { name: 'SQL', importance: 'critical', category: 'technical' },
            { name: 'REST APIs', importance: 'critical', category: 'technical' },
            { name: 'Python', importance: 'important', category: 'technical' },
            { name: 'Docker', importance: 'important', category: 'technical' },
            { name: 'AWS', importance: 'nice-to-have', category: 'technical' },
        ],
        interview_topics: ['Database design', 'API architecture', 'Authentication', 'Caching', 'Microservices'],
        common_questions: [
            'Explain RESTful API design principles',
            'How do you handle database transactions?',
            'What is the difference between SQL and NoSQL?',
            'How would you design a rate limiter?',
            'Explain OAuth 2.0 flow'
        ]
    },
    'full stack developer': {
        required_skills: [
            { name: 'JavaScript', importance: 'critical', category: 'technical' },
            { name: 'React', importance: 'critical', category: 'technical' },
            { name: 'Node.js', importance: 'critical', category: 'technical' },
            { name: 'SQL', importance: 'important', category: 'technical' },
            { name: 'TypeScript', importance: 'important', category: 'technical' },
            { name: 'Docker', importance: 'nice-to-have', category: 'technical' },
        ],
        interview_topics: ['Full stack architecture', 'API design', 'Frontend frameworks', 'Database design', 'DevOps basics'],
        common_questions: [
            'How do you structure a full-stack application?',
            'Explain client-server communication',
            'How do you handle authentication?',
            'What is your approach to error handling?',
            'How do you ensure code quality?'
        ]
    },
    'data scientist': {
        required_skills: [
            { name: 'Python', importance: 'critical', category: 'technical' },
            { name: 'Machine Learning', importance: 'critical', category: 'domain' },
            { name: 'SQL', importance: 'important', category: 'technical' },
            { name: 'Statistics', importance: 'critical', category: 'domain' },
            { name: 'Pandas', importance: 'important', category: 'technical' },
            { name: 'TensorFlow/PyTorch', importance: 'important', category: 'technical' },
        ],
        interview_topics: ['ML algorithms', 'Data preprocessing', 'Model evaluation', 'Feature engineering', 'Deep learning'],
        common_questions: [
            'Explain the bias-variance tradeoff',
            'What is overfitting and how do you prevent it?',
            'Explain gradient descent',
            'How do you handle imbalanced datasets?',
            'What metrics would you use to evaluate a classification model?'
        ]
    }
}

function generateQuestions(role: string, difficulty: string): any[] {
    const roleKey = role.toLowerCase()
    const roleData = ROLE_REQUIREMENTS[roleKey] || ROLE_REQUIREMENTS['frontend developer']

    return [
        { id: 1, question: `Tell me about yourself and why you want to be a ${role}.`, difficulty: 'easy', category: 'behavioral' },
        { id: 2, question: roleData.common_questions[0], difficulty: 'medium', category: 'technical' },
        { id: 3, question: roleData.common_questions[1], difficulty: 'medium', category: 'technical' },
        { id: 4, question: roleData.common_questions[2], difficulty: difficulty, category: 'technical' },
        { id: 5, question: 'Where do you see yourself in 5 years?', difficulty: 'easy', category: 'behavioral' },
    ]
}

function scoreAnswers(answers: any[]): any {
    const scores = answers.map((a) => {
        const length = (a.answer || '').length
        let score = Math.min(100, 20 + length / 5)
        if (length < 50) score = Math.max(20, score - 30)

        return {
            question_id: a.question_id,
            score: Math.round(score),
            feedback: length > 100 ? 'Good detailed answer!' : length > 50 ? 'Could be more detailed.' : 'Try to elaborate more.',
            strengths: length > 100 ? ['Detailed response'] : [],
            improvements: length < 100 ? ['Add more specific examples'] : []
        }
    })

    const overall = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length)

    return {
        scores,
        overall_score: overall,
        overall_feedback: overall >= 70 ? 'Great interview performance!' : overall >= 50 ? 'Good start, keep practicing!' : 'More practice needed.',
        areas_to_improve: overall < 70 ? ['Technical depth', 'Specific examples'] : [],
        ready_for_interview: overall >= 70,
        needs_adaptation: overall < 60
    }
}

export function usePlacementAgent() {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentProfile, setCurrentProfile] = useState<PlacementProfile | null>(null)
    const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null)
    const [useOnlineMode, setUseOnlineMode] = useState(true)

    // Try Edge Function, fallback to offline
    const callEdgeFunction = async (action: string, data: any = {}) => {
        if (!useOnlineMode) return null

        try {
            const { data: result, error } = await supabase.functions.invoke('quick-task', {
                body: {
                    action,
                    user_id: user?.id,
                    profile_id: currentProfile?.id,
                    data
                }
            })

            if (error) throw error
            if (!result?.success) throw new Error(result?.error || 'Unknown error')

            return result
        } catch (err) {
            console.warn('Edge function failed, using offline mode:', err)
            setUseOnlineMode(false)
            return null
        }
    }

    // 1. Analyze target role
    const analyzeRole = useCallback(async (role: string, company?: string, experience_level: string = 'entry') => {
        setIsLoading(true)
        setError(null)

        try {
            // Try online first
            const onlineResult = await callEdgeFunction('analyze_role', { role, company, experience_level })

            if (onlineResult) {
                const profile: PlacementProfile = {
                    id: onlineResult.profile_id,
                    target_role: role,
                    target_company: company,
                    experience_level,
                    current_skills: [],
                    required_skills: onlineResult.analysis?.required_skills || [],
                    skill_gaps: [],
                    status: 'active'
                }
                setCurrentProfile(profile)
                return onlineResult
            }

            // Offline fallback
            await new Promise(r => setTimeout(r, 500))
            const roleKey = role.toLowerCase()
            const roleData = ROLE_REQUIREMENTS[roleKey] || ROLE_REQUIREMENTS['frontend developer']

            const profile: PlacementProfile = {
                id: crypto.randomUUID(),
                target_role: role,
                target_company: company,
                experience_level,
                current_skills: [],
                required_skills: roleData.required_skills,
                skill_gaps: [],
                status: 'active'
            }

            setCurrentProfile(profile)

            return {
                profile_id: profile.id,
                analysis: roleData,
                message: `Analyzed ${role} role. Found ${roleData.required_skills.length} required skills.`
            }
        } finally {
            setIsLoading(false)
        }
    }, [user?.id, currentProfile?.id])

    // 2. Analyze skill gaps
    const analyzeSkillGaps = useCallback(async (currentSkills: string[]) => {
        setIsLoading(true)
        setError(null)

        try {
            const onlineResult = await callEdgeFunction('skill_gap', { current_skills: currentSkills })

            if (onlineResult) {
                setCurrentProfile(prev => prev ? { ...prev, current_skills: currentSkills, skill_gaps: onlineResult.gaps } : null)
                return onlineResult
            }

            if (!currentProfile) throw new Error('No profile set')

            const required = currentProfile.required_skills.map((s: any) => s.name.toLowerCase())
            const current = currentSkills.map(s => s.toLowerCase())

            const gaps = currentProfile.required_skills
                .filter((s: any) => !current.includes(s.name.toLowerCase()))
                .map((s: any) => ({
                    skill: s.name,
                    priority: s.importance === 'critical' ? 10 : s.importance === 'important' ? 7 : 4,
                    estimated_hours: s.importance === 'critical' ? 40 : 20,
                    difficulty: 'medium'
                }))

            setCurrentProfile(prev => prev ? { ...prev, current_skills: currentSkills, skill_gaps: gaps } : null)

            return {
                gaps,
                strengths: currentSkills.filter(s => required.includes(s.toLowerCase())),
                learning_order: gaps.map((g: any) => g.skill),
                estimated_hours: gaps.reduce((a: number, g: any) => a + g.estimated_hours, 0),
                message: `Found ${gaps.length} skill gaps.`
            }
        } finally {
            setIsLoading(false)
        }
    }, [currentProfile])

    // 3. Generate learning plan
    const generatePlan = useCallback(async (timelineWeeks: number = 8, hoursPerDay: number = 2) => {
        setIsLoading(true)

        try {
            const onlineResult = await callEdgeFunction('generate_plan', { timeline_weeks: timelineWeeks, hours_per_day: hoursPerDay })

            if (onlineResult?.plan) {
                setLearningPlan(onlineResult.plan)
                return onlineResult
            }

            if (!currentProfile) throw new Error('No profile set')

            const gaps = currentProfile.skill_gaps || []

            const weeks = gaps.slice(0, 4).map((gap: any, i: number) => ({
                week: i + 1,
                focus: gap.skill,
                goals: [`Understand ${gap.skill} fundamentals`, `Complete hands-on exercises`, `Build project`],
                daily_tasks: [
                    { day: 1, tasks: [{ title: `Watch ${gap.skill} tutorial`, duration_mins: 60, type: 'watch' }] },
                    { day: 2, tasks: [{ title: `Read documentation`, duration_mins: 60, type: 'read' }] },
                    { day: 3, tasks: [{ title: `Practice exercises`, duration_mins: 90, type: 'practice' }] },
                ]
            }))

            const plan = {
                weeks,
                resources: [{ title: 'FreeCodeCamp', url: 'https://freecodecamp.org', type: 'course' }],
                milestones: weeks.map((w: any, i: number) => ({ week: i + 1, milestone: `Complete ${w.focus}` }))
            }

            setLearningPlan(plan)
            return { plan, message: `Created ${timelineWeeks}-week learning plan.` }
        } finally {
            setIsLoading(false)
        }
    }, [currentProfile])

    // 4. Start mock interview
    const startMockInterview = useCallback(async (
        type: 'technical' | 'behavioral' | 'hr' = 'technical',
        difficulty: 'easy' | 'medium' | 'hard' = 'medium',
        focusAreas?: string[]
    ): Promise<MockInterviewResult> => {
        setIsLoading(true)

        try {
            const onlineResult = await callEdgeFunction('mock_interview', { interview_type: type, difficulty, focus_areas: focusAreas })
            if (onlineResult?.questions) return onlineResult

            const role = currentProfile?.target_role || 'Frontend Developer'
            return { questions: generateQuestions(role, difficulty), tips: ['Take your time', 'Be specific'] }
        } finally {
            setIsLoading(false)
        }
    }, [currentProfile])

    // 5. Submit interview answers
    const submitInterviewAnswers = useCallback(async (answers: any[]): Promise<MockInterviewResult> => {
        setIsLoading(true)

        try {
            const onlineResult = await callEdgeFunction('mock_interview', { answers })
            if (onlineResult) return onlineResult

            return scoreAnswers(answers)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const adaptPlan = useCallback(async (score: number, areasToImprove: string[]) => {
        const result = await callEdgeFunction('adapt_plan', { interview_results: { score }, areas_to_improve: areasToImprove })
        return result || { message: `Plan adapted to focus on: ${areasToImprove.join(', ')}` }
    }, [])

    const generateVisual = useCallback(async (topic: string, style?: string) => {
        const result = await callEdgeFunction('generate_visual', { topic, style })
        return result?.image_url || `https://via.placeholder.com/512?text=${encodeURIComponent(topic)}`
    }, [])

    const textToSpeech = useCallback(async (text: string, voice: string = 'alloy') => {
        const result = await callEdgeFunction('text_to_speech', { text, voice })
        return result?.audio_base64 || null
    }, [])

    const loadProfile = useCallback(async () => currentProfile, [currentProfile])
    const getInterviewHistory = useCallback(async () => [], [])

    return {
        isLoading,
        error,
        currentProfile,
        learningPlan,
        useOnlineMode,
        analyzeRole,
        analyzeSkillGaps,
        generatePlan,
        startMockInterview,
        submitInterviewAnswers,
        adaptPlan,
        generateVisual,
        textToSpeech,
        loadProfile,
        getInterviewHistory
    }
}
