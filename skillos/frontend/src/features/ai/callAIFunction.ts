import { supabase } from '@/lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface AIRequestBody {
    mode: 'chat' | 'summarize' | 'sentiment' | 'recommend' | 'insights'
    messages?: { role: 'user' | 'assistant' | 'system'; content: string }[]
    content?: string
    context?: {
        cognitiveLoad?: number
        energyLevel?: number
        recentTasks?: string[]
        recentLogs?: string[]
    }
}

export async function callAIFunction(body: AIRequestBody): Promise<{ data: any; error: Error | null }> {
    try {
        // Get current session for auth token
        const { data: { session } } = await supabase.auth.getSession()

        // Use session token if available, otherwise use anon key
        const authToken = session?.access_token || SUPABASE_ANON_KEY

        const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`AI request failed: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        return { data, error: null }
    } catch (err: any) {
        console.error('AI Function Error:', err)
        return { data: null, error: err }
    }
}
