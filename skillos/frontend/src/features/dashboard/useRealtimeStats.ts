import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

type SystemStat = Database['public']['Tables']['system_stats']['Row']

export interface StatPoint {
    time: number // unix timestamp (seconds)
    cognitive_load: number
    energy_level: number
}

// Max points to keep in memory (2 hours at 30s intervals = ~240 points, req says 120 for 60 mins chart)
const MAX_POINTS = 120

export function useRealtimeStats() {
    const [data, setData] = useState<StatPoint[]>([])
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
    const [latest, setLatest] = useState<StatPoint | null>(null)
    const channelRef = useRef<RealtimeChannel | null>(null)

    const processStats = useCallback((stats: SystemStat[]): StatPoint[] => {
        return stats.map(s => ({
            time: new Date(s.created_at).getTime() / 1000,
            cognitive_load: s.cognitive_load || 0,
            energy_level: s.energy_level || 0
        })).sort((a, b) => a.time - b.time)
    }, [])

    const fetchInitialData = useCallback(async () => {
        try {
            const { data: initialStats, error } = await supabase
                .from('system_stats')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(MAX_POINTS)

            if (error) throw error

            if (initialStats) {
                const processed = processStats(initialStats)
                setData(processed)
                if (processed.length > 0) {
                    setLatest(processed[processed.length - 1])
                }
            }
        } catch (err) {
            console.error('Error fetching initial stats:', err)
            setStatus('error')
        }
    }, [processStats])

    useEffect(() => {
        // 1. Fetch initial
        fetchInitialData()

        // 2. Trigger Calculation Periodically (Heartbeat)
        const heartbeat = setInterval(async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calc-system-stats`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({ user_id: user.id })
                })
            }
        }, 60000) // Every minute

        // 3. Subscribe
        const channel = supabase
            .channel('system-stats-monitor')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'system_stats'
                },
                (payload) => {
                    const newStat = payload.new as SystemStat
                    const point: StatPoint = {
                        time: new Date(newStat.created_at).getTime() / 1000,
                        cognitive_load: newStat.cognitive_load || 0,
                        energy_level: newStat.energy_level || 0
                    }

                    setLatest(point)
                    setData(prev => {
                        const newData = [...prev, point]
                        // Keep only window
                        if (newData.length > MAX_POINTS) {
                            return newData.slice(newData.length - MAX_POINTS)
                        }
                        return newData
                    })
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setStatus('connected')
                } else if (status === 'CLOSED') {
                    setStatus('disconnected')
                } else if (status === 'CHANNEL_ERROR') {
                    setStatus('error')
                }
            })

        channelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
            clearInterval(heartbeat)
        }
    }, [fetchInitialData])

    return {
        data,
        status,
        latest,
        refresh: fetchInitialData
    }
}
