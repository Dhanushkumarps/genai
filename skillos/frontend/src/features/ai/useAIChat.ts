import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { callAIFunction } from './callAIFunction'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface UseAIChatReturn {
    messages: Message[]
    isLoading: boolean
    error: string | null
    sendMessage: (content: string) => Promise<void>
    clearChat: () => void
}

export function useAIChat(): UseAIChatReturn {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim()) return

        const userMessage: Message = { role: 'user', content }
        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)
        setError(null)

        try {
            // Fetch recent learning logs for context
            const { data: recentLogs } = await supabase
                .from('learning_logs')
                .select('content')
                .order('created_at', { ascending: false })
                .limit(5)

            const { data, error: aiError } = await callAIFunction({
                mode: 'chat',
                messages: [...messages, userMessage].map(m => ({
                    role: m.role,
                    content: m.content
                })),
                context: {
                    recentLogs: recentLogs?.map(l => l.content.substring(0, 200)) || []
                }
            })

            if (aiError) throw aiError

            const aiMessage: Message = {
                role: 'assistant',
                content: data?.data || 'I apologize, but I could not generate a response.'
            }

            setMessages(prev => [...prev, aiMessage])
        } catch (err: any) {
            setError(err.message || 'Failed to get AI response')
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Neural link interrupted. Please try again.'
            }])
        } finally {
            setIsLoading(false)
        }
    }, [messages])

    const clearChat = useCallback(() => {
        setMessages([])
        setError(null)
    }, [])

    return { messages, isLoading, error, sendMessage, clearChat }
}
