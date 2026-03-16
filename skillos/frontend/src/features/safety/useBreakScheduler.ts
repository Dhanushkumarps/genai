import { useState, useEffect } from 'react'
import { useIdleDetection } from './useIdleDetection'
import { getSuggestion, type BreakType } from './BreakActivitySuggestions'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export interface BreakState {
    nextBreakInfo: { type: BreakType; time: Date } | null
    activeBreak: { type: BreakType; suggestion: string } | null
}

export function useBreakScheduler() {
    const isIdle = useIdleDetection(2) // 2 mins idle = paused
    const [elapsedTime, setElapsedTime] = useState(0) // Seconds active
    const [activeBreak, setActiveBreak] = useState<{ type: BreakType; suggestion: string } | null>(null)

    // Schedules (in seconds)
    const MICRO_INTERVAL = 20 * 60
    const SHORT_INTERVAL = 50 * 60
    const LONG_INTERVAL = 120 * 60

    useEffect(() => {
        if (isIdle || activeBreak) return

        const timer = setInterval(() => {
            setElapsedTime(prev => {
                const manualPrev = prev + 1

                // Check for breaks
                if (manualPrev % LONG_INTERVAL === 0) triggerBreak('long')
                else if (manualPrev % SHORT_INTERVAL === 0) triggerBreak('short')
                else if (manualPrev % MICRO_INTERVAL === 0) triggerBreak('micro')

                return manualPrev
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [isIdle, activeBreak])

    const triggerBreak = (type: BreakType) => {
        const suggestion = getSuggestion(type)
        if (type === 'micro') {
            // Just a toast for micro
            toast.info("Eye Health Alert (20-20-20)", {
                description: suggestion,
                duration: 10000,
                action: {
                    label: "Done",
                    onClick: () => logBreak(type, 'taken')
                }
            })
        } else {
            // Full break mode
            setActiveBreak({ type, suggestion })
        }
    }

    const logBreak = async (type: BreakType, status: 'taken' | 'snoozed' | 'skipped') => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            await supabase.from('break_logs').insert({
                user_id: user.id,
                break_type: type,
                completed: status === 'taken'
            })

            // Gamification: Energy Boost
            if (status === 'taken') {
                // await supabase.rpc('increment_energy', { amount: 10 })
                toast.success("Energy Recharged!", { description: "+10 Energy Points" })
            }
        } catch (e) {
            console.error(e)
        }
        setActiveBreak(null)
    }

    const snooze = () => {
        // Simple 5 min snooze (300s) - subtract from elapsed
        setElapsedTime(prev => prev - 300)
        setActiveBreak(null)
        toast.message("Snoozed for 5 minutes")
    }

    return {
        elapsedTime,
        activeBreak,
        isIdle,
        completeBreak: () => logBreak(activeBreak?.type || 'short', 'taken'),
        skipBreak: () => logBreak(activeBreak?.type || 'short', 'skipped'),
        snoozeBreak: snooze
    }
}
