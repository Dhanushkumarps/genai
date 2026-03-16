// Browser Assistant Edge Function
// AI-powered assistant for guided web browsing and learning

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContextItem {
    type: 'screenshot' | 'page' | 'insight'
    content: string
    pageUrl?: string
    pageTitle?: string
}

interface AssistantRequest {
    action: 'chat' | 'recommend_sites' | 'summarize_page' | 'analyze_screenshot' | 'voice_command' | 'generate_notes'
    userId?: string
    sessionId?: string
    message?: string
    currentUrl?: string
    pageContent?: string
    pageTitle?: string
    domains?: string[] // User's learning domains
    voiceTranscript?: string
    context?: ContextItem[] // Session context for AI
    notesFormat?: 'concise' | 'standard' | 'detailed' | 'custom' // Notes generation format
    customInstructions?: string // Custom notes instructions
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const openaiKey = Deno.env.get('OPENAI_API_KEY')

        const supabase = createClient(supabaseUrl, supabaseKey)
        const body: AssistantRequest = await req.json()

        switch (body.action) {
            case 'chat':
                return await handleChat(supabase, body, openaiKey)

            case 'recommend_sites':
                return await recommendSites(supabase, body, openaiKey)

            case 'summarize_page':
                return await summarizePage(body, openaiKey)

            case 'analyze_screenshot':
                return await analyzeScreenshot(body, openaiKey)

            case 'voice_command':
                return await handleVoiceCommand(supabase, body, openaiKey)

            case 'generate_notes':
                return await generateSmartNotes(supabase, body, openaiKey)

            default:
                throw new Error(`Unknown action: ${body.action}`)
        }

    } catch (error) {
        console.error('Browser Assistant Error:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// Handle chat messages
async function handleChat(
    supabase: ReturnType<typeof createClient>,
    body: AssistantRequest,
    openaiKey?: string
) {
    const { userId, sessionId, message, currentUrl } = body

    // Store user message
    if (userId && sessionId) {
        await supabase.from('browser_chat_history').insert({
            user_id: userId,
            session_id: sessionId,
            role: 'user',
            content: message,
            current_url: currentUrl
        })
    }

    let response = "I'm here to help you learn! What would you like to know?"

    // Build context summary if available
    const contextSummary = body.context?.length
        ? `\n\nSession Context (user has been learning):\n${body.context.map(c => `- [${c.type}] ${c.pageTitle || c.pageUrl || ''}: ${c.content.slice(0, 150)}`).join('\n')}`
        : ''

    if (openaiKey && message) {
        const systemPrompt = `You are a DIRECT learning assistant. Give INSTANT answers.

STRICT RULES:
• MAX 3 bullet points - NEVER more
• Each point = 1 line only
• NO introductions or conclusions
• NO "Here's..." or "I can help..."
• Use ⚡ for key point, 💡 for tip
• Bold the **main term** only
• Code: max 3 lines, inline if possible

Page: ${currentUrl || 'N/A'}${contextSummary}

DIRECT ANSWERS ONLY. No essays. No fluff.`

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 300,
                temperature: 0.5,
            }),
        })

        const result = await aiResponse.json()
        response = result.choices?.[0]?.message?.content || response
    }

    // Store assistant response
    if (userId && sessionId) {
        await supabase.from('browser_chat_history').insert({
            user_id: userId,
            session_id: sessionId,
            role: 'assistant',
            content: response,
            current_url: currentUrl
        })
    }

    return new Response(
        JSON.stringify({ success: true, response }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

// Recommend learning sites based on user's domains and query
async function recommendSites(
    supabase: ReturnType<typeof createClient>,
    body: AssistantRequest,
    openaiKey?: string
) {
    const { domains, message } = body

    // Get sites matching user's learning domains
    let query = supabase
        .from('site_recommendations')
        .select('*')
        .order('rating', { ascending: false })
        .limit(10)

    if (domains && domains.length > 0) {
        query = query.overlaps('domains', domains)
    }

    const { data: sites, error } = await query

    if (error) throw error

    let recommendations = sites || []
    let aiSuggestion = null

    // If user has a specific query, use AI to filter/suggest
    if (openaiKey && message) {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a learning resource recommender. Given a user's query and a list of sites, 
            suggest the best ones and explain why. Also suggest any additional sites not in the list.
            Return JSON: { topPicks: [{url, title, reason}], additionalSuggestions: [{url, title, description}] }`
                    },
                    {
                        role: 'user',
                        content: `Query: ${message}\n\nAvailable sites: ${JSON.stringify(sites?.map(s => ({ url: s.url, title: s.title, description: s.description, category: s.category })))}`
                    }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
            }),
        })

        const result = await aiResponse.json()
        try {
            aiSuggestion = JSON.parse(result.choices?.[0]?.message?.content || '{}')
        } catch (e) {
            console.error('Failed to parse AI suggestions')
        }
    }

    return new Response(
        JSON.stringify({
            success: true,
            sites: recommendations,
            aiSuggestion
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

// Summarize page content
async function summarizePage(body: AssistantRequest, openaiKey?: string) {
    const { pageContent, currentUrl } = body

    if (!openaiKey || !pageContent) {
        return new Response(
            JSON.stringify({ success: false, error: 'Page content and API key required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Summarize the following web page content for a learner. 
          Extract key points, important concepts, and learning takeaways.
          Format with bullet points for easy reading.
          Keep it concise but comprehensive.`
                },
                {
                    role: 'user',
                    content: `URL: ${currentUrl}\n\nContent:\n${pageContent.slice(0, 8000)}`
                }
            ],
            max_tokens: 800,
            temperature: 0.5,
        }),
    })

    const result = await aiResponse.json()
    const summary = result.choices?.[0]?.message?.content || 'Unable to summarize'

    // Generate tags
    const tagsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Extract 3-5 topic tags from this content. Return as JSON array of strings.'
                },
                { role: 'user', content: pageContent.slice(0, 2000) }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        }),
    })

    const tagsResult = await tagsResponse.json()
    let tags: string[] = []
    try {
        const parsed = JSON.parse(tagsResult.choices?.[0]?.message?.content || '{}')
        tags = parsed.tags || parsed.topics || []
    } catch (e) {
        tags = []
    }

    return new Response(
        JSON.stringify({ success: true, summary, tags }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

// Analyze screenshot (would need vision model in production)
async function analyzeScreenshot(body: AssistantRequest, openaiKey?: string) {
    // Note: This would require GPT-4 Vision in production
    // For now, return a placeholder response

    return new Response(
        JSON.stringify({
            success: true,
            analysis: 'Screenshot captured and saved. AI vision analysis would process the image content here.',
            suggestedTitle: 'Learning Note',
            suggestedTags: ['screenshot', 'notes']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

// Handle voice commands
async function handleVoiceCommand(
    supabase: ReturnType<typeof createClient>,
    body: AssistantRequest,
    openaiKey?: string
) {
    const { voiceTranscript, currentUrl, userId, sessionId } = body

    if (!openaiKey || !voiceTranscript) {
        return new Response(
            JSON.stringify({ success: false, error: 'Voice transcript required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Parse the voice command to understand intent
    const intentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Parse this voice command for a learning browser. 
          Determine the intent and extract key information.
          Return JSON: { 
            intent: 'navigate' | 'search' | 'save_note' | 'ask_question' | 'recommend' | 'summarize',
            query: string,
            targetUrl?: string,
            response?: string 
          }`
                },
                { role: 'user', content: voiceTranscript }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        }),
    })

    const result = await intentResponse.json()
    let parsed: any = { intent: 'ask_question', query: voiceTranscript }

    try {
        parsed = JSON.parse(result.choices?.[0]?.message?.content || '{}')
    } catch (e) {
        console.error('Failed to parse intent')
    }

    // Log voice interaction
    if (userId && sessionId) {
        await supabase.from('browser_chat_history').insert({
            user_id: userId,
            session_id: sessionId,
            role: 'user',
            content: voiceTranscript,
            current_url: currentUrl,
            is_voice_input: true
        })
    }

    // Handle based on intent
    let response = ''
    let action = null

    switch (parsed.intent) {
        case 'navigate':
            response = `Navigating to ${parsed.targetUrl || parsed.query}`
            action = { type: 'navigate', url: parsed.targetUrl || `https://www.google.com/search?q=${encodeURIComponent(parsed.query)}` }
            break

        case 'search':
            response = `Searching for: ${parsed.query}`
            action = { type: 'navigate', url: `https://www.google.com/search?q=${encodeURIComponent(parsed.query)}` }
            break

        case 'save_note':
            response = 'Saving this page as a note...'
            action = { type: 'save_note' }
            break

        case 'summarize':
            response = 'Summarizing this page...'
            action = { type: 'summarize' }
            break

        case 'recommend':
            response = 'Finding relevant learning resources...'
            action = { type: 'recommend', query: parsed.query }
            break

        default:
            // Treat as a question - get AI response
            const chatBody = { ...body, message: voiceTranscript }
            return handleChat(supabase, chatBody, openaiKey)
    }

    return new Response(
        JSON.stringify({ success: true, intent: parsed.intent, response, action }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

// Generate smart notes from session context
async function generateSmartNotes(
    supabase: ReturnType<typeof createClient>,
    body: AssistantRequest,
    openaiKey?: string
) {
    const { userId, sessionId, context, notesFormat = 'standard', customInstructions } = body

    if (!openaiKey || !context?.length) {
        return new Response(
            JSON.stringify({ success: false, error: 'Context required for notes generation' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Format context for the AI
    const contextSummary = context.map((item, i) => {
        const source = item.pageTitle || item.pageUrl || `Item ${i + 1}`
        return `### [${item.type.toUpperCase()}] ${source}\n${item.content}`
    }).join('\n\n')

    // Build format-specific instructions
    const formatInstructions = {
        concise: `OUTPUT: Minimal bullet points only.
• Max 5-7 bullet points total
• Each point = 1 line
• No headings, no sections
• Just the key facts`,
        standard: `OUTPUT FORMAT:
# [Title]
## Key Concepts
[3-5 bullet points]
## Takeaways
[2-3 actionable insights]`,
        detailed: `OUTPUT FORMAT:
# [Comprehensive Title]
## Overview
[Brief context paragraph]
## Key Concepts
[Detailed bullet points with explanations]
## Code/Examples
[Include relevant code snippets]
## Deep Dive
[Extended explanations]
## Action Items
[5+ specific next steps]`,
        custom: customInstructions || 'Generate notes in a helpful format.'
    }

    const formatPrompt = formatInstructions[notesFormat] || formatInstructions.standard

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a study notes generator. Create notes from learning context.

RULES:
• Synthesize information naturally
• Make it feel like personal study notes
• Follow the output format strictly

${formatPrompt}`
                },
                {
                    role: 'user',
                    content: `Generate study notes from this session:\n\n${contextSummary}`
                }
            ],
            max_tokens: notesFormat === 'concise' ? 500 : notesFormat === 'detailed' ? 2000 : 1200,
            temperature: 0.5,
        }),
    })

    const result = await aiResponse.json()
    const content = result.choices?.[0]?.message?.content || 'Unable to generate notes'

    // Extract title from generated content
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch?.[1] || `Study Notes - ${new Date().toLocaleDateString()}`

    // Extract topics
    const topicsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'Extract 3-5 topic tags. Return JSON: {"topics": ["tag1", "tag2"]}' },
                { role: 'user', content: content.slice(0, 1000) }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        }),
    })

    const topicsResult = await topicsResponse.json()
    let topics: string[] = []
    try {
        topics = JSON.parse(topicsResult.choices?.[0]?.message?.content || '{}').topics || []
    } catch { topics = [] }

    // Save to database
    if (userId) {
        const { data: noteData } = await supabase.from('smart_notes').insert({
            user_id: userId,
            session_id: sessionId,
            title,
            content,
            topics,
            source_count: context.length
        }).select('id').single()

        return new Response(
            JSON.stringify({
                success: true,
                noteId: noteData?.id,
                title,
                content,
                topics,
                sourceCount: context.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
        JSON.stringify({ success: true, title, content, topics, sourceCount: context.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}
