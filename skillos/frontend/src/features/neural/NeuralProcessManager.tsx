import { useState, useEffect, useCallback } from 'react'
import {
    Cpu, Activity, Pause, Play, X, RefreshCw, Zap, Brain,
    AlertTriangle, ChevronUp, ChevronDown, Layers, GitBranch,
    Timer, Target, Loader2, CheckCircle, PauseCircle, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import MacWindow from '@/components/ui/MacWindow'

interface MentalProcess {
    id: string
    process_name: string
    process_type: string
    priority: number
    cognitive_load: number
    status: 'running' | 'suspended' | 'blocked' | 'completed'
    context_tags: string[]
    tasks?: { title: string }
}

const callProcessManager = async (action: string, data: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/neural-process-manager`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action, user_id: user?.id, data })
    })
    return response.json()
}

export default function NeuralProcessManager() {
    const { user } = useAuth()
    const [processes, setProcesses] = useState<MentalProcess[]>([])
    const [totalLoad, setTotalLoad] = useState(0)
    const [activeThreads, setActiveThreads] = useState(0)
    const [isOverloaded, setIsOverloaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [thrashingData, setThrashingData] = useState<any>(null)
    const [optimization, setOptimization] = useState<any>(null)
    const [showOptimization, setShowOptimization] = useState(false)

    const loadProcesses = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await callProcessManager('get_processes')
            if (result.success) {
                setProcesses(result.processes || [])
                setTotalLoad(result.total_cognitive_load || 0)
                setActiveThreads(result.active_threads || 0)
                setIsOverloaded(result.is_overloaded || false)
            }
        } catch (err) {
            console.error('Failed to load processes:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const checkThrashing = useCallback(async () => {
        const result = await callProcessManager('detect_thrashing')
        if (result.success) {
            setThrashingData(result)
        }
    }, [])

    useEffect(() => {
        loadProcesses()
        checkThrashing()
        const interval = setInterval(() => {
            loadProcesses()
            checkThrashing()
        }, 30000) // Refresh every 30s
        return () => clearInterval(interval)
    }, [loadProcesses, checkThrashing])

    const syncFromTasks = async () => {
        setIsLoading(true)
        try {
            await callProcessManager('sync_from_tasks')
            await loadProcesses()
        } finally {
            setIsLoading(false)
        }
    }

    const suspendProcess = async (id: string) => {
        await callProcessManager('suspend_process', { process_id: id })
        await loadProcesses()
    }

    const resumeProcess = async (id: string) => {
        await callProcessManager('resume_process', { process_id: id })
        await loadProcesses()
    }

    const completeProcess = async (id: string) => {
        await callProcessManager('complete_process', { process_id: id })
        await loadProcesses()
    }

    const optimizeQueue = async () => {
        setIsLoading(true)
        try {
            const result = await callProcessManager('optimize_queue')
            if (result.success) {
                setOptimization(result)
                setShowOptimization(true)
            }
        } finally {
            setIsLoading(false)
        }
    }

    const getLoadColor = (load: number) => {
        if (load >= 80) return 'from-red-500 to-pink-500'
        if (load >= 60) return 'from-orange-500 to-yellow-500'
        if (load >= 40) return 'from-yellow-500 to-green-500'
        return 'from-green-500 to-cyan-500'
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running': return <Activity className="w-4 h-4 text-green-400 animate-pulse" />
            case 'suspended': return <PauseCircle className="w-4 h-4 text-yellow-400" />
            case 'blocked': return <AlertTriangle className="w-4 h-4 text-red-400" />
            default: return <CheckCircle className="w-4 h-4 text-gray-400" />
        }
    }

    return (
        <div className="p-6 h-full overflow-y-auto animate-fade-in">
            {/* Header with System Stats */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Cpu className="w-6 h-6 text-white" />
                        </div>
                        Neural Process Manager
                    </h1>
                    <p className="text-white/50 mt-1">Task Manager for Your Brain</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={syncFromTasks} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Sync Tasks
                    </Button>
                    <Button onClick={optimizeQueue} disabled={isLoading} className="bg-gradient-to-r from-purple-600 to-pink-600">
                        <Zap className="w-4 h-4 mr-2" />
                        Optimize Queue
                    </Button>
                </div>
            </div>

            {/* System Stats Bar */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {/* Cognitive Load Meter */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-sm">Cognitive Load</span>
                        <span className={`font-bold ${totalLoad >= 80 ? 'text-red-400' : totalLoad >= 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {totalLoad}%
                        </span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${getLoadColor(totalLoad)} transition-all duration-500`}
                            style={{ width: `${totalLoad}%` }}
                        />
                    </div>
                    {isOverloaded && (
                        <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> OVERLOAD!
                        </p>
                    )}
                </div>

                {/* Active Threads */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-sm">Active Threads</span>
                        <span className={`font-bold ${activeThreads > 5 ? 'text-red-400' : 'text-green-400'}`}>
                            {activeThreads}/4
                        </span>
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div
                                key={i}
                                className={`w-3 h-8 rounded ${i <= activeThreads
                                    ? i > 4 ? 'bg-red-500' : 'bg-green-500'
                                    : 'bg-white/10'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Context Switches */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-sm">Switches/Hour</span>
                        <span className={`font-bold ${thrashingData?.is_thrashing ? 'text-red-400' : 'text-green-400'}`}>
                            {thrashingData?.switches_last_hour || 0}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <GitBranch className={`w-5 h-5 ${thrashingData?.is_thrashing ? 'text-red-400' : 'text-white/40'}`} />
                        {thrashingData?.is_thrashing && (
                            <span className="text-red-400 text-xs">THRASHING</span>
                        )}
                    </div>
                </div>

                {/* Avg Switch Cost */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-sm">Avg Switch Cost</span>
                        <span className="font-bold text-orange-400">
                            {thrashingData?.avg_switch_cost || 0}%
                        </span>
                    </div>
                    <p className="text-white/40 text-xs">
                        ~{Math.round((thrashingData?.avg_switch_cost || 0) * 0.3)} min recovery
                    </p>
                </div>
            </div>

            {/* Thrashing Warning */}
            {thrashingData?.is_thrashing && (
                <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 mb-6 flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-red-400 font-medium">Context Switch Overload Detected</h3>
                        <p className="text-white/70 text-sm mt-1">{thrashingData.recommendation}</p>
                    </div>
                </div>
            )}

            {/* Process List */}
            <MacWindow title="Running Processes" icon={<Activity className="w-4 h-4" />}>
                <div className="divide-y divide-white/5">
                    {processes.length === 0 ? (
                        <div className="p-8 text-center">
                            <Brain className="w-12 h-12 text-white/20 mx-auto mb-3" />
                            <p className="text-white/40">No active mental processes</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={syncFromTasks}>
                                Import from Tasks
                            </Button>
                        </div>
                    ) : (
                        processes.map((process, i) => (
                            <div key={process.id} className="p-4 hover:bg-white/5 transition-all group">
                                <div className="flex items-center gap-4">
                                    {/* Status Icon */}
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        {getStatusIcon(process.status)}
                                    </div>

                                    {/* Process Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium">{process.process_name}</span>
                                            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/50">
                                                {process.process_type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-xs text-white/40 flex items-center gap-1">
                                                <Target className="w-3 h-3" /> Priority: {process.priority}
                                            </span>
                                            <span className="text-xs text-white/40 flex items-center gap-1">
                                                <Cpu className="w-3 h-3" /> Load: {process.cognitive_load}%
                                            </span>
                                            {process.context_tags?.length > 0 && (
                                                <span className="text-xs text-purple-400">
                                                    #{process.context_tags.join(' #')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Load Bar */}
                                    <div className="w-24">
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full bg-gradient-to-r ${getLoadColor(process.cognitive_load)}`}
                                                style={{ width: `${process.cognitive_load}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {process.status === 'running' ? (
                                            <Button size="sm" variant="ghost" onClick={() => suspendProcess(process.id)}>
                                                <Pause className="w-4 h-4 text-yellow-400" />
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="ghost" onClick={() => resumeProcess(process.id)}>
                                                <Play className="w-4 h-4 text-green-400" />
                                            </Button>
                                        )}
                                        <Button size="sm" variant="ghost" onClick={() => completeProcess(process.id)}>
                                            <CheckCircle className="w-4 h-4 text-blue-400" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </MacWindow>

            {/* Optimization Modal */}
            {showOptimization && optimization && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
                    <div className="bg-gray-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Zap className="w-6 h-6 text-yellow-400" />
                                <h2 className="text-xl font-bold text-white">Queue Optimized!</h2>
                            </div>
                            <Button variant="ghost" onClick={() => setShowOptimization(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/50">
                                <p className="text-green-400 font-medium">{optimization.key_insight}</p>
                                <p className="text-white/60 text-sm mt-1">{optimization.estimated_efficiency_gain}</p>
                            </div>

                            {optimization.groupings?.map((group: any, i: number) => (
                                <div key={i} className="p-4 rounded-lg bg-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Layers className="w-4 h-4 text-purple-400" />
                                        <span className="text-white font-medium">{group.group_name}</span>
                                    </div>
                                    <p className="text-white/60 text-sm">{group.rationale}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
