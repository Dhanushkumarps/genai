import { useState, useEffect, useCallback } from 'react'
import {
    Shield, AlertTriangle, Lock, Eye, BarChart3,
    Clock, Activity, CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import MacWindow from '@/components/ui/MacWindow'

const callFirewall = async (action: string, data: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cognitive-firewall`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action, user_id: user?.id, data })
    })
    return response.json()
}

export default function CognitiveFirewall() {
    const { user } = useAuth()
    const [status, setStatus] = useState<any>(null)
    const [threatScore, setThreatScore] = useState<any>(null)
    const [report, setReport] = useState<any>(null)
    const [patterns, setPatterns] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)

    const loadStatus = useCallback(async () => {
        const result = await callFirewall('get_status')
        if (result.success) setStatus(result)
    }, [])

    const loadThreatScore = useCallback(async () => {
        const result = await callFirewall('calculate_threat_score', {
            current_task: 'Working on project',
            energy_level: 60,
            burnout_score: 30
        })
        if (result.success) setThreatScore(result)
    }, [])

    useEffect(() => {
        loadStatus()
        loadThreatScore()
        const interval = setInterval(() => {
            loadStatus()
            loadThreatScore()
        }, 30000)
        return () => clearInterval(interval)
    }, [loadStatus, loadThreatScore])

    const enableQuarantine = async (duration: number) => {
        setIsLoading(true)
        await callFirewall('enable_quarantine', { duration_minutes: duration, reason: 'Manual activation' })
        await loadStatus()
        setIsLoading(false)
    }

    const analyzePatterns = async () => {
        setIsLoading(true)
        const result = await callFirewall('analyze_patterns')
        if (result.success) setPatterns(result.patterns)
        setIsLoading(false)
    }

    const generateReport = async () => {
        setIsLoading(true)
        const result = await callFirewall('generate_defense_report', { days: 7 })
        if (result.success) setReport(result.report)
        setIsLoading(false)
    }

    const getThreatLevel = (level: string) => {
        switch (level) {
            case 'critical': return { bg: 'bg-[#c9544a]/10', border: 'border-[#c9544a]/20', text: 'text-[#c9544a]' }
            case 'high': return { bg: 'bg-[#d4a84b]/10', border: 'border-[#d4a84b]/20', text: 'text-[#d4a84b]' }
            case 'medium': return { bg: 'bg-[#d4a84b]/10', border: 'border-[#d4a84b]/20', text: 'text-[#d4a84b]' }
            default: return { bg: 'bg-[#5cb85c]/10', border: 'border-[#5cb85c]/20', text: 'text-[#5cb85c]' }
        }
    }

    const threatStyle = getThreatLevel(threatScore?.threat_level || 'low')

    return (
        <div className="p-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl font-semibold text-white/90 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-white/[0.06] flex items-center justify-center">
                            <Shield className="w-5 h-5 text-[#d4a84b]" />
                        </div>
                        Cognitive Firewall
                    </h1>
                    <p className="text-white/40 text-sm mt-1 ml-12">Distraction defense system</p>
                </div>
                {status?.is_quarantine_mode ? (
                    <Button variant="outline" disabled className="border-[#d4a84b]/30 text-[#d4a84b]">
                        <Lock className="w-4 h-4 mr-2" />
                        Quarantine Active
                    </Button>
                ) : (
                    <Button
                        onClick={() => enableQuarantine(30)}
                        className="bg-[#c9544a] hover:bg-[#b84a41] text-white border-0"
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        Enable Quarantine
                    </Button>
                )}
            </div>

            {/* Threat Level Card */}
            <div className={`p-5 rounded-xl border mb-6 ${threatStyle.bg} ${threatStyle.border}`}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Threat Level</p>
                        <h2 className={`text-2xl font-semibold uppercase ${threatStyle.text}`}>
                            {threatScore?.threat_level || 'Loading...'}
                        </h2>
                    </div>
                    <div className="text-right">
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Score</p>
                        <p className="text-3xl font-semibold text-white/90">{threatScore?.threat_score || 0}%</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${threatScore?.threat_level === 'critical' ? 'bg-[#c9544a]' :
                                threatScore?.threat_level === 'high' ? 'bg-[#d4a84b]' :
                                    'bg-[#5cb85c]'
                            }`}
                        style={{ width: `${threatScore?.threat_score || 0}%` }}
                    />
                </div>

                {threatScore?.factors?.length > 0 && (
                    <div className="space-y-1.5">
                        {threatScore.factors.map((factor: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                                <AlertTriangle className="w-3 h-3 text-[#d4a84b]" />
                                {factor}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { icon: Activity, label: 'Distractions/Hour', value: status?.distractions_last_hour || 0 },
                    { icon: Shield, label: 'Protection', value: status?.protection_level || 'standard' },
                    { icon: Clock, label: 'Quarantine', value: status?.is_quarantine_mode ? 'Active' : 'Off' },
                ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-xl bg-[#1a1a1a] border border-white/[0.06]">
                        <div className="flex items-center gap-2 mb-2">
                            <stat.icon className="w-4 h-4 text-white/40" />
                            <span className="text-white/40 text-xs uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <p className="text-xl font-medium text-white/90 capitalize">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
                <Button
                    variant="outline"
                    onClick={analyzePatterns}
                    disabled={isLoading}
                    className="border-white/[0.1] text-white/70 hover:bg-white/[0.04]"
                >
                    <Eye className="w-4 h-4 mr-2" />
                    Analyze Patterns
                </Button>
                <Button
                    variant="outline"
                    onClick={generateReport}
                    disabled={isLoading}
                    className="border-white/[0.1] text-white/70 hover:bg-white/[0.04]"
                >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Defense Report
                </Button>
            </div>

            {/* Patterns */}
            {patterns && (
                <MacWindow title="Analysis Results" icon={<Eye className="w-4 h-4" />}>
                    <div className="p-5 space-y-4">
                        <div className="p-4 rounded-lg bg-[#c9544a]/10 border border-[#c9544a]/20">
                            <p className="text-[#c9544a] text-xs uppercase tracking-wider mb-1">Vulnerability</p>
                            <p className="text-white/80">{patterns.primary_vulnerability}</p>
                        </div>

                        <div className="p-4 rounded-lg bg-[#5cb85c]/10 border border-[#5cb85c]/20">
                            <p className="text-[#5cb85c] text-xs uppercase tracking-wider mb-1">Strength</p>
                            <p className="text-white/80">{patterns.strength}</p>
                        </div>

                        {patterns.recommendations?.length > 0 && (
                            <div>
                                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Recommendations</p>
                                {patterns.recommendations.map((rec: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2 mb-2">
                                        <CheckCircle className="w-4 h-4 text-[#d4a84b] mt-0.5" />
                                        <span className="text-white/70 text-sm">{rec}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </MacWindow>
            )}

            {/* Report */}
            {report && (
                <MacWindow title="Weekly Report" icon={<BarChart3 className="w-4 h-4" />}>
                    <div className="p-5">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                            {[
                                { label: 'Total', value: report.total_distractions },
                                { label: 'Time Lost', value: `${report.time_lost_minutes}m`, color: 'text-[#d4a84b]' },
                                { label: 'Blocked', value: `${report.block_rate}%`, color: 'text-[#5cb85c]' },
                                { label: 'Per Day', value: report.avg_per_day },
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <p className={`text-xl font-semibold ${stat.color || 'text-white/90'}`}>{stat.value}</p>
                                    <p className="text-white/40 text-xs">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {report.top_sources?.length > 0 && (
                            <div className="space-y-2">
                                {report.top_sources.map((source: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-[#c9544a]" />
                                        <span className="text-white/70 flex-1 text-sm">{source.source}</span>
                                        <span className="text-white/40 text-sm">{source.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </MacWindow>
            )}
        </div>
    )
}
