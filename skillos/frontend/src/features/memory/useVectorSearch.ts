import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface SearchResult {
    id: string
    content: string
    similarity: number
}

export function useVectorSearch() {
    const [isSearching, setIsSearching] = useState(false)
    const [results, setResults] = useState<SearchResult[]>([])
    const [error, setError] = useState<string | null>(null)

    const search = useCallback(async (query: string, threshold = 0.5, limit = 10) => {
        if (!query.trim()) return

        setIsSearching(true)
        setError(null)

        try {
            // 1. Generate Embedding for the query
            const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
                body: { content: query }
            })

            if (embeddingError) throw embeddingError
            if (!embeddingData?.embedding) throw new Error('Failed to generate embedding')

            // 2. Search using the RPC
            const { data: searchData, error: searchError } = await supabase.rpc('match_learning_logs', {
                query_embedding: embeddingData.embedding,
                match_threshold: threshold,
                match_count: limit,
            })

            if (searchError) throw searchError

            setResults(searchData || [])
            return searchData
        } catch (err: any) {
            console.error('Vector search failed:', err)
            setError(err.message)
            return []
        } finally {
            setIsSearching(false)
        }
    }, [])

    return { search, results, isSearching, error }
}
