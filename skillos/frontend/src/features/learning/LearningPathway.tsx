import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    BookOpen, ChevronDown, Clock, ExternalLink,
    Loader2, Sparkles, Target, CheckCircle2,
    FileText, Video, Code2, BookMarked, GraduationCap, Calendar, Trophy,
    ArrowRight, Download, Share2, Trash2, FolderOpen, Copy, Check
} from 'lucide-react'
import { openai } from '@/lib/openai'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import jsPDF from 'jspdf'

// ── Types ──────────────────────────────────────────────────────────────
interface Resource {
    title: string
    platform: string
    url: string
    type: 'video' | 'course' | 'docs' | 'project' | 'book'
    isFree: boolean
    costINR: number
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    durationHours: number
}

interface Topic {
    topicName: string
    estimatedHours: number
    resources: Resource[]
    practiceProject: string
    checkpointQuestion: string
}

interface Phase {
    phaseNumber: number
    phaseTitle: string
    durationWeeks: number
    objective: string
    topics: Topic[]
}

interface Milestone {
    week: number
    achievement: string
}

interface DailySchedule {
    weekday: string
    weekendHours: number
    focusAreas: string[]
}

interface Pathway {
    pathwayTitle: string
    totalWeeks: number
    weeklyHours: number
    phases: Phase[]
    milestones: Milestone[]
    dailySchedule: DailySchedule
}

interface SavedPathway {
    id: string
    created_at: string
    target_role: string | null
    pathway_data: Pathway
    progress_data: Record<string, boolean>
}

interface FormData {
    goal: string
    currentLevel: 'beginner' | 'intermediate' | 'advanced'
    hoursPerWeek: number
    budget: 'free' | 'low' | 'any'
    preferredLanguage: string
    targetTimeline: string
}

const STORAGE_KEY = 'skillos_pathway_progress'

// ── Helpers ────────────────────────────────────────────────────────────
function resourceIcon(type: string) {
    switch (type) {
        case 'video': return <Video className="w-3.5 h-3.5" />
        case 'course': return <GraduationCap className="w-3.5 h-3.5" />
        case 'docs': return <FileText className="w-3.5 h-3.5" />
        case 'project': return <Code2 className="w-3.5 h-3.5" />
        case 'book': return <BookMarked className="w-3.5 h-3.5" />
        default: return <ExternalLink className="w-3.5 h-3.5" />
    }
}

function difficultyColor(d: string) {
    if (d === 'beginner') return 'text-emerald-400 bg-emerald-400/10'
    if (d === 'intermediate') return 'text-amber-400 bg-amber-400/10'
    return 'text-red-400 bg-red-400/10'
}

// ── Main Component ─────────────────────────────────────────────────────
export default function LearningPathway() {
    const { user } = useAuth()
    const [pathway, setPathway] = useState<Pathway | null>(null)
    const [currentPathwayId, setCurrentPathwayId] = useState<string | null>(null)
    const [progress, setProgressState] = useState<Record<string, boolean>>({})
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expandedPhase, setExpandedPhase] = useState<number | null>(null)
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
    const [savedPathways, setSavedPathways] = useState<SavedPathway[]>([])
    const [showMyPathways, setShowMyPathways] = useState(false)
    const [loadingPathways, setLoadingPathways] = useState(false)
    const [copied, setCopied] = useState(false)
    const [form, setForm] = useState<FormData>({
        goal: '',
        currentLevel: 'beginner',
        hoursPerWeek: 10,
        budget: 'free',
        preferredLanguage: 'English',
        targetTimeline: '3 months',
    })

    // ── Load shared pathway from URL ────────────────────────────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const shared = params.get('shared')
        if (shared) {
            try {
                const decoded = JSON.parse(atob(shared))
                setPathway(decoded)
                setExpandedPhase(0)
            } catch { /* invalid share data */ }
        }
    }, [])

    // ── Fetch saved pathways ────────────────────────────────────────────
    const fetchSavedPathways = useCallback(async () => {
        if (!user) return
        setLoadingPathways(true)
        const { data } = await (supabase as any)
            .from('learning_pathways')
            .select('id, created_at, target_role, pathway_data, progress_data')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        if (data) setSavedPathways(data)
        setLoadingPathways(false)
    }, [user])

    useEffect(() => {
        fetchSavedPathways()
    }, [fetchSavedPathways])

    // ── Auto-load latest pathway when navigating from Dashboard ─────────
    const location = useLocation()
    useEffect(() => {
        const state = location.state as { autoLoad?: boolean } | null
        if (state?.autoLoad && savedPathways.length > 0 && !pathway) {
            loadPathway(savedPathways[0])
            // Clear the state so refresh doesn't re-trigger
            window.history.replaceState({}, '')
        }
    }, [savedPathways, location.state])

    // ── Save to Supabase ────────────────────────────────────────────────
    const savePathwayToDb = async (pw: Pathway, prog: Record<string, boolean>) => {
        if (!user) return null
        const { data, error: err } = await (supabase as any)
            .from('learning_pathways')
            .insert({
                user_id: user.id,
                pathway_data: pw,
                target_role: form.goal,
                progress_data: prog,
            })
            .select('id')
            .single()
        if (!err && data) {
            setCurrentPathwayId(data.id)
            fetchSavedPathways()
            return data.id
        }
        return null
    }

    // ── Update progress in DB ───────────────────────────────────────────
    const updateProgressInDb = useCallback(async (prog: Record<string, boolean>) => {
        if (!user || !currentPathwayId) return
        await (supabase as any)
            .from('learning_pathways')
            .update({ progress_data: prog })
            .eq('id', currentPathwayId)
    }, [user, currentPathwayId])

    const toggleComplete = useCallback((key: string) => {
        setProgressState(prev => {
            const next = { ...prev, [key]: !prev[key] }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            updateProgressInDb(next)
            return next
        })
    }, [updateProgressInDb])

    // ── Load a saved pathway ────────────────────────────────────────────
    const loadPathway = (saved: SavedPathway) => {
        setPathway(saved.pathway_data)
        setProgressState(saved.progress_data || {})
        setCurrentPathwayId(saved.id)
        setExpandedPhase(0)
        setShowMyPathways(false)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.progress_data || {}))
    }

    // ── Delete a saved pathway ──────────────────────────────────────────
    const deletePathway = async (id: string) => {
        await (supabase as any).from('learning_pathways').delete().eq('id', id)
        if (currentPathwayId === id) {
            setPathway(null)
            setCurrentPathwayId(null)
            setProgressState({})
        }
        fetchSavedPathways()
    }

    // Calculate progress
    const totalTopics = pathway?.phases.reduce((sum, p) => sum + p.topics.length, 0) || 0
    const completedTopics = Object.values(progress).filter(Boolean).length
    const overallPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

    // ── Generate Pathway ────────────────────────────────────────────────
    const generatePathway = async () => {
        if (!form.goal.trim()) return
        setIsGenerating(true)
        setError(null)

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.4,
                max_tokens: 4096,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a world-class tech education curator with deep knowledge of the best learning resources available in 2025-2026, especially for Indian learners. You create structured, week-by-week learning plans. Always respond with valid JSON only.',
                    },
                    {
                        role: 'user',
                        content: `Create a structured learning pathway based on this:
${JSON.stringify(form, null, 2)}

Return JSON with this exact structure:
{
  "pathwayTitle": string,
  "totalWeeks": number,
  "weeklyHours": number,
  "phases": [{
    "phaseNumber": number,
    "phaseTitle": string,
    "durationWeeks": number,
    "objective": string,
    "topics": [{
      "topicName": string,
      "estimatedHours": number,
      "resources": [{
        "title": string,
        "platform": string,
        "url": string,
        "type": "video" | "course" | "docs" | "project" | "book",
        "isFree": boolean,
        "costINR": number,
        "difficulty": "beginner" | "intermediate" | "advanced",
        "durationHours": number
      }],
      "practiceProject": string,
      "checkpointQuestion": string
    }]
  }],
  "milestones": [{ "week": number, "achievement": string }],
  "dailySchedule": { "weekday": string, "weekendHours": number, "focusAreas": string[] }
}

For resource URLs use REAL active URLs:
- YouTube: "https://www.youtube.com/results?search_query=[topic]"
- Coursera: "https://www.coursera.org/search?query=[topic]"
- freeCodeCamp: "https://www.freecodecamp.org/learn"
- The Odin Project: "https://www.theodinproject.com"
- CS50: "https://cs50.harvard.edu"
- MDN: "https://developer.mozilla.org/docs/[topic]"
- Official docs URLs for frameworks
Include Indian creators like Neso Academy, Apna College, Code with Harry where relevant.`,
                    },
                ],
            })

            const raw = completion.choices[0]?.message?.content ?? ''
            const cleaned = raw.replace(/```json\n?|```/g, '').trim()
            const result: Pathway = JSON.parse(cleaned)
            setPathway(result)
            setExpandedPhase(0)

            const emptyProgress: Record<string, boolean> = {}
            setProgressState(emptyProgress)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyProgress))

            // Save to Supabase
            await savePathwayToDb(result, emptyProgress)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate pathway')
        } finally {
            setIsGenerating(false)
        }
    }

    // ── Export as PDF ────────────────────────────────────────────────────
    const exportPdf = () => {
        if (!pathway) return
        const pdf = new jsPDF()
        const pageW = pdf.internal.pageSize.getWidth()
        const margin = 20
        const maxW = pageW - margin * 2
        let y = 30

        const checkPage = (needed: number) => {
            if (y + needed > pdf.internal.pageSize.getHeight() - 20) {
                pdf.addPage()
                y = 20
            }
        }

        // Cover page
        pdf.setFontSize(24)
        pdf.setFont('helvetica', 'bold')
        pdf.text(pathway.pathwayTitle, margin, y)
        y += 12

        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(120)
        pdf.text(`Target: ${form.goal}`, margin, y); y += 7
        pdf.text(`Duration: ${pathway.totalWeeks} weeks · ${pathway.weeklyHours} hrs/week`, margin, y); y += 7
        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y); y += 7
        pdf.text(`Phases: ${pathway.phases.length}`, margin, y); y += 15
        pdf.setTextColor(0)

        // Phases
        pathway.phases.forEach(phase => {
            checkPage(30)
            pdf.setFontSize(16)
            pdf.setFont('helvetica', 'bold')
            pdf.text(`Phase ${phase.phaseNumber}: ${phase.phaseTitle}`, margin, y); y += 8

            pdf.setFontSize(9)
            pdf.setFont('helvetica', 'italic')
            pdf.setTextColor(100)
            const objLines = pdf.splitTextToSize(phase.objective, maxW)
            pdf.text(objLines, margin, y); y += objLines.length * 5 + 5
            pdf.setTextColor(0)

            phase.topics.forEach(topic => {
                checkPage(20)
                pdf.setFontSize(11)
                pdf.setFont('helvetica', 'bold')
                pdf.text(`• ${topic.topicName} (${topic.estimatedHours}h)`, margin + 4, y); y += 6

                topic.resources.forEach(res => {
                    checkPage(12)
                    pdf.setFontSize(9)
                    pdf.setFont('helvetica', 'normal')
                    const label = `${res.title} — ${res.platform}${res.isFree ? ' [Free]' : ` [₹${res.costINR}]`}`
                    const resLines = pdf.splitTextToSize(label, maxW - 12)
                    pdf.text(resLines, margin + 10, y); y += resLines.length * 4.5

                    pdf.setTextColor(50, 100, 200)
                    pdf.setFontSize(7)
                    const urlLines = pdf.splitTextToSize(res.url, maxW - 12)
                    pdf.textWithLink(urlLines[0], margin + 10, y, { url: res.url })
                    y += 5
                    pdf.setTextColor(0)
                })

                checkPage(10)
                pdf.setFontSize(9)
                pdf.setFont('helvetica', 'italic')
                pdf.setTextColor(80)
                const projLines = pdf.splitTextToSize(`Project: ${topic.practiceProject}`, maxW - 8)
                pdf.text(projLines, margin + 8, y); y += projLines.length * 4.5 + 4
                pdf.setTextColor(0)
            })

            y += 5
        })

        // Milestones
        checkPage(20)
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Milestones', margin, y); y += 8

        pathway.milestones.forEach(m => {
            checkPage(10)
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            const mText = `☐  Week ${m.week}: ${m.achievement}`
            const mLines = pdf.splitTextToSize(mText, maxW)
            pdf.text(mLines, margin + 4, y); y += mLines.length * 5 + 2
        })

        pdf.save('learning-pathway-skillos.pdf')
    }

    // ── Share Pathway ───────────────────────────────────────────────────
    const sharePathway = async () => {
        if (!pathway) return
        try {
            const encoded = btoa(JSON.stringify(pathway))
            const shareUrl = `${window.location.origin}/learning?shared=${encoded}`
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // fallback
            const encoded = btoa(JSON.stringify(pathway))
            const shareUrl = `${window.location.origin}/learning?shared=${encoded}`
            const input = document.createElement('textarea')
            input.value = shareUrl
            document.body.appendChild(input)
            input.select()
            document.execCommand('copy')
            document.body.removeChild(input)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // ── Render Form ─────────────────────────────────────────────────────
    if (!pathway && !isGenerating) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#C49B3A]/20 to-[#C49B3A]/5 flex items-center justify-center">
                        <BookOpen className="w-7 h-7 text-[#C49B3A]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#E8E6E3]">Learning Pathway Generator</h1>
                    <p className="text-[#6B6966] text-sm mt-1">AI-powered personalized learning plans with curated resources</p>
                </div>

                {/* My Pathways toggle */}
                {savedPathways.length > 0 && (
                    <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
                        <button
                            onClick={() => setShowMyPathways(!showMyPathways)}
                            className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition"
                        >
                            <span className="flex items-center gap-2 text-sm font-medium text-[#E8E6E3]">
                                <FolderOpen className="w-4 h-4 text-[#C49B3A]" />
                                My Pathways ({savedPathways.length})
                            </span>
                            <ChevronDown className={`w-4 h-4 text-[#6B6966] transition-transform ${showMyPathways ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showMyPathways && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 pb-4 space-y-2 border-t border-[rgba(255,255,255,0.04)]">
                                        {loadingPathways ? (
                                            <div className="py-4 text-center text-[#6B6966] text-sm">Loading...</div>
                                        ) : (
                                            savedPathways.map(sp => (
                                                <div
                                                    key={sp.id}
                                                    className="flex items-center gap-3 p-3 rounded-lg bg-[#22262A] hover:bg-[#2A2E33] transition group cursor-pointer"
                                                    onClick={() => loadPathway(sp)}
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-[rgba(196,155,58,0.1)] flex items-center justify-center flex-shrink-0">
                                                        <BookOpen className="w-4 h-4 text-[#C49B3A]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-[#E8E6E3] truncate">{sp.pathway_data?.pathwayTitle || sp.target_role || 'Untitled'}</p>
                                                        <p className="text-[10px] text-[#6B6966]">
                                                            {new Date(sp.created_at).toLocaleDateString()} · {sp.target_role || 'General'}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); deletePathway(sp.id) }}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/10 transition"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Form */}
                <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 space-y-5">
                    <div>
                        <label className="text-sm font-medium text-[#9A9996] mb-1.5 block">What do you want to learn?</label>
                        <input
                            value={form.goal}
                            onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                            placeholder="e.g., Full Stack Web Development, Machine Learning, DevOps..."
                            className="w-full px-4 py-2.5 bg-[#22262A] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#E8E6E3] text-sm placeholder:text-[#4A4845] focus:outline-none focus:border-[#C49B3A] transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-[#9A9996] mb-1.5 block">Current Level</label>
                        <div className="flex gap-2">
                            {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                                <button
                                    key={level}
                                    onClick={() => setForm(f => ({ ...f, currentLevel: level }))}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all
                                        ${form.currentLevel === level
                                            ? 'bg-[#C49B3A] text-black'
                                            : 'bg-[#22262A] text-[#9A9996] hover:bg-[#2A2E33]'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-[#9A9996] mb-1.5 block">Hours / Week</label>
                            <input
                                type="number"
                                min={1}
                                max={40}
                                value={form.hoursPerWeek}
                                onChange={e => setForm(f => ({ ...f, hoursPerWeek: Number(e.target.value) }))}
                                className="w-full px-4 py-2.5 bg-[#22262A] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#E8E6E3] text-sm focus:outline-none focus:border-[#C49B3A] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#9A9996] mb-1.5 block">Budget</label>
                            <select
                                value={form.budget}
                                onChange={e => setForm(f => ({ ...f, budget: e.target.value as FormData['budget'] }))}
                                className="w-full px-4 py-2.5 bg-[#22262A] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#E8E6E3] text-sm focus:outline-none focus:border-[#C49B3A] transition-colors"
                            >
                                <option value="free">Free only</option>
                                <option value="low">Under ₹2,000</option>
                                <option value="any">Any budget</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-[#9A9996] mb-1.5 block">Target Timeline</label>
                        <div className="flex gap-2">
                            {['1 month', '3 months', '6 months', '1 year'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setForm(f => ({ ...f, targetTimeline: t }))}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                                        ${form.targetTimeline === t
                                            ? 'bg-[#C49B3A] text-black'
                                            : 'bg-[#22262A] text-[#9A9996] hover:bg-[#2A2E33]'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={generatePathway}
                        disabled={!form.goal.trim()}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C49B3A] to-[#D4AB4A] text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Generate Learning Pathway
                    </button>
                </div>
            </div>
        )
    }

    // ── Generating State ────────────────────────────────────────────────
    if (isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C49B3A]/20 to-transparent flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#C49B3A] animate-spin" />
                </div>
                <div className="text-center">
                    <h3 className="text-[#E8E6E3] font-semibold">Crafting your Learning Pathway...</h3>
                    <p className="text-[#6B6966] text-sm mt-1">Curating the best resources for "{form.goal}"</p>
                </div>
                <div className="w-full max-w-xs h-1.5 rounded-full bg-[#22262A] overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#C49B3A] to-[#D4AB4A]"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        style={{ width: '40%' }}
                    />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-lg mx-auto text-center py-16 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Target className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-[#E8E6E3] font-semibold">Generation Failed</h3>
                <p className="text-[#6B6966] text-sm">{error}</p>
                <button
                    onClick={() => { setError(null); setPathway(null) }}
                    className="px-6 py-2 rounded-lg bg-[#22262A] text-[#E8E6E3] text-sm hover:bg-[#2A2E33] transition"
                >
                    Try Again
                </button>
            </div>
        )
    }

    if (!pathway) return null

    // ── Pathway Display ─────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header + Progress */}
            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-[#E8E6E3]">{pathway.pathwayTitle}</h1>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-[#6B6966]">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {pathway.totalWeeks} weeks</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {pathway.weeklyHours} hrs/week</span>
                            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {pathway.phases.length} phases</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={exportPdf}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22262A] text-[#9A9996] text-xs hover:bg-[#2A2E33] hover:text-[#E8E6E3] transition"
                            title="Export as PDF"
                        >
                            <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button
                            onClick={sharePathway}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22262A] text-[#9A9996] text-xs hover:bg-[#2A2E33] hover:text-[#E8E6E3] transition"
                            title="Share Pathway"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                            {copied ? 'Copied!' : 'Share'}
                        </button>
                        <button
                            onClick={() => { setPathway(null); setCurrentPathwayId(null); setProgressState({}) }}
                            className="px-3 py-1.5 rounded-lg bg-[#22262A] text-[#9A9996] text-xs hover:bg-[#2A2E33] transition"
                        >
                            New
                        </button>
                    </div>
                </div>

                {/* Overall progress bar */}
                <div>
                    <div className="flex justify-between text-xs text-[#6B6966] mb-1">
                        <span>Overall Progress</span>
                        <span className="text-[#C49B3A] font-medium">{overallPercent}%</span>
                    </div>
                    <div className="h-2 bg-[#22262A] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#C49B3A] to-[#D4AB4A] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${overallPercent}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                    <p className="text-[10px] text-[#4A4845] mt-1">{completedTopics}/{totalTopics} topics completed</p>
                </div>
            </div>

            {/* Phase Timeline */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {pathway.phases.map((phase, i) => {
                    const phaseCompleted = phase.topics.filter((_, ti) => progress[`${i}-${ti}`]).length
                    const isActive = expandedPhase === i
                    return (
                        <button
                            key={i}
                            onClick={() => setExpandedPhase(isActive ? null : i)}
                            className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all min-w-[220px]
                                ${isActive
                                    ? 'bg-[#C49B3A]/10 border-[#C49B3A]/30'
                                    : 'bg-[#1A1D20] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                                ${isActive ? 'bg-[#C49B3A] text-black' : 'bg-[#22262A] text-[#9A9996]'}`}>
                                {phase.phaseNumber}
                            </div>
                            <div className="text-left">
                                <p className={`text-sm font-medium truncate ${isActive ? 'text-[#C49B3A]' : 'text-[#E8E6E3]'}`}>
                                    {phase.phaseTitle}
                                </p>
                                <p className="text-[10px] text-[#6B6966]">{phaseCompleted}/{phase.topics.length} topics · {phase.durationWeeks}w</p>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Expanded Phase Content */}
            <AnimatePresence mode="wait">
                {expandedPhase !== null && pathway.phases[expandedPhase] && (
                    <motion.div
                        key={expandedPhase}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                    >
                        <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                            <p className="text-sm text-[#9A9996]">
                                <span className="text-[#C49B3A] font-medium">Objective: </span>
                                {pathway.phases[expandedPhase].objective}
                            </p>
                        </div>

                        {pathway.phases[expandedPhase].topics.map((topic, ti) => {
                            const topicKey = `${expandedPhase}-${ti}`
                            const isCompleted = progress[topicKey]
                            const isOpen = expandedTopic === topicKey

                            return (
                                <div key={ti} className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
                                    <div
                                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition"
                                        onClick={() => setExpandedTopic(isOpen ? null : topicKey)}
                                    >
                                        <button
                                            onClick={e => { e.stopPropagation(); toggleComplete(topicKey) }}
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                                                ${isCompleted
                                                    ? 'bg-[#5A9A5A] border-[#5A9A5A]'
                                                    : 'border-[#4A4845] hover:border-[#C49B3A]'
                                                }`}
                                        >
                                            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${isCompleted ? 'text-[#6B6966] line-through' : 'text-[#E8E6E3]'}`}>
                                                {topic.topicName}
                                            </p>
                                        </div>

                                        <span className="px-2 py-0.5 bg-[rgba(196,155,58,0.1)] rounded text-[10px] text-[#C49B3A] font-medium flex-shrink-0">
                                            {topic.estimatedHours}h
                                        </span>

                                        <ChevronDown className={`w-4 h-4 text-[#6B6966] transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.04)] pt-3 space-y-4">
                                                    <div>
                                                        <p className="text-xs text-[#6B6966] uppercase tracking-wide mb-2">Resources</p>
                                                        <div className="space-y-2">
                                                            {topic.resources.map((res, ri) => (
                                                                <a
                                                                    key={ri}
                                                                    href={res.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-3 p-2.5 rounded-lg bg-[#22262A] hover:bg-[#2A2E33] transition group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center text-[#9A9996] group-hover:text-[#C49B3A] transition">
                                                                        {resourceIcon(res.type)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm text-[#E8E6E3] truncate group-hover:text-[#C49B3A] transition">
                                                                            {res.title}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-[#6B6966] mt-0.5">
                                                                            <span>{res.platform}</span>
                                                                            <span>·</span>
                                                                            <span>{res.durationHours}h</span>
                                                                            <span>·</span>
                                                                            <span className={difficultyColor(res.difficulty) + ' px-1.5 py-0.5 rounded capitalize'}>
                                                                                {res.difficulty}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0
                                                                        ${res.isFree
                                                                            ? 'bg-emerald-400/10 text-emerald-400'
                                                                            : 'bg-amber-400/10 text-amber-400'
                                                                        }`}>
                                                                        {res.isFree ? 'Free' : `₹${res.costINR}`}
                                                                    </span>
                                                                    <ExternalLink className="w-3.5 h-3.5 text-[#4A4845] group-hover:text-[#C49B3A] flex-shrink-0" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs text-[#6B6966] uppercase tracking-wide mb-2">Practice Project</p>
                                                        <div className="bg-[#0D0F11] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 font-mono text-xs text-[#9A9996]">
                                                            <span className="text-[#C49B3A]">$ </span>{topic.practiceProject}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs text-[#6B6966] uppercase tracking-wide mb-1">Checkpoint Question</p>
                                                        <p className="text-sm text-[#E8E6E3] italic">"{topic.checkpointQuestion}"</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Milestones Timeline */}
            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#E8E6E3] mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#C49B3A]" /> Milestones
                </h3>
                <div className="space-y-0">
                    {pathway.milestones.map((m, i) => {
                        const isReached = overallPercent >= ((m.week / pathway.totalWeeks) * 100)
                        return (
                            <div key={i} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 border-2
                                        ${isReached ? 'bg-[#C49B3A] border-[#C49B3A]' : 'bg-transparent border-[#4A4845]'}`}
                                    />
                                    {i < pathway.milestones.length - 1 && (
                                        <div className={`w-0.5 flex-1 min-h-[24px] ${isReached ? 'bg-[#C49B3A]/30' : 'bg-[rgba(255,255,255,0.06)]'}`} />
                                    )}
                                </div>
                                <div className="pb-4">
                                    <p className="text-xs text-[#C49B3A] font-medium">Week {m.week}</p>
                                    <p className={`text-sm ${isReached ? 'text-[#E8E6E3]' : 'text-[#6B6966]'}`}>{m.achievement}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Daily Schedule */}
            {pathway.dailySchedule && (
                <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-[#E8E6E3] mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#C49B3A]" /> Recommended Schedule
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="bg-[#22262A] rounded-lg p-3">
                            <p className="text-[10px] text-[#6B6966] uppercase mb-1">Weekday</p>
                            <p className="text-[#E8E6E3]">{pathway.dailySchedule.weekday}</p>
                        </div>
                        <div className="bg-[#22262A] rounded-lg p-3">
                            <p className="text-[10px] text-[#6B6966] uppercase mb-1">Weekend Hours</p>
                            <p className="text-[#E8E6E3]">{pathway.dailySchedule.weekendHours}h / day</p>
                        </div>
                        <div className="bg-[#22262A] rounded-lg p-3">
                            <p className="text-[10px] text-[#6B6966] uppercase mb-1">Focus Areas</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                                {pathway.dailySchedule.focusAreas.map((area, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-[rgba(196,155,58,0.1)] rounded text-[10px] text-[#C49B3A]">{area}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
