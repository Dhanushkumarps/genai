import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { SpiralAnimation } from '@/components/ui/spiral-animation'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { PixelCanvas } from '@/components/ui/pixel-canvas'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import {
    Code, Brain, Palette, Cloud, Shield, Smartphone,
    BarChart, Package, Users, ChevronRight, ChevronLeft,
    Mic, MicOff, Sparkles, Clock, CheckCircle, Terminal,
    Zap, Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Skill domains with icons and colors
const SKILL_DOMAINS = [
    { id: 'software_engineering', name: 'Software Engineering', icon: Code, color: '#3B82F6', skills: ['JavaScript', 'Python', 'React', 'SQL', 'Git'] },
    { id: 'data_science', name: 'Data Science', icon: BarChart, color: '#8B5CF6', skills: ['Python', 'ML', 'Statistics', 'SQL', 'Visualization'] },
    { id: 'ai_ml', name: 'AI & Machine Learning', icon: Brain, color: '#6366F1', skills: ['Deep Learning', 'NLP', 'PyTorch', 'LLMs'] },
    { id: 'design', name: 'UI/UX Design', icon: Palette, color: '#F59E0B', skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping'] },
    { id: 'devops', name: 'DevOps & Cloud', icon: Cloud, color: '#10B981', skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'] },
    { id: 'cybersecurity', name: 'Cybersecurity', icon: Shield, color: '#EF4444', skills: ['Security', 'Pentesting', 'Cryptography'] },
    { id: 'mobile_dev', name: 'Mobile Development', icon: Smartphone, color: '#F97316', skills: ['React Native', 'Swift', 'Kotlin'] },
    { id: 'product_management', name: 'Product Management', icon: Package, color: '#EC4899', skills: ['User Research', 'Roadmapping', 'Agile'] },
    { id: 'leadership', name: 'Leadership', icon: Users, color: '#84CC16', skills: ['Team Building', 'Strategy', 'Mentoring'] },
]

// Time slots
const TIME_SLOTS = [
    { id: 'morning', label: 'Morning', time: '6am - 12pm', icon: '🌅' },
    { id: 'afternoon', label: 'Afternoon', time: '12pm - 6pm', icon: '☀️' },
    { id: 'evening', label: 'Evening', time: '6pm - 10pm', icon: '🌆' },
    { id: 'night', label: 'Night', time: '10pm - 2am', icon: '🌙' },
]

// Terminal typing effect component
function TerminalText({ text, delay = 0, speed = 30 }: { text: string; delay?: number; speed?: number }) {
    const [displayText, setDisplayText] = useState('')

    useEffect(() => {
        const timeout = setTimeout(() => {
            let i = 0
            const interval = setInterval(() => {
                if (i < text.length) {
                    setDisplayText(text.slice(0, i + 1))
                    i++
                } else {
                    clearInterval(interval)
                }
            }, speed)
            return () => clearInterval(interval)
        }, delay)
        return () => clearTimeout(timeout)
    }, [text, delay, speed])

    return <span>{displayText}<span className="animate-pulse">▊</span></span>
}

export default function OnboardingPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [step, setStep] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [checkingStatus, setCheckingStatus] = useState(true)

    // Form state
    const [selectedDomains, setSelectedDomains] = useState<string[]>([])
    const [skillLevels, setSkillLevels] = useState<Record<string, number>>({})
    const [learningGoals, setLearningGoals] = useState('')
    const [hoursPerWeek, setHoursPerWeek] = useState(10)
    const [preferredTimes, setPreferredTimes] = useState<string[]>([])
    const [isRecording, setIsRecording] = useState(false)

    // Boot sequence state
    const [bootComplete, setBootComplete] = useState(false)

    // Check if user has already completed onboarding
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (!user) {
                setCheckingStatus(false)
                return
            }

            try {
                const { data, error } = await (supabase as any)
                    .from('user_skill_profiles')
                    .select('onboarding_completed')
                    .eq('user_id', user.id)
                    .single()

                if (!error && (data as any)?.onboarding_completed) {
                    // User already completed onboarding, redirect to dashboard
                    navigate('/', { replace: true })
                    return
                }
            } catch (err) {
                // No profile exists yet, that's fine - user needs to complete onboarding
                console.log('No profile yet, showing onboarding')
            }

            setCheckingStatus(false)
        }

        checkOnboardingStatus()
    }, [user, navigate])

    useEffect(() => {
        const timer = setTimeout(() => setBootComplete(true), 3500)
        return () => clearTimeout(timer)
    }, [])

    const toggleDomain = (id: string) => {
        setSelectedDomains(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        )
    }

    const toggleTime = (id: string) => {
        setPreferredTimes(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        )
    }

    const handleVoiceInput = async () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice input not supported in this browser')
            return
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true

        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('')
            setLearningGoals(transcript)
        }

        recognition.onerror = () => setIsRecording(false)
        recognition.onend = () => setIsRecording(false)

        if (isRecording) {
            recognition.stop()
            setIsRecording(false)
        } else {
            recognition.start()
            setIsRecording(true)
        }
    }

    const submitOnboarding = async () => {
        if (!user) return
        setIsLoading(true)

        try {
            // Prepare skill assessments
            const assessments = Object.entries(skillLevels).map(([skill, level]) => ({
                skill,
                level,
                category: 'technical'
            }))

            // Call edge function
            const { error } = await supabase.functions.invoke('skill-profiler', {
                body: {
                    action: 'analyze_profile',
                    userId: user.id,
                    careerDomains: selectedDomains,
                    learningGoals,
                    skillAssessments: assessments,
                    hoursPerWeek,
                    preferredTimes
                }
            })

            if (error) throw error

            // Generate learning path
            await supabase.functions.invoke('skill-profiler', {
                body: {
                    action: 'generate_path',
                    userId: user.id,
                    careerDomains: selectedDomains
                }
            })

            navigate('/')
        } catch (err) {
            console.error('Onboarding error:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const steps = [
        { title: 'System Boot', icon: Terminal },
        { title: 'Select Domains', icon: Target },
        { title: 'Skill Assessment', icon: BarChart },
        { title: 'Learning Goals', icon: Sparkles },
        { title: 'Time Commitment', icon: Clock },
    ]

    const canProceed = () => {
        switch (step) {
            case 0: return bootComplete
            case 1: return selectedDomains.length > 0
            case 2: return Object.keys(skillLevels).length > 0
            case 3: return learningGoals.length > 10
            case 4: return hoursPerWeek > 0 && preferredTimes.length > 0
            default: return true
        }
    }

    const selectedSkills = selectedDomains.flatMap(id =>
        SKILL_DOMAINS.find(d => d.id === id)?.skills || []
    )

    // Show loading while checking onboarding status
    if (checkingStatus) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#C49B3A] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[#6B6966] text-sm mt-4">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black overflow-hidden">
            {/* Spiral background */}
            <div className="absolute inset-0 opacity-40">
                <SpiralAnimation />
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center p-8">
                {/* Progress indicator */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2">
                    {steps.map((s, i) => (
                        <motion.div
                            key={i}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                i === step
                                    ? "bg-[#C49B3A] text-black"
                                    : i < step
                                        ? "bg-[#5A9A5A] text-white"
                                        : "bg-[#1A1D20] text-[#6B6966]"
                            )}
                            animate={{ scale: i === step ? 1.05 : 1 }}
                        >
                            <s.icon className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">{s.title}</span>
                        </motion.div>
                    ))}
                </div>

                {/* Main content area */}
                <motion.div
                    className="w-full max-w-4xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <AnimatePresence mode="wait">
                        {/* Step 0: Boot Sequence */}
                        {step === 0 && (
                            <motion.div
                                key="boot"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-[#0A0A0A] border border-[#1A1D20] rounded-xl p-8 font-mono text-sm"
                            >
                                <div className="text-[#5A9A5A] space-y-2">
                                    <p><TerminalText text="[OK] Initializing SkillOS v2.0..." delay={0} /></p>
                                    <p><TerminalText text="[OK] Loading cognitive modules..." delay={800} /></p>
                                    <p><TerminalText text="[OK] Connecting to neural network..." delay={1600} /></p>
                                    <p><TerminalText text="[OK] Preparing skill assessment matrix..." delay={2400} /></p>
                                    <p className="text-[#C49B3A]"><TerminalText text="[READY] System initialized. Welcome, learner." delay={3200} /></p>
                                </div>

                                {bootComplete && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="mt-8 text-center"
                                    >
                                        <p className="text-[#E8E6E3] text-lg mb-4">Ready to configure your learning environment?</p>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* Step 1: Domain Selection */}
                        {step === 1 && (
                            <motion.div
                                key="domains"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-semibold text-[#E8E6E3] mb-2">Select Your Focus Areas</h2>
                                    <p className="text-[#6B6966]">Choose the domains you want to master. Select multiple if applicable.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {SKILL_DOMAINS.map((domain) => {
                                        const isSelected = selectedDomains.includes(domain.id)
                                        return (
                                            <motion.button
                                                key={domain.id}
                                                onClick={() => toggleDomain(domain.id)}
                                                className={cn(
                                                    "relative group p-5 rounded-xl border transition-all overflow-hidden text-left",
                                                    isSelected
                                                        ? "bg-[#1A1D20] border-[#C49B3A]"
                                                        : "bg-[#0F1113] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)]"
                                                )}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <PixelCanvas
                                                    gap={10}
                                                    speed={20}
                                                    colors={[domain.color + '20', domain.color + '10']}
                                                    noFocus
                                                />
                                                <div className="relative z-10">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div
                                                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                            style={{ backgroundColor: domain.color + '20' }}
                                                        >
                                                            <domain.icon className="w-5 h-5" style={{ color: domain.color }} />
                                                        </div>
                                                        {isSelected && (
                                                            <CheckCircle className="w-5 h-5 text-[#C49B3A]" />
                                                        )}
                                                    </div>
                                                    <h3 className="font-medium text-[#E8E6E3] mb-1">{domain.name}</h3>
                                                    <div className="flex flex-wrap gap-1">
                                                        {domain.skills.slice(0, 3).map(skill => (
                                                            <span key={skill} className="text-[10px] px-2 py-0.5 bg-[rgba(255,255,255,0.04)] rounded text-[#6B6966]">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Skill Assessment */}
                        {step === 2 && (
                            <motion.div
                                key="skills"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-semibold text-[#E8E6E3] mb-2">Rate Your Skills</h2>
                                    <p className="text-[#6B6966]">Be honest - this helps create your personalized path.</p>
                                </div>

                                <div className="bg-[#0F1113] border border-[rgba(255,255,255,0.04)] rounded-xl p-6 space-y-6 max-h-[400px] overflow-y-auto">
                                    {selectedSkills.length === 0 ? (
                                        <p className="text-center text-[#6B6966] py-8">Select domains first to see skills</p>
                                    ) : (
                                        [...new Set(selectedSkills)].map((skill) => (
                                            <div key={skill} className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[#E8E6E3] text-sm font-medium">{skill}</span>
                                                    <span className="text-[#C49B3A] text-sm font-mono">{skillLevels[skill] || 1}/10</span>
                                                </div>
                                                <Slider
                                                    value={[skillLevels[skill] || 1]}
                                                    onValueChange={([v]) => setSkillLevels(prev => ({ ...prev, [skill]: v }))}
                                                    min={1}
                                                    max={10}
                                                    step={1}
                                                    className="w-full"
                                                />
                                                <div className="flex justify-between text-[10px] text-[#4A4845]">
                                                    <span>Beginner</span>
                                                    <span>Intermediate</span>
                                                    <span>Expert</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Learning Goals */}
                        {step === 3 && (
                            <motion.div
                                key="goals"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-semibold text-[#E8E6E3] mb-2">Tell Us Your Goals</h2>
                                    <p className="text-[#6B6966]">Describe what you want to achieve. Use voice or text.</p>
                                </div>

                                <div className="bg-[#0F1113] border border-[rgba(255,255,255,0.04)] rounded-xl p-6 space-y-4">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleVoiceInput}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                                                isRecording
                                                    ? "bg-[#EF4444] text-white animate-pulse"
                                                    : "bg-[#1A1D20] text-[#9A9996] hover:bg-[#23262A]"
                                            )}
                                        >
                                            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                            {isRecording ? 'Stop Recording' : 'Voice Input'}
                                        </button>
                                        <div className="flex-1 text-right text-[10px] text-[#4A4845] self-center">
                                            {learningGoals.length}/500 characters
                                        </div>
                                    </div>

                                    <textarea
                                        value={learningGoals}
                                        onChange={(e) => setLearningGoals(e.target.value.slice(0, 500))}
                                        placeholder="Example: I want to become a full-stack developer and land a job at a tech company within 6 months. I'm currently learning JavaScript and want to master React and Node.js..."
                                        className="w-full h-48 bg-[#1A1D20] border border-[rgba(255,255,255,0.04)] rounded-lg p-4 text-[#E8E6E3] placeholder:text-[#4A4845] resize-none focus:outline-none focus:border-[#C49B3A] transition"
                                    />

                                    <div className="flex flex-wrap gap-2">
                                        {['Get a job', 'Career switch', 'Build projects', 'Learn new tech', 'Start a startup'].map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => setLearningGoals(prev => prev + (prev ? '. ' : '') + tag)}
                                                className="text-xs px-3 py-1.5 bg-[#1A1D20] rounded-full text-[#6B6966] hover:bg-[#23262A] hover:text-[#9A9996] transition"
                                            >
                                                + {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Time Commitment */}
                        {step === 4 && (
                            <motion.div
                                key="time"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-semibold text-[#E8E6E3] mb-2">Your Time Commitment</h2>
                                    <p className="text-[#6B6966]">How much time can you dedicate to learning each week?</p>
                                </div>

                                <div className="bg-[#0F1113] border border-[rgba(255,255,255,0.04)] rounded-xl p-6 space-y-8">
                                    {/* Hours slider */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#9A9996]">Hours per week</span>
                                            <span className="text-2xl font-semibold text-[#C49B3A]">{hoursPerWeek}h</span>
                                        </div>
                                        <Slider
                                            value={[hoursPerWeek]}
                                            onValueChange={([v]) => setHoursPerWeek(v)}
                                            min={1}
                                            max={40}
                                            step={1}
                                            className="w-full"
                                        />
                                        <div className="flex justify-between text-[10px] text-[#4A4845]">
                                            <span>Casual (1-5h)</span>
                                            <span>Regular (10-20h)</span>
                                            <span>Intensive (30-40h)</span>
                                        </div>
                                    </div>

                                    {/* Time preferences */}
                                    <div className="space-y-3">
                                        <span className="text-[#9A9996] text-sm">Preferred study times</span>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {TIME_SLOTS.map((slot) => {
                                                const isSelected = preferredTimes.includes(slot.id)
                                                return (
                                                    <button
                                                        key={slot.id}
                                                        onClick={() => toggleTime(slot.id)}
                                                        className={cn(
                                                            "p-4 rounded-xl border text-center transition-all",
                                                            isSelected
                                                                ? "bg-[#1A1D20] border-[#C49B3A]"
                                                                : "bg-[#0A0A0A] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)]"
                                                        )}
                                                    >
                                                        <span className="text-2xl">{slot.icon}</span>
                                                        <p className="text-[#E8E6E3] font-medium mt-2">{slot.label}</p>
                                                        <p className="text-[10px] text-[#6B6966]">{slot.time}</p>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="bg-[rgba(196,155,58,0.1)] border border-[#C49B3A] rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <Zap className="w-5 h-5 text-[#C49B3A] mt-0.5" />
                                        <div>
                                            <p className="text-[#E8E6E3] font-medium">Your personalized learning path is ready!</p>
                                            <p className="text-[#9A9996] text-sm mt-1">
                                                Based on your selections, we'll create a {hoursPerWeek}h/week plan
                                                focusing on {selectedDomains.length} domain(s).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Navigation buttons */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
                    {step > 0 && (
                        <Button
                            variant="secondary"
                            onClick={() => setStep(s => s - 1)}
                            className="gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </Button>
                    )}

                    {step < 4 ? (
                        <Button
                            onClick={() => setStep(s => s + 1)}
                            disabled={!canProceed()}
                            className="gap-2"
                        >
                            Continue
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={submitOnboarding}
                            disabled={!canProceed() || isLoading}
                            className="gap-2 bg-[#C49B3A] hover:bg-[#D4AB4A]"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin">⚡</span>
                                    Generating Path...
                                </>
                            ) : (
                                <>
                                    Launch SkillOS
                                    <Sparkles className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
