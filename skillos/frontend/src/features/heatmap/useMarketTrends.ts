import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface MarketTrend {
    skill: string
    demand_score: number
    job_count: number
    source: string
    updated_at: string
}

export function useMarketTrends() {
    const [trends, setTrends] = useState<MarketTrend[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchTrends() {
            try {
                const { data, error: queryError } = await supabase
                    .from('skill_market_trends')
                    .select('*')
                    .order('demand_score', { ascending: false })

                if (queryError) throw queryError
                setTrends(data || [])
            } catch (err) {
                setError((err as Error).message)
            } finally {
                setLoading(false)
            }
        }

        fetchTrends()
    }, [])

    return {
        trends,
        loading,
        error,
        isLive: trends.length > 0,
    }
}
