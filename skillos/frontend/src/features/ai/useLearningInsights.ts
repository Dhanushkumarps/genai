import { useState, useCallback } from 'react'
import { callAIFunction } from './callAIFunction'

interface LearningInsights {
    keyTakeaways: string[]
    concepts: string[]
    questions: string[]
    connections: string
}

interface UseLearningInsightsReturn {
    generateInsights: (content: string) => Promise<LearningInsights | null>
    isGenerating: boolean
    error: string | null
}

export function useLearningInsights(): UseLearningInsightsReturn {
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const generateInsights = useCallback(async (content: string): Promise<LearningInsights | null> => {
        if (!content.trim()) return null

        setIsGenerating(true)
        setError(null)

        try {
            const { data, error: aiError } = await callAIFunction({
                mode: 'insights',
                content
            })

            if (aiError) throw aiError

            const result = JSON.parse(data?.data || '{}') as LearningInsights
            return result
        } catch (err: any) {
            setError(err.message || 'Insight generation failed')
            return null
        } finally {
            setIsGenerating(false)
        }
    }, [])

    return { generateInsights, isGenerating, error }
}
