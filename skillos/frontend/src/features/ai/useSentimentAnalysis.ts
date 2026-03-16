import { useState, useCallback } from 'react'
import { callAIFunction } from './callAIFunction'

interface SentimentResult {
    score: number // 1-10
    mood: string
    concerns: string[]
    suggestion: string
}

interface UseSentimentAnalysisReturn {
    analyzeSentiment: (content: string) => Promise<SentimentResult | null>
    isAnalyzing: boolean
    error: string | null
}

export function useSentimentAnalysis(): UseSentimentAnalysisReturn {
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const analyzeSentiment = useCallback(async (content: string): Promise<SentimentResult | null> => {
        if (!content.trim()) return null

        setIsAnalyzing(true)
        setError(null)

        try {
            const { data, error: aiError } = await callAIFunction({
                mode: 'sentiment',
                content
            })

            if (aiError) throw aiError

            const result = JSON.parse(data?.data || '{}') as SentimentResult
            return result
        } catch (err: any) {
            setError(err.message || 'Sentiment analysis failed')
            return null
        } finally {
            setIsAnalyzing(false)
        }
    }, [])

    return { analyzeSentiment, isAnalyzing, error }
}
