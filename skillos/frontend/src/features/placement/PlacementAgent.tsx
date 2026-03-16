import { useState, useEffect } from 'react'
import {
    Target, Loader2, Sparkles, Building2, Brain, MessageSquare,
    BookOpen, TrendingUp, Mic, Volume2, ChevronRight, Award,
    Calendar, Clock, Zap, FileText, DollarSign, RefreshCw,
    CheckCircle, XCircle, Play, ArrowRight, Briefcase, MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import MacWindow from '@/components/ui/MacWindow'

// API helper
const callPlacementAgent = async (action: string, data: any, profileId?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/placement-agent-v2`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
            action,
            user_id: user?.id,
            profile_id: profileId,
            data
        })
    })
    return response.json()
}

type ViewMode = 'setup' | 'dashboard' | 'interview' | 'flashcards' | 'company'

interface PlacementAgentProps {
    onClose?: () => void
}

export default function PlacementAgent({ onClose }: PlacementAgentProps) {
    const { user } = useAuth()
    const [viewMode, setViewMode] = useState<ViewMode>('setup')
    const [isLoading, setIsLoading] = useState(false)
    const [loadingAction, setLoadingAction] = useState('')

    // Setup state
    const [role, setRole] = useState('')
    const [company, setCompany] = useState('')
    const [location, setLocation] = useState('Remote')
    const [experienceLevel, setExperienceLevel] = useState('mid')

    // Analysis data
    const [analysis, setAnalysis] = useState<any>(null)
    const [profileId, setProfileId] = useState<string | null>(null)
    const [companyIntel, setCompanyIntel] = useState<any>(null)
    const [skillGaps, setSkillGaps] = useState<any>(null)
    const [learningPlan, setLearningPlan] = useState<any>(null)
    const [progress, setProgress] = useState<any>(null)

    // Interview state
    const [interviewQuestions, setInterviewQuestions] = useState<any[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
    const [interviewResults, setInterviewResults] = useState<any>(null)

    // Flashcard state
    const [flashcards, setFlashcards] = useState<any[]>([])
    const [currentCardIndex, setCurrentCardIndex] = useState(0)
    const [showAnswer, setShowAnswer] = useState(false)

    // ===== API Calls =====
    const handleDeepAnalysis = async () => {
        if (!role.trim()) return
        setIsLoading(true)
        setLoadingAction('Conducting deep market research...')

        try {
            console.log('Calling deep_role_analysis with:', { role, location, experienceLevel })

            const result = await callPlacementAgent('deep_role_analysis', {
                role,
                location,
                experience_level: experienceLevel
            })

            console.log('API Response:', result)

            if (result.success && result.analysis) {
                setAnalysis(result.analysis)
                setProfileId(result.profile_id)
                setViewMode('dashboard')
            } else {
                console.error('API returned error or empty analysis:', result)
                alert(`Error: ${result.error || 'No analysis data returned. Check console for details.'}`)
            }
        } catch (error) {
            console.error('Analysis failed:', error)
            alert(`Request failed: ${error}`)
        } finally {
            setIsLoading(false)
            setLoadingAction('')
        }
    }

    const handleCompanyIntel = async () => {
        if (!company.trim()) return
        setIsLoading(true)
        setLoadingAction('Researching company...')

        try {
            const result = await callPlacementAgent('company_intel', { company })
            if (result.success) {
                setCompanyIntel(result.research)
                setViewMode('company')
            }
        } catch (error) {
            console.error('Company intel failed:', error)
        } finally {
            setIsLoading(false)
            setLoadingAction('')
        }
    }

    const handleSkillGap = async (currentSkills: string[]) => {
        setIsLoading(true)
        setLoadingAction('Analyzing skill gaps...')

        try {
            const result = await callPlacementAgent('smart_skill_gap', {
                current_skills: currentSkills
            }, profileId || undefined)

            if (result.success) {
                setSkillGaps(result)
            }
        } catch (error) {
            console.error('Skill gap analysis failed:', error)
        } finally {
            setIsLoading(false)
            setLoadingAction('')
        }
    }

    const handleStartInterview = async (type: string = 'technical', difficulty: string = 'medium') => {
        setIsLoading(true)
        setLoadingAction('Preparing interview questions...')

        try {
            const result = await callPlacementAgent('interview_coach', {
                interview_type: type,
                difficulty,
                company_context: company,
                count: 5
            }, profileId || undefined)

            if (result.success && result.questions) {
                setInterviewQuestions(result.questions)
                setCurrentQuestionIndex(0)
                setUserAnswers({})
                setInterviewResults(null)
                setViewMode('interview')
            }
        } catch (error) {
            console.error('Interview start failed:', error)
        } finally {
            setIsLoading(false)
            setLoadingAction('')
        }
    }

    const handleSubmitInterview = async () => {
        setIsLoading(true)
        setLoadingAction('AI is evaluating your answers...')

        try {
            const answers = interviewQuestions.map((q, i) => ({
                question_id: q.id,
                answer: userAnswers[i] || ''
            }))

            const result = await callPlacementAgent('answer_eval', {
                questions: interviewQuestions,
                answers,
                interview_type: 'technical'
            }, profileId || undefined)

            if (result.success) {
                setInterviewResults(result)
            }
        } catch (error) {
            console.error('Interview evaluation failed:', error)
        } finally {
            setIsLoading(false)
            setLoadingAction('')
        }
    }

    const handleGenerateFlashcards = async (topics: string[]) => {
        setIsLoading(true)
        setLoadingAction('Generating flashcards...')

        try {
            const result = await callPlacementAgent('generate_flashcards', {
                topics,
                count_per_topic: 5
            }, profileId || undefined)

            if (result.success) {
                setFlashcards(result.flashcards || [])
                setCurrentCardIndex(0)
                setShowAnswer(false)
                setViewMode('flashcards')
            }
        } catch (error) {
            console.error('Flashcard generation failed:', error)
        } finally {
            setIsLoading(false)
            setLoadingAction('')
        }
    }

    const handleFlashcardReview = async (quality: number) => {
        if (!flashcards[currentCardIndex]?.id) return

        await callPlacementAgent('review_flashcard', {
            flashcard_id: flashcards[currentCardIndex].id,
            quality
        })

        setShowAnswer(false)
        if (currentCardIndex < flashcards.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1)
        } else {
            // Reload due flashcards
            setCurrentCardIndex(0)
        }
    }

    // ===== Render Functions =====

    const renderSetupView = () => (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Target className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400">
                    AI Career Accelerator
                </h1>
                <p className="text-white/60 text-lg max-w-md mx-auto">
                    Deep market research, personalized coaching, and AI-powered interview prep
                </p>
            </div>

            {/* Main Setup Card */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-pink-500/10" />
                <CardContent className="relative p-8 space-y-6">
                    <div className="grid gap-4">
                        <div>
                            <label className="text-sm text-white/70 mb-2 flex items-center gap-2">
                                <Briefcase className="w-4 h-4" /> Target Role
                            </label>
                            <Input
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="e.g. Senior Frontend Engineer"
                                className="bg-white/5 border-white/10 text-white h-12 text-lg"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-white/70 mb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Location
                                </label>
                                <Input
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g. San Francisco, Remote"
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-white/70 mb-2 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> Experience Level
                                </label>
                                <select
                                    value={experienceLevel}
                                    onChange={(e) => setExperienceLevel(e.target.value)}
                                    className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-md text-white"
                                >
                                    <option value="entry">Entry (0-2 yrs)</option>
                                    <option value="mid">Mid (2-5 yrs)</option>
                                    <option value="senior">Senior (5-8 yrs)</option>
                                    <option value="lead">Lead (8+ yrs)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-white/70 mb-2 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Target Company (Optional)
                            </label>
                            <Input
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="e.g. Google, Meta, Startup..."
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleDeepAnalysis}
                        disabled={isLoading || !role}
                        className="w-full h-14 text-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-purple-500/25"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin mr-2" />
                                {loadingAction}
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2" />
                                Start Deep Analysis
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { icon: Brain, title: 'Deep Research', desc: 'Market analysis & trends' },
                    { icon: MessageSquare, title: 'AI Interviews', desc: 'Practice with evaluation' },
                    { icon: BookOpen, title: 'Smart Flashcards', desc: 'Spaced repetition' },
                ].map((feature, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                        <feature.icon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                        <h3 className="text-white font-medium">{feature.title}</h3>
                        <p className="text-white/50 text-xs">{feature.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )

    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Header with stats */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        {analysis?.role || role}
                    </h1>
                    <p className="text-white/50">{location} • {experienceLevel} level</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewMode('setup')}>
                        Change Role
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Market Demand', value: `${analysis?.demand_score || 0}/10`, icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
                    { label: 'Salary Range', value: `$${analysis?.salary?.median ? Math.round(analysis.salary.median / 1000) : 0}k`, icon: DollarSign, color: 'from-blue-500 to-cyan-500' },
                    { label: 'Skills Required', value: analysis?.required_skills?.length || 0, icon: Brain, color: 'from-purple-500 to-pink-500' },
                    { label: 'Prep Time', value: `${analysis?.preparation_timeline?.recommended_weeks || 4}w`, icon: Calendar, color: 'from-orange-500 to-red-500' },
                ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
                            <stat.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-white/50 text-xs">{stat.label}</p>
                        <p className="text-white text-xl font-bold">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-3 gap-6">
                {/* Skills to Learn */}
                <MacWindow title="Required Skills" icon={<Brain className="w-4 h-4" />}>
                    <div className="scroll-fade-container">
                        <div className="p-4 max-h-80 scrollbar-minimal space-y-2">
                            {analysis?.required_skills?.slice(0, 8).map((skill: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10">
                                    <span className={`w-2 h-2 rounded-full ${skill.importance === 'critical' ? 'bg-red-500' : skill.importance === 'important' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                    <span className="text-white text-sm flex-1">{skill.name}</span>
                                    <span className="text-white/40 text-xs">{skill.proficiency_needed}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </MacWindow>

                {/* Interview Topics */}
                <MacWindow title="Interview Topics" icon={<MessageSquare className="w-4 h-4" />}>
                    <div className="scroll-fade-container">
                        <div className="p-4 max-h-80 scrollbar-minimal space-y-2">
                            {analysis?.interview_topics?.slice(0, 6).map((topic: any, i: number) => (
                                <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                                    onClick={() => handleGenerateFlashcards([topic.topic])}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-sm">{topic.topic}</span>
                                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70" />
                                    </div>
                                    <p className="text-white/40 text-xs mt-1 truncate">
                                        {topic.sample_questions?.[0]}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </MacWindow>

                {/* Top Companies */}
                <MacWindow title="Top Companies" icon={<Building2 className="w-4 h-4" />}>
                    <div className="scroll-fade-container">
                        <div className="p-4 max-h-80 scrollbar-minimal space-y-2">
                            {analysis?.top_companies?.slice(0, 6).map((comp: any, i: number) => (
                                <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                                    onClick={() => { setCompany(comp.name); handleCompanyIntel(); }}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-white text-sm font-medium">{comp.name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${comp.hiring_volume === 'high' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {comp.hiring_volume}
                                        </span>
                                    </div>
                                    <p className="text-white/40 text-xs mt-1 truncate">{comp.culture}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </MacWindow>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-4">
                <Button
                    onClick={() => handleStartInterview('technical', 'medium')}
                    className="h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                >
                    <MessageSquare className="mr-2 w-5 h-5" />
                    Practice Interview
                </Button>
                <Button
                    onClick={() => handleGenerateFlashcards(analysis?.required_skills?.slice(0, 3).map((s: any) => s.name) || [])}
                    className="h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                >
                    <BookOpen className="mr-2 w-5 h-5" />
                    Generate Flashcards
                </Button>
                <Button
                    onClick={() => company && handleCompanyIntel()}
                    disabled={!company}
                    className="h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                >
                    <Building2 className="mr-2 w-5 h-5" />
                    Company Intel
                </Button>
                <Button
                    onClick={() => window.alert('Coming soon: Resume review feature')}
                    className="h-14 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500"
                >
                    <FileText className="mr-2 w-5 h-5" />
                    Resume Review
                </Button>
            </div>

            {/* Insider Tips */}
            {analysis?.insider_tips && (
                <MacWindow title="Insider Tips" icon={<Zap className="w-4 h-4" />}>
                    <div className="p-4 grid grid-cols-2 gap-3">
                        {analysis.insider_tips.slice(0, 4).map((tip: string, i: number) => (
                            <div key={i} className="flex gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                                <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                                <p className="text-white/80 text-sm">{tip}</p>
                            </div>
                        ))}
                    </div>
                </MacWindow>
            )}
        </div>
    )

    const renderInterviewView = () => (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Mock Interview</h1>
                    <p className="text-white/50">Question {currentQuestionIndex + 1} of {interviewQuestions.length}</p>
                </div>
                <Button variant="outline" onClick={() => setViewMode('dashboard')}>
                    Exit Interview
                </Button>
            </div>

            {/* Progress */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                    style={{ width: `${((currentQuestionIndex + 1) / interviewQuestions.length) * 100}%` }}
                />
            </div>

            {interviewResults ? (
                /* Results View */
                <Card className="bg-black/40 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Award className="w-6 h-6 text-yellow-400" />
                            Interview Complete!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Overall Score */}
                        <div className="text-center py-6">
                            <div className={`text-6xl font-bold ${interviewResults.overall_score >= 70 ? 'text-green-400' : interviewResults.overall_score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {interviewResults.overall_score}%
                            </div>
                            <p className="text-white/60 mt-2">{interviewResults.overall_feedback}</p>
                            <span className={`inline-block mt-4 px-4 py-1 rounded-full text-sm ${interviewResults.ready_for_interview ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {interviewResults.confidence_level?.replace('_', ' ')}
                            </span>
                        </div>

                        {/* Per-question feedback */}
                        <div className="space-y-3">
                            {interviewResults.scores?.map((score: any, i: number) => (
                                <div key={i} className="p-4 rounded-lg bg-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white/70 text-sm">Q{i + 1}</span>
                                        <span className={`font-bold ${score.score >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {score.score}%
                                        </span>
                                    </div>
                                    <p className="text-white text-sm">{score.feedback}</p>
                                    {score.improvements?.length > 0 && (
                                        <p className="text-red-400/70 text-xs mt-2">
                                            💡 {score.improvements[0]}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Button onClick={() => setViewMode('dashboard')} className="w-full">
                            <ArrowRight className="mr-2" /> Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                /* Question View */
                <Card className="bg-black/40 border-white/10">
                    <CardContent className="p-8 space-y-6">
                        {/* Question */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${interviewQuestions[currentQuestionIndex]?.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {interviewQuestions[currentQuestionIndex]?.difficulty}
                                </span>
                                <span className="text-white/40 text-xs">
                                    {interviewQuestions[currentQuestionIndex]?.topic}
                                </span>
                            </div>
                            <h2 className="text-xl text-white font-medium">
                                {interviewQuestions[currentQuestionIndex]?.question}
                            </h2>
                        </div>

                        {/* STAR hints for behavioral */}
                        {interviewQuestions[currentQuestionIndex]?.star_hints && (
                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <p className="text-purple-400 text-xs font-medium mb-2">💡 STAR Framework Hints:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <p className="text-white/60"><b>S</b>: {interviewQuestions[currentQuestionIndex].star_hints.situation}</p>
                                    <p className="text-white/60"><b>T</b>: {interviewQuestions[currentQuestionIndex].star_hints.task}</p>
                                    <p className="text-white/60"><b>A</b>: {interviewQuestions[currentQuestionIndex].star_hints.action}</p>
                                    <p className="text-white/60"><b>R</b>: {interviewQuestions[currentQuestionIndex].star_hints.result}</p>
                                </div>
                            </div>
                        )}

                        {/* Answer input */}
                        <textarea
                            value={userAnswers[currentQuestionIndex] || ''}
                            onChange={(e) => setUserAnswers({ ...userAnswers, [currentQuestionIndex]: e.target.value })}
                            placeholder="Type your answer here... Be specific and use examples."
                            className="w-full h-40 p-4 bg-white/5 border border-white/10 rounded-lg text-white resize-none focus:outline-none focus:border-purple-500/50"
                        />

                        {/* Navigation */}
                        <div className="flex gap-4">
                            {currentQuestionIndex > 0 && (
                                <Button variant="outline" onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}>
                                    Previous
                                </Button>
                            )}
                            <div className="flex-1" />
                            {currentQuestionIndex < interviewQuestions.length - 1 ? (
                                <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
                                    Next Question <ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmitInterview}
                                    disabled={isLoading}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                                >
                                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                    Submit Interview
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )

    const renderFlashcards = () => (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Flashcard Review</h1>
                <Button variant="outline" onClick={() => setViewMode('dashboard')}>
                    Back to Dashboard
                </Button>
            </div>

            {flashcards.length > 0 ? (
                <>
                    <div className="text-center text-white/50 text-sm">
                        Card {currentCardIndex + 1} of {flashcards.length}
                    </div>

                    <Card
                        className="bg-black/40 border-white/10 min-h-[300px] cursor-pointer hover:border-purple-500/30 transition-all"
                        onClick={() => setShowAnswer(!showAnswer)}
                    >
                        <CardContent className="p-8 flex flex-col items-center justify-center min-h-[300px]">
                            {!showAnswer ? (
                                <>
                                    <span className="text-purple-400 text-xs mb-4">{flashcards[currentCardIndex]?.topic}</span>
                                    <h2 className="text-xl text-white text-center">{flashcards[currentCardIndex]?.question}</h2>
                                    <p className="text-white/40 text-sm mt-8">Tap to reveal answer</p>
                                </>
                            ) : (
                                <>
                                    <span className="text-green-400 text-xs mb-4">Answer</span>
                                    <p className="text-white text-center">{flashcards[currentCardIndex]?.answer}</p>
                                    {flashcards[currentCardIndex]?.tip && (
                                        <p className="text-yellow-400/70 text-sm mt-4 text-center">
                                            💡 {flashcards[currentCardIndex].tip}
                                        </p>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {showAnswer && (
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" className="border-red-500/50 text-red-400" onClick={() => handleFlashcardReview(1)}>
                                <XCircle className="mr-2 w-4 h-4" /> Forgot
                            </Button>
                            <Button variant="outline" className="border-yellow-500/50 text-yellow-400" onClick={() => handleFlashcardReview(3)}>
                                Hard
                            </Button>
                            <Button variant="outline" className="border-green-500/50 text-green-400" onClick={() => handleFlashcardReview(4)}>
                                Good
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-500" onClick={() => handleFlashcardReview(5)}>
                                <CheckCircle className="mr-2 w-4 h-4" /> Easy
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <Card className="bg-black/40 border-white/10 p-8 text-center">
                    <BookOpen className="w-12 h-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/50">No flashcards yet. Generate some from the dashboard!</p>
                </Card>
            )}
        </div>
    )

    const renderCompanyIntel = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{companyIntel?.company || company}</h1>
                    <p className="text-white/50">{companyIntel?.industry} • {companyIntel?.size}</p>
                </div>
                <Button variant="outline" onClick={() => setViewMode('dashboard')}>
                    Back to Dashboard
                </Button>
            </div>

            {companyIntel && (
                <div className="grid grid-cols-2 gap-6">
                    {/* Overview */}
                    <MacWindow title="Overview" icon={<Building2 className="w-4 h-4" />}>
                        <div className="p-4 space-y-3">
                            <p className="text-white text-sm">{companyIntel.overview}</p>
                            <div className="flex items-center gap-2">
                                <span className="text-white/50 text-xs">Culture Rating:</span>
                                <span className="text-yellow-400 font-bold">{companyIntel.culture?.rating}/5</span>
                            </div>
                            <p className="text-white/60 text-sm">{companyIntel.culture?.summary}</p>
                        </div>
                    </MacWindow>

                    {/* Interview Process */}
                    <MacWindow title="Interview Process" icon={<MessageSquare className="w-4 h-4" />}>
                        <div className="p-4 space-y-3">
                            <div className="flex gap-4 text-sm">
                                <span className="text-white/50">Rounds: <b className="text-white">{companyIntel.interview_process?.rounds}</b></span>
                                <span className="text-white/50">Duration: <b className="text-white">{companyIntel.interview_process?.duration_weeks} weeks</b></span>
                            </div>
                            <div className="space-y-2">
                                {companyIntel.interview_process?.stages?.map((stage: string, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                                        <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs">{i + 1}</span>
                                        {stage}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </MacWindow>

                    {/* Pros & Cons */}
                    <MacWindow title="Culture Insights" icon={<TrendingUp className="w-4 h-4" />}>
                        <div className="p-4 space-y-4">
                            <div>
                                <p className="text-green-400 text-xs font-medium mb-2">✓ Pros</p>
                                <ul className="space-y-1">
                                    {companyIntel.culture?.pros?.slice(0, 4).map((pro: string, i: number) => (
                                        <li key={i} className="text-white/70 text-sm">• {pro}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="text-red-400 text-xs font-medium mb-2">✗ Cons</p>
                                <ul className="space-y-1">
                                    {companyIntel.culture?.cons?.slice(0, 4).map((con: string, i: number) => (
                                        <li key={i} className="text-white/70 text-sm">• {con}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </MacWindow>

                    {/* Hiring Tips */}
                    <MacWindow title="Hiring Tips" icon={<Zap className="w-4 h-4" />}>
                        <div className="p-4 space-y-2">
                            {companyIntel.hiring_tips?.map((tip: string, i: number) => (
                                <div key={i} className="flex gap-2 p-2 rounded-lg bg-yellow-500/10">
                                    <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                                    <p className="text-white/80 text-sm">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </MacWindow>
                </div>
            )}
        </div>
    )

    // Main render
    return (
        <div className="p-6 h-full overflow-y-auto animate-fade-in">
            {isLoading && viewMode === 'setup' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
                        <p className="text-white text-lg">{loadingAction}</p>
                        <p className="text-white/50 text-sm">This may take 15-30 seconds for deep research...</p>
                    </div>
                </div>
            )}

            {viewMode === 'setup' && renderSetupView()}
            {viewMode === 'dashboard' && renderDashboard()}
            {viewMode === 'interview' && renderInterviewView()}
            {viewMode === 'flashcards' && renderFlashcards()}
            {viewMode === 'company' && renderCompanyIntel()}
        </div>
    )
}
