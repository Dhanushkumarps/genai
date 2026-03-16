import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'

export interface ContextItem {
    id: string
    type: 'screenshot' | 'page' | 'insight'
    content: string        // Summary or extracted text
    imageData?: string     // Base64 for screenshots
    pageUrl?: string
    pageTitle?: string
    timestamp: Date
}

interface SmartNote {
    id: string
    title: string
    content: string
    topics: string[]
    sourceCount: number
    createdAt: Date
}

interface BrowserSession {
    sessionId: string
    startedAt: Date
    contextItems: ContextItem[]
    isGeneratingNotes: boolean
}

export function useBrowserSession() {
    const { user } = useAuth()
    const sessionRef = useRef<string>(crypto.randomUUID())

    const [session, setSession] = useState<BrowserSession>({
        sessionId: sessionRef.current,
        startedAt: new Date(),
        contextItems: [],
        isGeneratingNotes: false
    })

    // Save session to DB on start
    const initialized = useRef(false)
    useEffect(() => {
        if (!user?.id || initialized.current) return
        initialized.current = true

        supabase.from('browsing_sessions').insert({
            id: sessionRef.current,
            user_id: user.id,
            started_at: new Date().toISOString()
        }).then(({ error }) => {
            if (error) {
                // Ignore 409 conflict, likely strict mode double-invokation
                if (error.code !== '23505') console.error('Session init error:', error)
            } else {
                console.log('Session started:', sessionRef.current)
            }
        })
    }, [user?.id])

    // Add item to context
    const addToContext = useCallback((item: Omit<ContextItem, 'id' | 'timestamp'>) => {
        const newItem: ContextItem = {
            ...item,
            id: crypto.randomUUID(),
            timestamp: new Date()
        }

        setSession(prev => ({
            ...prev,
            contextItems: [...prev.contextItems, newItem]
        }))

        return newItem.id
    }, [])

    // Remove item from context
    const removeFromContext = useCallback((itemId: string) => {
        setSession(prev => ({
            ...prev,
            contextItems: prev.contextItems.filter(i => i.id !== itemId)
        }))
    }, [])

    // Get formatted context for AI prompt
    const getContextSummary = useCallback((): string => {
        if (session.contextItems.length === 0) return ''

        const grouped = session.contextItems.reduce((acc, item) => {
            acc[item.type] = acc[item.type] || []
            acc[item.type].push(item)
            return acc
        }, {} as Record<string, ContextItem[]>)

        let summary = '## Session Context\n\n'

        if (grouped.page?.length) {
            summary += '### Pages Visited:\n'
            grouped.page.forEach(p => {
                summary += `- **${p.pageTitle || p.pageUrl}**: ${p.content.slice(0, 200)}...\n`
            })
        }

        if (grouped.screenshot?.length) {
            summary += '\n### Screenshots Captured:\n'
            grouped.screenshot.forEach((s, i) => {
                summary += `- Screenshot ${i + 1}: ${s.content}\n`
            })
        }

        if (grouped.insight?.length) {
            summary += '\n### Key Insights:\n'
            grouped.insight.forEach(ins => {
                summary += `- ${ins.content}\n`
            })
        }

        return summary
    }, [session.contextItems])

    // Generate smart notes from context
    const generateNotes = useCallback(async (format: 'concise' | 'standard' | 'detailed' | 'custom' = 'standard', customInstructions?: string): Promise<SmartNote | null> => {
        if (session.contextItems.length === 0) return null
        if (!user?.id) return null

        setSession(prev => ({ ...prev, isGeneratingNotes: true }))

        try {
            const { data, error } = await supabase.functions.invoke('browser-assistant', {
                body: {
                    action: 'generate_notes',
                    userId: user.id,
                    sessionId: session.sessionId,
                    notesFormat: format,
                    customInstructions,
                    context: session.contextItems.map(item => ({
                        type: item.type,
                        content: item.content,
                        pageUrl: item.pageUrl,
                        pageTitle: item.pageTitle
                    }))
                }
            })

            if (error) throw error

            const note: SmartNote = {
                id: data.noteId || crypto.randomUUID(),
                title: data.title || `Study Notes - ${new Date().toLocaleDateString()}`,
                content: data.content,
                topics: data.topics || [],
                sourceCount: session.contextItems.length,
                createdAt: new Date()
            }

            return note
        } catch (err) {
            console.error('Failed to generate notes:', err)
            return null
        } finally {
            setSession(prev => ({ ...prev, isGeneratingNotes: false }))
        }
    }, [session.contextItems, session.sessionId, user?.id])

    // Contextual Bridge Analysis
    const analyzeGap = useCallback(async (content: string, url: string) => {
        if (!content || !user?.id) return null

        try {
            const { data, error } = await supabase.functions.invoke('analyze-gap', {
                body: {
                    page_content: content,
                    page_url: url,
                    user_id: user.id
                }
            })

            if (error) throw error
            return data
        } catch (err) {
            console.error('Bridge analysis failed:', err)
            return null
        }
    }, [user?.id])

    // End session
    const endSession = useCallback(async () => {
        if (!user?.id) return

        await supabase.from('browsing_sessions').update({
            ended_at: new Date().toISOString(),
            pages_visited: session.contextItems.filter(i => i.type === 'page').length,
            notes_created: session.contextItems.filter(i => i.type === 'screenshot').length
        }).eq('id', session.sessionId)

        // Start new session
        const newSessionId = crypto.randomUUID()
        sessionRef.current = newSessionId

        setSession({
            sessionId: newSessionId,
            startedAt: new Date(),
            contextItems: [],
            isGeneratingNotes: false
        })
    }, [session.sessionId, session.contextItems, user?.id])

    return {
        sessionId: session.sessionId,
        contextItems: session.contextItems,
        contextCount: session.contextItems.length,
        isGeneratingNotes: session.isGeneratingNotes,
        addToContext,
        removeFromContext,
        getContextSummary,
        generateNotes,
        analyzeGap,
        endSession
    }
}
