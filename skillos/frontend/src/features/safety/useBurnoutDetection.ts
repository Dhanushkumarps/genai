import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { differenceInMinutes } from 'date-fns'

export interface BurnoutState {
    score: number
    level: 'safe' | 'warning' | 'critical' | 'panic'
    triggers: string[]
}

export function useBurnoutDetection() {
    const [state, setState] = useState<BurnoutState>({ score: 0, level: 'safe', triggers: [] })
    const [isSafeMode, setIsSafeMode] = useState(false)

    useEffect(() => {
        const checkVitalSigns = async () => {
            let score = 0
            const triggers: string[] = []

            try {
                // 1. Fetch System Stats
                const { data: stats } = await supabase
                    .from('system_stats')
                    .select('*')
                    .limit(1)
                    .maybeSingle()

                if (stats) {
                    // Trigger: High Cognitive Load
                    if ((stats.cognitive_load || 0) > 90) {
                        score += 25
                        triggers.push('System Overload (Logic Cores at 90%)')
                    }

                    // Trigger: Low Energy
                    if ((stats.energy_level || 0) < 20) {
                        score += 25
                        triggers.push('Critical Power Failure (<20%)')
                    }

                    // Trigger: Session Duration
                    if (stats.session_started_at) {
                        const sessionMinutes = differenceInMinutes(new Date(), new Date(stats.session_started_at))
                        if (sessionMinutes > 240) { // 4 hours
                            score += 25
                            triggers.push('Uptime Limit Exceeded (>4h)')
                        }
                    }
                }

                // 2. Check recent stress dumps (last hour)
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
                const { count } = await supabase
                    .from('brain_dumps')
                    .select('*', { count: 'exact', head: true })
                    .gt('created_at', oneHourAgo)

                if (count && count > 0) {
                    // If user dumped recently, maybe they are ALREADY recovering? 
                    // Or maybe it indicates high stress. Let's say if they dumped > 3 times it's panic.
                    // Requirement: "Self-reported stress". Let's simply add points if they have dumped recently.
                    if (count >= 2) {
                        score += 25
                        triggers.push('Multiple Stress Logs Detected')
                    }
                }

                // Determine Level
                let level: BurnoutState['level'] = 'safe'
                if (score >= 75) level = 'panic'
                else if (score >= 65) level = 'critical'
                else if (score >= 50) level = 'warning'

                setState({ score, level, triggers })

                // Auto-trigger safe mode if panic
                if (level === 'panic' && !isSafeMode) {
                    setIsSafeMode(true)
                }

            } catch (err) {
                console.error('Burnout detection failed', err)
            }
        }

        // Check every 5 minutes (300000ms) - for demo using 30s
        const interval = setInterval(checkVitalSigns, 30000)
        checkVitalSigns() // Initial check

        return () => clearInterval(interval)
    }, [isSafeMode])

    const resolvePanic = async () => {
        // Reset system stats or log event
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('panic_events').insert({
                    user_id: user.id,
                    type: 'burnout_panic',
                    severity: state.score,
                    resolved: true
                })
            }

            // Simulation: Reset load/energy
            // await supabase.rpc('reset_system_stats') 
        } catch (e) {
            console.error(e)
        }
        setIsSafeMode(false)
        setState(s => ({ ...s, level: 'safe', score: 0 }))
    }

    return {
        burnoutState: state,
        isSafeMode,
        exitSafeMode: resolvePanic
    }
}
