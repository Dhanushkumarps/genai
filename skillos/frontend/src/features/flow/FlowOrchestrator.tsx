import { useState, useEffect, useCallback } from 'react'
import {
    Zap, Timer, Play, Pause, TrendingUp, AlertTriangle,
    Coffee, Target, Clock, BarChart3, Shield, X, CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import MacWindow from '@/components/ui/MacWindow'

const callFlowOrchestrator = async (action: string, data: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flow-orchestrator`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action, user_id: user?.id, data })
    })
    return response.json()
}

export default function FlowOrchestrator() {
    const { user } = useAuth()
    const [isInFlow, setIsInFlow] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [flowDepth, setFlowDepth] = useState(0)
    const [sessionDuration, setSessionDuration] = useState(0)
    const [stats, setStats] = useState<any>(null)
    const [patterns, setPatterns] = useState<any>(null)
    const [interruptionCost, setInterruptionCost] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)

    const loadStats = useCallback(async () => {
        const result = await callFlowOrchestrator('get_flow_stats', { days: 7 })
        if (result.success) setStats(result)
    }, [])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isInFlow && sessionId) {
            interval = setInterval(() => {
                setSessionDuration(d => d + 1)
                // Simulate flow depth increase
                setFlowDepth(d => Math.min(100, d + 0.5))
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [isInFlow, sessionId])

    const startFlow = async () => {
        setIsLoading(true)
        const result = await callFlowOrchestrator('start_flow', { task_context: 'Deep work session' })
        if (result.success) {
            setIsInFlow(true)
            setSessionId(result.session_id)
            setSessionDuration(0)
            setFlowDepth(20)
        }
        setIsLoading(false)
    }

    const endFlow = async (quality: number) => {
        if (!sessionId) return
        setIsLoading(true)
        await callFlowOrchestrator('end_flow', {
            session_id: sessionId,
            quality_score: quality,
            triggers: ['quiet environment'],
            breakers: []
        })
        setIsInFlow(false)
        setSessionId(null)
        setFlowDepth(0)
        await loadStats()
        setIsLoading(false)
    }

    const analyzePatterns = async () => {
        setIsLoading(true)
        const result = await callFlowOrchestrator('analyze_patterns')
        if (result.success) setPatterns(result.patterns)
        setIsLoading(false)
    }

    const checkInterruptionCost = async () => {
        const result = await callFlowOrchestrator('calculate_interruption_cost', {
            current_flow_depth: flowDepth,
            hourly_rate: 50
        })
        if (result.success) setInterruptionCost(result)
    }

    useEffect(() => {
        if (isInFlow && flowDepth > 30) {
            checkInterruptionCost()
        }
    }, [flowDepth, isInFlow])

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="p-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        Flow State Orchestrator
                    </h1>
                    <p className="text-white/50 mt-1">Automatic Deep Work Mode</p>
                </div>
                {!isInFlow ? (
                    <Button onClick={startFlow} disabled={isLoading} className="bg-gradient-to-r from-cyan-600 to-blue-600">
                        <Play className="w-4 h-4 mr-2" />
                        Start Flow Session
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="destructive" onClick={() => endFlow(60)}>
                            <Pause className="w-4 h-4 mr-2" />
                            End Session
                        </Button>
                    </div>
                )}
            </div>

            {/* Active Flow Session */}
            {isInFlow && (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-cyan-400 font-medium">FLOW SESSION ACTIVE</span>
                        </div>
                        <span className="text-2xl font-mono text-white">{formatDuration(sessionDuration)}</span>
                    </div>

                    {/* Flow Depth Meter */}
                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-white/60">Flow Depth</span>
                            <span className="text-cyan-400">{Math.round(flowDepth)}%</span>
                        </div>
                        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
                                style={{ width: `${flowDepth}%` }}
                            />
                        </div>
                    </div>

                    {/* Interruption Cost Warning */}
                    {interruptionCost && flowDepth > 50 && (
                        <div className="p-3 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-400" />
                            <div>
                                <p className="text-orange-400 font-medium">Protect your flow!</p>
                                <p className="text-white/60 text-sm">
                                    Interrupting now costs ~${interruptionCost.dollar_cost}
                                    ({interruptionCost.recovery_time_mins} min recovery)
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span className="text-white/60 text-sm">Total Flow Hours</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.total_flow_hours || 0}h</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-green-400" />
                        <span className="text-white/60 text-sm">Sessions</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.sessions_count || 0}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        <span className="text-white/60 text-sm">Avg Quality</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.avg_quality || 0}%</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Coffee className="w-4 h-4 text-orange-400" />
                        <span className="text-white/60 text-sm">Avg Duration</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.avg_duration || 0}m</p>
                </div>
            </div>

            {/* Analyze Patterns */}
            <MacWindow title="Flow Patterns" icon={<BarChart3 className="w-4 h-4" />}>
                <div className="p-4">
                    {!patterns ? (
                        <div className="text-center py-8">
                            <p className="text-white/40 mb-4">Analyze your flow patterns to optimize performance</p>
                            <Button onClick={analyzePatterns} disabled={isLoading}>
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Analyze My Patterns
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Flow Fingerprint */}
                            {patterns.flow_fingerprint && (
                                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                                    <h3 className="text-cyan-400 font-medium mb-2">Your Flow Fingerprint</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-white/60 text-sm">Peak Time</span>
                                            <p className="text-white">{patterns.flow_fingerprint.peak_time}</p>
                                        </div>
                                        <div>
                                            <span className="text-white/60 text-sm">Ideal Session</span>
                                            <p className="text-white">{patterns.flow_fingerprint.ideal_session_length} min</p>
                                        </div>
                                        <div>
                                            <span className="text-white/60 text-sm">Superpower</span>
                                            <p className="text-green-400">{patterns.flow_fingerprint.superpower}</p>
                                        </div>
                                        <div>
                                            <span className="text-white/60 text-sm">Vulnerability</span>
                                            <p className="text-orange-400">{patterns.flow_fingerprint.vulnerability}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {patterns.recommendations?.length > 0 && (
                                <div>
                                    <h4 className="text-white/60 text-sm mb-2">Recommendations</h4>
                                    {patterns.recommendations.map((rec: string, i: number) => (
                                        <div key={i} className="flex items-start gap-2 mb-2">
                                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                                            <span className="text-white/80 text-sm">{rec}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </MacWindow>
        </div>
    )
}
