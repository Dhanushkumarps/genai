import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { callAIFunction } from '@/features/ai/callAIFunction'

interface TaskRecommendation {
    recommendation: string
    reason: string
    difficulty: 'low' | 'medium' | 'high'
}

interface UseTaskAdvisorReturn {
    recommendation: TaskRecommendation | null
    isLoading: boolean
    error: string | null
    refresh: () => Promise<void>
}

export function useTaskAdvisor(): UseTaskAdvisorReturn {
    const [recommendation, setRecommendation] = useState<TaskRecommendation | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchRecommendation = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Fetch current context
            const { data: stats } = await supabase
                .from('system_stats')
                .select('cognitive_load, energy_level')
                .limit(1)
                .maybeSingle()

            const { data: tasks } = await supabase
                .from('tasks')
                .select('title')
                .eq('status', 'pending')
                .limit(5)

            const { data, error: aiError } = await callAIFunction({
                mode: 'recommend',
                context: {
                    cognitiveLoad: stats?.cognitive_load || 50,
                    energyLevel: stats?.energy_level || 50,
                    recentTasks: tasks?.map(t => t.title) || []
                }
            })

            if (aiError) throw aiError

            const result = JSON.parse(data?.data || '{}')
            setRecommendation(result)
        } catch (err: any) {
            setError(err.message || 'Failed to get recommendation')
            // Fallback recommendation
            setRecommendation({
                recommendation: 'Take a short break',
                reason: 'Unable to analyze current state',
                difficulty: 'low'
            })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRecommendation()
        // Refresh every 5 minutes
        const interval = setInterval(fetchRecommendation, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [fetchRecommendation])

    return { recommendation, isLoading, error, refresh: fetchRecommendation }
}
