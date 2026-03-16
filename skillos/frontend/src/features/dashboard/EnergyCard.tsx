import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Zap, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import { callAIFunction } from '@/features/ai/callAIFunction'

interface EnergyData {
    current: number
    trend: 'up' | 'down' | 'stable'
    suggestion: string
}

export default function EnergyCard() {
    const [energy, setEnergy] = useState<EnergyData>({ current: 0, trend: 'stable', suggestion: '' })
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const fetchEnergy = async () => {
        try {
            const { data: stats } = await supabase
                .from('system_stats')
                .select('energy_level, created_at')
                .order('created_at', { ascending: false })
                .limit(5)

            if (stats && stats.length > 0) {
                const current = stats[0].energy_level || 50
                const previous = stats.length > 1 ? stats[1].energy_level || 50 : current
                const trend = current > previous + 5 ? 'up' : current < previous - 5 ? 'down' : 'stable'

                let suggestion = ''
                if (current > 80) suggestion = 'Peak energy. Ideal for complex tasks.'
                else if (current > 50) suggestion = 'Good energy. Maintain momentum.'
                else if (current > 30) suggestion = 'Consider a short break.'
                else suggestion = 'Low energy. Rest recommended.'

                setEnergy({ current, trend, suggestion })
            } else {
                const hour = new Date().getHours()
                let defaultEnergy = 60
                if (hour >= 9 && hour <= 11) defaultEnergy = 85
                else if (hour >= 14 && hour <= 16) defaultEnergy = 55
                else if (hour >= 20) defaultEnergy = 45

                setEnergy({
                    current: defaultEnergy,
                    trend: 'stable',
                    suggestion: 'Begin work to track patterns.'
                })
            }
        } catch (err) {
            console.error('Error fetching energy:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const getAISuggestion = async () => {
        setIsRefreshing(true)
        try {
            const { data, error } = await callAIFunction({
                mode: 'recommend',
                context: { energyLevel: energy.current, cognitiveLoad: 50 }
            })

            if (!error && data?.data) {
                const parsed = JSON.parse(data.data)
                setEnergy(prev => ({ ...prev, suggestion: parsed.recommendation || prev.suggestion }))
            }
        } catch (err) {
            console.error('AI suggestion error:', err)
        } finally {
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        fetchEnergy()
        const interval = setInterval(fetchEnergy, 30000)
        return () => clearInterval(interval)
    }, [])

    const TrendIcon = energy.trend === 'up' ? TrendingUp : energy.trend === 'down' ? TrendingDown : Minus

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#22262A] flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#5A9A5A]" />
                    </div>
                    <div>
                        <p className="text-[11px] font-medium text-[#6B6966] uppercase tracking-wide">Energy Level</p>
                        <div className="flex items-center gap-2">
                            <span className="text-[20px] font-semibold text-[#E8E6E3] tabular-nums">
                                {isLoading ? '--' : energy.current}%
                            </span>
                            <TrendIcon
                                className={`w-4 h-4 ${energy.trend === 'up' ? 'text-[#5A9A5A]' :
                                        energy.trend === 'down' ? 'text-[#B85450]' :
                                            'text-[#4A4845]'
                                    }`}
                            />
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={getAISuggestion}
                    disabled={isRefreshing}
                    className="h-8 w-8"
                >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#6B6966] ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Progress Bar - Thin, elegant */}
            <div className="h-[3px] w-full bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                <div
                    className="h-full bg-[#5A9A5A] transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${energy.current}%` }}
                />
            </div>

            {/* Suggestion - Subtle */}
            <p className="text-[12px] text-[#6B6966] leading-relaxed">
                {energy.suggestion}
            </p>
        </div>
    )
}
