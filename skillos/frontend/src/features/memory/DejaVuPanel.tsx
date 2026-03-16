import { useState, useEffect, useCallback } from 'react'
import {
    Sparkles, Brain, Link2, Clock, Lightbulb, AlertCircle,
    ChevronRight, Eye, RefreshCw, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import MacWindow from '@/components/ui/MacWindow'

const callDejaVu = async (action: string, data: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deja-vu-engine`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action, user_id: user?.id, data })
    })
    return response.json()
}

interface Memory {
    id: string
    type: string
    content?: string
    raw_text?: string
    summary?: string
    similarity: number
    created_at: string
}

export default function DejaVuPanel() {
    const { user } = useAuth()
    const [searchContext, setSearchContext] = useState('')
    const [memories, setMemories] = useState<Memory[]>([])
    const [synthesis, setSynthesis] = useState<any>(null)
    const [timeline, setTimeline] = useState<any>(null)
    const [lessons, setLessons] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSearching, setIsSearching] = useState(false)

    const loadTimeline = useCallback(async () => {
        const result = await callDejaVu('get_memory_timeline', { days: 7 })
        if (result.success) setTimeline(result)
    }, [])

    useEffect(() => {
        loadTimeline()
    }, [loadTimeline])

    const searchMemories = async () => {
        if (!searchContext.trim()) return
        setIsSearching(true)
        setMemories([])
        setSynthesis(null)

        const result = await callDejaVu('find_similar', { context: searchContext, limit: 5 })
        if (result.success && result.matches?.length > 0) {
            setMemories(result.matches)

            // Get synthesis
            const synthResult = await callDejaVu('synthesize_connections', {
                current_context: searchContext,
                memories: result.matches
            })
            if (synthResult.success) setSynthesis(synthResult.synthesis)
        }
        setIsSearching(false)
    }

    const learnFromFailure = async () => {
        setIsLoading(true)
        const result = await callDejaVu('learn_from_failure', {
            context: searchContext || 'current work'
        })
        if (result.success) setLessons(result)
        setIsLoading(false)
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    return (
        <div className="p-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        Déjà Vu Engine
                    </h1>
                    <p className="text-white/50 mt-1">Semantic Memory Recall</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2 mb-6">
                <Input
                    value={searchContext}
                    onChange={(e) => setSearchContext(e.target.value)}
                    placeholder="What are you working on? I'll find related memories..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && searchMemories()}
                />
                <Button onClick={searchMemories} disabled={isSearching} className="bg-violet-600 hover:bg-violet-700">
                    {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </Button>
            </div>

            {/* Memory Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-violet-400" />
                        <span className="text-white/60 text-sm">Brain Dumps</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{timeline?.brain_dumps?.length || 0}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-yellow-400" />
                        <span className="text-white/60 text-sm">Learning Logs</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{timeline?.learning_logs?.length || 0}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Link2 className="w-4 h-4 text-cyan-400" />
                        <span className="text-white/60 text-sm">Connections</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{timeline?.connections?.length || 0}</p>
                </div>
            </div>

            {/* Synthesis Results */}
            {synthesis && (
                <MacWindow title="🔮 Memory Synthesis" icon={<Zap className="w-4 h-4" />}>
                    <div className="p-4 space-y-4">
                        {/* Key Insight */}
                        <div className="p-4 rounded-lg bg-violet-500/20 border border-violet-500/30">
                            <p className="text-violet-400 font-medium text-sm mb-1">Key Insight</p>
                            <p className="text-white">{synthesis.key_insight}</p>
                        </div>

                        {/* Past Self Advice */}
                        {synthesis.past_self_advice && (
                            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                                <p className="text-cyan-400 font-medium text-sm mb-1">💬 Advice from Past You</p>
                                <p className="text-white/80">"{synthesis.past_self_advice}"</p>
                            </div>
                        )}

                        {/* Applicable Learnings */}
                        {synthesis.applicable_learnings?.length > 0 && (
                            <div>
                                <p className="text-white/60 text-sm mb-2">Applicable Learnings</p>
                                {synthesis.applicable_learnings.map((learning: any, i: number) => (
                                    <div key={i} className="flex items-start gap-2 mb-2 p-2 rounded bg-white/5">
                                        <ChevronRight className="w-4 h-4 text-green-400 mt-0.5" />
                                        <div>
                                            <p className="text-white text-sm">{learning.learning}</p>
                                            <p className="text-white/40 text-xs">{learning.how_to_apply}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Mistakes to Avoid */}
                        {synthesis.past_mistakes_to_avoid?.length > 0 && (
                            <div>
                                <p className="text-white/60 text-sm mb-2">⚠️ Past Mistakes to Avoid</p>
                                {synthesis.past_mistakes_to_avoid.map((mistake: any, i: number) => (
                                    <div key={i} className="flex items-start gap-2 mb-1">
                                        <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5" />
                                        <span className="text-white/80 text-sm">{mistake.mistake}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="text-center pt-2">
                            <span className={`text-sm px-3 py-1 rounded-full ${synthesis.connection_strength === 'strong' ? 'bg-green-500/20 text-green-400' :
                                    synthesis.connection_strength === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-white/10 text-white/50'
                                }`}>
                                {synthesis.connection_strength} connection
                            </span>
                        </div>
                    </div>
                </MacWindow>
            )}

            {/* Related Memories */}
            {memories.length > 0 && (
                <MacWindow title="Related Memories" icon={<Brain className="w-4 h-4" />}>
                    <div className="divide-y divide-white/5">
                        {memories.map((memory, i) => (
                            <div key={memory.id} className="p-4 hover:bg-white/5 transition-all">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                                        <Brain className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/50">
                                                {memory.type}
                                            </span>
                                            <span className="text-xs text-white/40">
                                                {formatDate(memory.created_at)}
                                            </span>
                                            <span className="text-xs text-violet-400">
                                                {Math.round(memory.similarity * 100)}% match
                                            </span>
                                        </div>
                                        <p className="text-white/80 text-sm line-clamp-2">
                                            {memory.summary || memory.content || memory.raw_text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </MacWindow>
            )}

            {/* Learn from Failure Button */}
            <div className="mt-6 text-center">
                <Button variant="outline" onClick={learnFromFailure} disabled={isLoading}>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Learn from Past Struggles
                </Button>
            </div>

            {/* Lessons */}
            {lessons?.lessons?.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                    <h3 className="text-orange-400 font-medium mb-3">📚 Lessons from Past Experiences</h3>
                    {lessons.lessons.map((lesson: any, i: number) => (
                        <div key={i} className="mb-3 pb-3 border-b border-white/10 last:border-0">
                            <p className="text-white">{lesson.lesson}</p>
                            <p className="text-white/40 text-sm mt-1">How to avoid: {lesson.how_to_avoid}</p>
                        </div>
                    ))}
                    {lessons.encouragement && (
                        <p className="text-green-400 text-sm mt-2">💪 {lessons.encouragement}</p>
                    )}
                </div>
            )}
        </div>
    )
}
