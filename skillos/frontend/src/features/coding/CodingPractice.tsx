import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronDown, ExternalLink, Lightbulb,
    Loader2, Terminal, CheckCircle2, XCircle, Clock,
    Cpu, Sparkles, RotateCcw, Code2, Send,
    Video, Trophy, Flame, ArrowRight, Eye
} from 'lucide-react'
import { openai } from '@/lib/openai'
import { CodeEditor, type Language } from './CodeEditor'
import { EditorTimer } from './EditorTimer'
import { EditorToolbar } from './EditorToolbar'
import { TestCasePanel } from './TestCasePanel'

// ── Constants ──────────────────────────────────────────────────────────
const TOPICS = [
    'Arrays', 'Strings', 'HashMaps', 'Trees', 'Graphs', 'DP', 'Sorting',
    'Binary Search', 'Stacks', 'Queues', 'Recursion', 'Math',
    'Bit Manipulation', 'Sliding Window', 'Two Pointers',
] as const

const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go'] as const

const SOURCES = [
    'My Skill Gaps',
    'My Target Role',
    'My Weak Topics',
    'Random',
    'Custom Topic',
] as const

type Difficulty = 'Easy' | 'Medium' | 'Hard'

interface TestCase {
    input: string
    expectedOutput: string
    actualOutput?: string
    passed?: boolean
}

interface Question {
    id: string
    title: string
    difficulty: Difficulty
    topics: string[]
    description: string
    examples: { input: string; output: string; explanation: string }[]
    constraints: string[]
    hints: string[]
    starterCode: Record<string, string>
    testCases: TestCase[]
    optimalTimeComplexity: string
    optimalSpaceComplexity: string
    approachHint: string
}

interface SolutionResult {
    isCorrect: boolean
    passedTestCases: number
    totalTestCases: number
    timeComplexity: string
    spaceComplexity: string
    feedback: string
    improvements: string[]
    optimalSolution: string
    explanation: string
    testResults: { input: string; expectedOutput: string; actualOutput: string; passed: boolean }[]
}

interface HistoryEntry {
    questionTitle: string
    difficulty: Difficulty
    topic: string
    solved: boolean
    timestamp: string
    language: string
}

const HISTORY_KEY = 'skillos_coding_history'

// ── Difficulty Config ──────────────────────────────────────────────────
const diffConfig: Record<Difficulty, { glow: string; shadow: string }> = {
    Easy: { glow: '#30e8bd', shadow: 'rgba(48,232,189,0.25)' },
    Medium: { glow: '#f0b429', shadow: 'rgba(240,180,41,0.25)' },
    Hard: { glow: '#f04848', shadow: 'rgba(240,72,72,0.25)' },
}

// ── Helpers ─────────────────────────────────────────────────────────────
function getHistory(): HistoryEntry[] {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

function saveHistory(h: HistoryEntry[]) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
}

function calculateStreak(history: HistoryEntry[]): number {
    const solved = history.filter(h => h.solved)
    if (solved.length === 0) return 0

    const uniqueDays = new Set(solved.map(h => h.timestamp.split('T')[0]))
    const sortedDays = Array.from(uniqueDays).sort().reverse()
    const today = new Date().toISOString().split('T')[0]

    let streak = 0
    const startDate = new Date()

    for (let i = 0; i < 60; i++) {
        const checkDate = new Date(startDate)
        checkDate.setDate(checkDate.getDate() - i)
        const dateStr = checkDate.toISOString().split('T')[0]
        if (sortedDays.includes(dateStr)) {
            streak++
        } else if (i > 0) {
            break
        }
    }
    return streak
}

function buildHeatmap(history: HistoryEntry[]): { date: string; count: number }[] {
    const map: Record<string, number> = {}
    history.filter(h => h.solved).forEach(h => {
        const day = h.timestamp.split('T')[0]
        map[day] = (map[day] || 0) + 1
    })
    const result: { date: string; count: number }[] = []
    const today = new Date()
    for (let i = 89; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const ds = d.toISOString().split('T')[0]
        result.push({ date: ds, count: map[ds] || 0 })
    }
    return result
}

// ── Main Component ─────────────────────────────────────────────────────
export default function CodingPractice() {
    const [difficulty, setDifficulty] = useState<Difficulty>('Easy')
    const [selectedTopics, setSelectedTopics] = useState<string[]>(['Arrays'])
    const [source, setSource] = useState<string>('Random')
    const [customTopic, setCustomTopic] = useState('')
    const [language, setLanguage] = useState<Language>('Python')
    const [question, setQuestion] = useState<Question | null>(null)
    const [code, setCode] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isChecking, setIsChecking] = useState(false)
    const [showHints, setShowHints] = useState(false)
    const [showOptimal, setShowOptimal] = useState(false)
    const [solutionResult, setSolutionResult] = useState<SolutionResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [history, setHistory] = useState<HistoryEntry[]>(getHistory)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Editor settings state
    const [fontSize, setFontSize] = useState<number>(14)
    const [tabSize, setTabSize] = useState<number>(4)
    const [showMinimap, setShowMinimap] = useState<boolean>(false)
    const [timerRunning, setTimerRunning] = useState<boolean>(false)

    const streak = useMemo(() => calculateStreak(history), [history])
    const totalSolved = useMemo(() => history.filter(h => h.solved).length, [history])
    const heatmapData = useMemo(() => buildHeatmap(history), [history])

    const toggleTopic = (t: string) =>
        setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

    const addHistoryEntry = useCallback((entry: HistoryEntry) => {
        setHistory(prev => {
            const next = [entry, ...prev].slice(0, 200)
            saveHistory(next)
            return next
        })
    }, [])

    // ── generateQuestion ────────────────────────────────────────────────
    const generateQuestion = async (
        diff: Difficulty,
        topics: string[],
        personalizationContext: string
    ) => {
        setIsGenerating(true)
        setError(null)
        setQuestion(null)
        setSolutionResult(null)
        setShowOptimal(false)

        const topicList = topics.length > 0 ? topics.join(', ') : 'general algorithms'

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.7,
                max_tokens: 4096,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a coding interview expert. Generate unique, original coding problems. Never copy LeetCode problems exactly — create similar but distinct ones. Always respond with valid JSON only.',
                    },
                    {
                        role: 'user',
                        content: `Generate a ${diff} coding problem.
Topics: ${topicList}
Context: ${personalizationContext}

Return JSON:
{
  "id": "unique-id",
  "title": "Problem Title",
  "difficulty": "${diff}",
  "topics": ["topic1"],
  "description": "Full problem statement",
  "examples": [{ "input": "...", "output": "...", "explanation": "..." }],
  "constraints": ["..."],
  "hints": ["..."],
  "starterCode": {
    "Python": "def solution(...):\\n    pass",
    "JavaScript": "function solution(...) {\\n  \\n}",
    "TypeScript": "function solution(...): ... {\\n  \\n}",
    "Java": "class Solution {\\n    public ... solution(...) {\\n    }\\n}",
    "C++": "class Solution {\\npublic:\\n    ... solution(...) {\\n    }\\n};",
    "Go": "func solution(...) ... {\\n    \\n}"
  },
  "testCases": [{ "input": "...", "expectedOutput": "..." }],
  "optimalTimeComplexity": "O(n)",
  "optimalSpaceComplexity": "O(1)",
  "approachHint": "Think about..."
}

Make it realistic with 3-5 test cases, 2-3 hints, and proper starter code for all languages.`,
                    },
                ],
            })

            const raw = completion.choices[0]?.message?.content ?? ''
            const cleaned = raw.replace(/```json\n?|```/g, '').trim()
            const result: Question = JSON.parse(cleaned)
            setQuestion(result)
            setCode(result.starterCode[language] || result.starterCode['Python'] || '')
            setShowHints(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate question')
        } finally {
            setIsGenerating(false)
        }
    }

    // ── checkSolution ───────────────────────────────────────────────────
    const checkSolution = async (q: Question, userCode: string, lang: string, isSubmit = true) => {
        if (!userCode.trim()) return
        setIsChecking(true)
        setSolutionResult(null)
        if (isSubmit) setTimerRunning(false)

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.2,
                max_tokens: 4096,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a code reviewer. Evaluate the solution against the provided test cases by mentally executing the code. Respond with valid JSON only.',
                    },
                    {
                        role: 'user',
                        content: `Problem: ${q.title}
Description: ${q.description}

Language: ${lang}
Code:
\`\`\`
${userCode}
\`\`\`

Test Cases:
${q.testCases.map((tc, i) => `${i + 1}. Input: ${tc.input} → Expected: ${tc.expectedOutput}`).join('\n')}

Evaluate and return JSON:
{
  "isCorrect": boolean,
  "passedTestCases": number,
  "totalTestCases": number,
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "feedback": "Brief feedback",
  "improvements": ["Suggestion 1", "..."],
  "optimalSolution": "Full optimal solution code in ${lang}",
  "explanation": "Explanation of the optimal approach",
  "testResults": [
    { "input": "...", "expectedOutput": "...", "actualOutput": "...", "passed": true/false }
  ]
}`,
                    },
                ],
            })

            const raw = completion.choices[0]?.message?.content ?? ''
            const cleaned = raw.replace(/```json\n?|```/g, '').trim()
            const result: SolutionResult = JSON.parse(cleaned)
            setSolutionResult(result)

            if (isSubmit) {
                addHistoryEntry({
                    questionTitle: q.title,
                    difficulty: q.difficulty,
                    topic: q.topics[0] || 'General',
                    solved: result.isCorrect,
                    timestamp: new Date().toISOString(),
                    language: lang,
                })
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to evaluate solution')
        } finally {
            setIsChecking(false)
        }
    }

    // ── generateSimilarQuestion ─────────────────────────────────────────
    const generateSimilarQuestion = async () => {
        if (!question) return
        setIsGenerating(true)
        setError(null)
        setSolutionResult(null)
        setShowOptimal(false)

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.8,
                max_tokens: 4096,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a coding interview expert. Generate a follow-up problem that builds on the concepts from the previous problem but with a twist. Never copy the previous problem. Always respond with valid JSON only.',
                    },
                    {
                        role: 'user',
                        content: `The student just completed this problem:
Title: ${question.title}
Difficulty: ${question.difficulty}
Topics: ${question.topics.join(', ')}
Description: ${question.description}

Generate a follow-up problem that:
- Uses similar data structures/algorithms but with a variation
- Is slightly harder or tests a different edge case
- Is completely original

Return the same JSON structure:
{
  "id": "unique-id",
  "title": "...",
  "difficulty": "${question.difficulty}",
  "topics": [...],
  "description": "...",
  "examples": [{ "input": "...", "output": "...", "explanation": "..." }],
  "constraints": ["..."],
  "hints": ["..."],
  "starterCode": { "Python": "...", "JavaScript": "...", "TypeScript": "...", "Java": "...", "C++": "...", "Go": "..." },
  "testCases": [{ "input": "...", "expectedOutput": "..." }],
  "optimalTimeComplexity": "...",
  "optimalSpaceComplexity": "...",
  "approachHint": "..."
}`,
                    },
                ],
            })

            const raw = completion.choices[0]?.message?.content ?? ''
            const cleaned = raw.replace(/```json\n?|```/g, '').trim()
            const result: Question = JSON.parse(cleaned)
            setQuestion(result)
            setCode(result.starterCode[language] || result.starterCode['Python'] || '')
            setShowHints(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate follow-up')
        } finally {
            setIsGenerating(false)
        }
    }

    const switchLanguage = (lang: Language) => {
        setLanguage(lang)
        if (question?.starterCode[lang] && !code.trim()) {
            setCode(question.starterCode[lang])
        }
    }

    const lineCount = code.split('\n').length
    const diffColor = diffConfig[difficulty].glow

    // ── Render ──────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 max-w-5xl mx-auto">
            {/* Header + Stats */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#30e8bd]/10 flex items-center justify-center">
                        <Code2 className="w-5 h-5 text-[#30e8bd]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#E8E6E3]">Coding Practice</h1>
                        <p className="text-xs text-[#6B6966]">AI-generated DSA problems with instant evaluation</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-lg">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-sm font-bold text-[#E8E6E3]">{streak}</span>
                        <span className="text-[10px] text-[#6B6966]">day streak</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-lg">
                        <Trophy className="w-3.5 h-3.5 text-[#C49B3A]" />
                        <span className="text-sm font-bold text-[#E8E6E3]">{totalSolved}</span>
                        <span className="text-[10px] text-[#6B6966]">solved</span>
                    </div>
                </div>
            </div>

            {/* Practice Heatmap */}
            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                <p className="text-[10px] text-[#6B6966] uppercase tracking-wide mb-2">Last 90 Days</p>
                <div className="flex gap-[3px] flex-wrap">
                    {heatmapData.map((d, i) => (
                        <div
                            key={i}
                            title={`${d.date}: ${d.count} solved`}
                            className="w-[11px] h-[11px] rounded-[2px] transition-colors"
                            style={{
                                backgroundColor: d.count === 0 ? '#1e2227'
                                    : d.count === 1 ? '#30e8bd30'
                                        : d.count === 2 ? '#30e8bd60'
                                            : '#30e8bd',
                            }}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[9px] text-[#4A4845]">Less</span>
                    {['#1e2227', '#30e8bd30', '#30e8bd60', '#30e8bd'].map((c, i) => (
                        <div key={i} className="w-[9px] h-[9px] rounded-[2px]" style={{ backgroundColor: c }} />
                    ))}
                    <span className="text-[9px] text-[#4A4845]">More</span>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 space-y-4">
                {/* Difficulty */}
                <div>
                    <label className="text-xs text-[#6B6966] uppercase tracking-wide mb-2 block">Difficulty</label>
                    <div className="flex gap-2">
                        {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                style={difficulty === d
                                    ? { backgroundColor: diffConfig[d].glow, color: '#000', boxShadow: `0 0 20px ${diffConfig[d].shadow}, inset 0 1px 0 rgba(255,255,255,0.2)` }
                                    : { border: `1px solid ${diffConfig[d].glow}30`, color: diffConfig[d].glow, background: 'transparent' }
                                }
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Topics */}
                <div>
                    <label className="text-xs text-[#6B6966] uppercase tracking-wide mb-2 block">Topics</label>
                    <div className="flex flex-wrap gap-1.5">
                        {TOPICS.map(t => {
                            const active = selectedTopics.includes(t)
                            return (
                                <button
                                    key={t}
                                    onClick={() => toggleTopic(t)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                        ${active
                                            ? 'bg-[#30e8bd]/15 text-[#30e8bd] border border-[#30e8bd]/40'
                                            : 'bg-[#22262A] text-[#6B6966] border border-transparent hover:border-[rgba(255,255,255,0.08)] hover:text-[#9A9996]'
                                        }`}
                                >
                                    {t}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Source + Generate */}
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="text-xs text-[#6B6966] uppercase tracking-wide mb-1.5 block">Based on</label>
                        <select
                            value={source}
                            onChange={e => setSource(e.target.value)}
                            className="w-full px-3 py-2.5 bg-[#22262A] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#E8E6E3] focus:outline-none focus:border-[#30e8bd] transition"
                        >
                            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    {source === 'Custom Topic' && (
                        <div className="flex-1">
                            <input
                                value={customTopic}
                                onChange={e => setCustomTopic(e.target.value)}
                                placeholder="e.g., Graph BFS problems"
                                className="w-full px-3 py-2.5 bg-[#22262A] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#E8E6E3] placeholder:text-[#4A4845] focus:outline-none focus:border-[#30e8bd] transition"
                            />
                        </div>
                    )}
                    <button
                        onClick={() => generateQuestion(difficulty, selectedTopics, source === 'Custom Topic' ? customTopic : source)}
                        disabled={isGenerating}
                        className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 disabled:opacity-40"
                        style={{ backgroundColor: '#30e8bd', color: '#000', boxShadow: '0 0 20px rgba(48,232,189,0.25)' }}
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
                    {error}
                    <button onClick={() => setError(null)} className="ml-3 underline">Dismiss</button>
                </div>
            )}

            {/* Loading */}
            {isGenerating && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${diffColor}15` }}>
                        <Loader2 className="w-7 h-7 animate-spin" style={{ color: diffColor }} />
                    </div>
                    <p className="text-[#6B6966] text-sm">Creating a {difficulty.toLowerCase()} {selectedTopics[0] || ''} problem...</p>
                </div>
            )}

            {/* Question + Editor */}
            {question && !isGenerating && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Left: Problem */}
                    <div className="space-y-4">
                        {/* Title */}
                        <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                        style={{ backgroundColor: `${diffConfig[question.difficulty].glow}20`, color: diffConfig[question.difficulty].glow }}
                                    >
                                        {question.difficulty}
                                    </span>
                                    {question.topics.map((t, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded bg-[#22262A] text-[10px] text-[#6B6966]">{t}</span>
                                    ))}
                                </div>
                                <EditorTimer
                                    isRunning={timerRunning}
                                    onToggle={() => setTimerRunning(!timerRunning)}
                                    resetDependency={question.id}
                                />
                            </div>
                            <h2 className="text-lg font-bold text-[#E8E6E3]">{question.title}</h2>
                            {solutionResult && (
                                <button
                                    onClick={() => generateSimilarQuestion()}
                                    className="mt-3 flex items-center gap-1.5 text-xs text-[#30e8bd] hover:underline"
                                >
                                    <ArrowRight className="w-3 h-3" /> Generate Similar Question
                                </button>
                            )}
                        </div>

                        {/* Description */}
                        <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
                            <pre className="text-sm text-[#c9c7c3] whitespace-pre-wrap font-mono leading-relaxed">
                                {question.description}
                            </pre>
                        </div>

                        {/* Examples */}
                        <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 space-y-3">
                            <h3 className="text-xs text-[#6B6966] uppercase tracking-wide">Examples</h3>
                            {question.examples.map((ex, i) => (
                                <div key={i} className="bg-[#0a0a0a] border border-[#242424] rounded-lg p-3 font-mono text-xs space-y-1">
                                    <div><span className="text-[#6B6966]">Input:  </span><span className="text-[#30e8bd]">{ex.input}</span></div>
                                    <div><span className="text-[#6B6966]">Output: </span><span className="text-[#f0b429]">{ex.output}</span></div>
                                    {ex.explanation && (
                                        <div className="text-[#6B6966] pt-1 border-t border-[#242424]">{ex.explanation}</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Constraints */}
                        <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
                            <h3 className="text-xs text-[#6B6966] uppercase tracking-wide mb-2">Constraints</h3>
                            <ul className="space-y-1">
                                {question.constraints.map((c, i) => (
                                    <li key={i} className="text-xs text-[#9A9996] font-mono flex items-start gap-2">
                                        <span className="text-[#30e8bd] mt-0.5">•</span> {c}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Hints */}
                        <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowHints(!showHints)}
                                className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition"
                            >
                                <span className="flex items-center gap-2 text-sm text-[#9A9996]">
                                    <Lightbulb className="w-4 h-4 text-[#f0b429]" /> Hints ({question.hints.length})
                                </span>
                                <ChevronDown className={`w-4 h-4 text-[#6B6966] transition-transform ${showHints ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {showHints && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                        <div className="px-4 pb-4 space-y-2 border-t border-[rgba(255,255,255,0.04)]">
                                            {question.hints.map((h, i) => (
                                                <div key={i} className="flex gap-2 text-sm text-[#9A9996] pt-2">
                                                    <span className="text-[#f0b429] font-mono text-xs flex-shrink-0">{i + 1}.</span> {h}
                                                </div>
                                            ))}
                                            {question.approachHint && (
                                                <div className="pt-2 border-t border-[rgba(255,255,255,0.04)] text-sm text-[#6B6966]">
                                                    <span className="text-[#C49B3A]">Approach: </span>{question.approachHint}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right: Editor + Output */}
                    <div className="space-y-4 flex flex-col h-[800px] lg:h-auto min-h-[600px]">
                        <div className="flex-1 bg-[#0a0a0a] border border-[#242424] rounded-xl flex flex-col overflow-hidden min-h-[400px]">
                            <EditorToolbar
                                language={language}
                                onLanguageChange={(l) => switchLanguage(l as Language)}
                                fontSize={fontSize}
                                onFontSizeChange={setFontSize}
                                tabSize={tabSize}
                                onTabSizeChange={setTabSize}
                                showMinimap={showMinimap}
                                onMinimapToggle={() => setShowMinimap(!showMinimap)}
                                onReset={() => { setCode(question.starterCode[language] || ''); setSolutionResult(null); setShowOptimal(false) }}
                            />
                            <div className="flex-1 min-h-0 relative">
                                <CodeEditor
                                    code={code}
                                    language={language}
                                    fontSize={fontSize}
                                    tabSize={tabSize}
                                    showMinimap={showMinimap}
                                    wordWrap="on"
                                    onChange={(v) => setCode(v || '')}
                                    onRun={() => checkSolution(question, code, language, false)}
                                    onSubmit={() => checkSolution(question, code, language, true)}
                                />
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => checkSolution(question, code, language, false)}
                                disabled={isChecking || !code.trim()}
                                className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 bg-[#22262A] text-[#E8E6E3] hover:bg-[#2A2E33] border border-[rgba(255,255,255,0.06)]"
                            >
                                {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                                Run
                            </button>
                            <button
                                onClick={() => checkSolution(question, code, language, true)}
                                disabled={isChecking || !code.trim()}
                                className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                                style={{ backgroundColor: '#30e8bd', color: '#000', boxShadow: '0 0 15px rgba(48,232,189,0.2)' }}
                            >
                                {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Submit
                            </button>
                        </div>

                        {/* Test Case Panel */}
                        <TestCasePanel
                            testCases={question.testCases}
                            results={solutionResult?.testResults}
                        />

                        {/* Output Panel (Complexity + Feedback + Optimal) */}
                        <AnimatePresence>
                            {solutionResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
                                        <div className="flex items-center gap-2">
                                            <Terminal className="w-4 h-4 text-[#30e8bd]" />
                                            <span className="text-sm font-medium text-[#E8E6E3]">Results</span>
                                        </div>
                                        <span className={`text-xs font-bold ${solutionResult.isCorrect ? 'text-[#30e8bd]' : 'text-[#f04848]'}`}>
                                            {solutionResult.isCorrect ? '✓ Accepted' : '✗ Wrong Answer'} — {solutionResult.passedTestCases}/{solutionResult.totalTestCases}
                                        </span>
                                    </div>

                                    {/* Complexity */}
                                    <div className="p-4 flex gap-3">
                                        <div className="flex-1 bg-[#22262A] rounded-lg p-3">
                                            <div className="flex items-center gap-1.5 mb-1"><Clock className="w-3 h-3 text-[#f0b429]" /><span className="text-[10px] text-[#6B6966] uppercase">Time</span></div>
                                            <span className="text-sm font-mono text-[#E8E6E3]">{solutionResult.timeComplexity}</span>
                                        </div>
                                        <div className="flex-1 bg-[#22262A] rounded-lg p-3">
                                            <div className="flex items-center gap-1.5 mb-1"><Cpu className="w-3 h-3 text-[#8B5CF6]" /><span className="text-[10px] text-[#6B6966] uppercase">Space</span></div>
                                            <span className="text-sm font-mono text-[#E8E6E3]">{solutionResult.spaceComplexity}</span>
                                        </div>
                                    </div>

                                    {/* Feedback */}
                                    <div className="px-4 pb-3">
                                        <p className="text-sm text-[#9A9996]">{solutionResult.feedback}</p>
                                        {solutionResult.improvements && solutionResult.improvements.length > 0 && (
                                            <ul className="mt-2 space-y-1">
                                                {solutionResult.improvements.map((imp, i) => (
                                                    <li key={i} className="text-xs text-[#6B6966] flex gap-1.5"><span className="text-[#C49B3A]">→</span> {imp}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Optimal Solution */}
                                    <div className="border-t border-[rgba(255,255,255,0.04)]">
                                        <button
                                            onClick={() => setShowOptimal(!showOptimal)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition"
                                        >
                                            <span className="flex items-center gap-2 text-sm text-[#9A9996]">
                                                <Eye className="w-4 h-4 text-[#30e8bd]" /> Optimal Solution
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-[#6B6966] transition-transform ${showOptimal ? 'rotate-180' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {showOptimal && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="px-4 pb-4 space-y-3 border-t border-[rgba(255,255,255,0.04)]">
                                                        <div className="bg-[#0a0a0a] border border-[#242424] rounded-lg p-3 font-mono text-xs text-[#30e8bd] whitespace-pre-wrap overflow-x-auto">
                                                            {solutionResult.optimalSolution}
                                                        </div>
                                                        <p className="text-sm text-[#9A9996]">{solutionResult.explanation}</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    )
}
