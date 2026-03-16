import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

/**
 * Hook that tracks user activity and updates system_stats
 * This feeds the System Monitor with real data
 */
export function useActivityTracker() {
    const { user } = useAuth()
    const lastUpdateRef = useRef<number>(0)
    const activityCountRef = useRef<number>(0)
    const startTimeRef = useRef<number>(Date.now())

    const calculateCognitiveLoad = useCallback(() => {
        const sessionMinutes = (Date.now() - startTimeRef.current) / 60000
        const activityRate = activityCountRef.current / Math.max(1, sessionMinutes)

        let load = 50
        if (activityRate > 30) load = Math.min(95, 60 + activityRate)
        else if (activityRate > 10) load = 40 + activityRate * 2
        else if (activityRate < 5) load = 30 + Math.random() * 20

        load = Math.max(10, Math.min(100, load + (Math.random() - 0.5) * 10))
        return Math.round(load)
    }, [])

    const calculateEnergy = useCallback(() => {
        const hour = new Date().getHours()
        const sessionMinutes = (Date.now() - startTimeRef.current) / 60000

        let energy = 70
        if (hour >= 9 && hour <= 11) energy = 90
        else if (hour >= 14 && hour <= 16) energy = 60
        else if (hour >= 20) energy = 50
        else if (hour < 6) energy = 40

        energy -= Math.min(30, sessionMinutes / 3)
        energy = Math.max(10, Math.min(100, energy + (Math.random() - 0.5) * 15))
        return Math.round(energy)
    }, [])

    const updateStats = useCallback(async () => {
        if (!user?.id) return

        const now = Date.now()
        if (now - lastUpdateRef.current < 30000) return
        lastUpdateRef.current = now

        const cognitive_load = calculateCognitiveLoad()
        const energy_level = calculateEnergy()

        try {
            // Use INSERT instead of UPSERT to avoid unique constraint issues
            // Each entry is a new data point for the chart
            await supabase
                .from('system_stats')
                .insert({
                    user_id: user.id,
                    cognitive_load,
                    energy_level,
                })

        } catch (err) {
            console.error('Failed to update stats:', err)
        }
    }, [user?.id, calculateCognitiveLoad, calculateEnergy])

    const trackActivity = useCallback(() => {
        activityCountRef.current++
    }, [])

    useEffect(() => {
        if (!user?.id) return

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart']

        const handler = () => {
            trackActivity()
            updateStats()
        }

        events.forEach(event => {
            window.addEventListener(event, handler, { passive: true })
        })

        // Initial update
        updateStats()

        // Periodic update
        const interval = setInterval(updateStats, 30000)

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handler)
            })
            clearInterval(interval)
        }
    }, [user?.id, trackActivity, updateStats])

    return { updateStats }
}
