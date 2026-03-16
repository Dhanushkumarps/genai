// Déjà Vu Engine - Semantic Memory Recall System
// Recognizes similar past work and surfaces relevant memories proactively

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DejaVuRequest {
    action: string
    user_id: string
    data: Record<string, any>
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, user_id, data }: DejaVuRequest = await req.json()

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const openai = new OpenAI({
            apiKey: Deno.env.get('OPENAI_API_KEY'),
        })

        let result: Record<string, any> = {}

        switch (action) {

            // ═══════════════════════════════════════════════════════════════
            // 1. FIND SIMILAR CONTEXT - Vector search for related memories
            // ═══════════════════════════════════════════════════════════════
            case 'find_similar': {
                const { context, limit = 5 } = data

                // Generate embedding for current context
                const embeddingResponse = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: context.substring(0, 8000)
                })
                const embedding = embeddingResponse.data[0].embedding

                // Search brain dumps
                const { data: similarDumps } = await supabase.rpc('match_brain_dumps', {
                    query_embedding: embedding,
                    match_threshold: 0.5,
                    match_count: limit
                }).eq('user_id', user_id)

                // Search learning logs
                const { data: similarLogs } = await supabase.rpc('match_learning_logs', {
                    query_embedding: embedding,
                    match_threshold: 0.5,
                    match_count: limit
                }).eq('user_id', user_id)

                // Combine and rank results
                const allMatches = [
                    ...(similarDumps || []).map((d: any) => ({ ...d, type: 'brain_dump', similarity: d.similarity })),
                    ...(similarLogs || []).map((l: any) => ({ ...l, type: 'learning_log', similarity: l.similarity }))
                ].sort((a, b) => b.similarity - a.similarity).slice(0, limit)

                result = {
                    matches: allMatches,
                    count: allMatches.length,
                    message: allMatches.length > 0
                        ? `🔮 Found ${allMatches.length} related memories!`
                        : 'No similar past work found'
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 2. SYNTHESIZE CONNECTIONS - AI analyzes related memories
            // ═══════════════════════════════════════════════════════════════
            case 'synthesize_connections': {
                const { current_context, memories } = data

                if (!memories || memories.length === 0) {
                    result = { synthesis: null, message: 'No memories to synthesize' }
                    break
                }

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a memory synthesis expert. Analyze connections between the user's current work and their past memories.
                            
Your job:
1. Identify patterns across memories
2. Surface relevant insights from past work
3. Suggest how past learnings apply to current context
4. Warn about past mistakes that might be relevant`
                        },
                        {
                            role: 'user',
                            content: `CURRENT CONTEXT: ${current_context}

RELATED MEMORIES:
${memories.map((m: any, i: number) => `
[Memory ${i + 1} - ${m.type}] (Similarity: ${Math.round(m.similarity * 100)}%)
Content: ${m.content || m.raw_text || m.summary}
Date: ${m.created_at}
`).join('\n')}

Synthesize connections and return JSON:
{
  "key_insight": "string - most important connection to current work",
  "past_self_advice": "string - what past-you would tell current-you",
  "patterns_detected": [{ "pattern": "string", "occurrences": number, "implication": "string" }],
  "applicable_learnings": [{ "learning": "string", "source_memory": number, "how_to_apply": "string" }],
  "past_mistakes_to_avoid": [{ "mistake": "string", "source_memory": number }],
  "connection_strength": "weak|moderate|strong",
  "recommended_action": "string"
}`
                        }
                    ],
                    max_tokens: 1000,
                    response_format: { type: 'json_object' }
                })

                const synthesis = JSON.parse(completion.choices[0].message.content || '{}')

                // Store connections for future reference
                for (const memory of memories.slice(0, 3)) {
                    await supabase.from('memory_connections').insert({
                        user_id,
                        source_type: 'current_context',
                        source_id: user_id, // Use user_id as placeholder for current context
                        target_type: memory.type,
                        target_id: memory.id,
                        similarity_score: memory.similarity,
                        connection_type: 'semantic',
                        ai_explanation: synthesis.key_insight
                    }).catch(() => { }) // Ignore errors
                }

                result = {
                    synthesis,
                    memory_count: memories.length,
                    message: `🔮 Déjà Vu: ${synthesis.key_insight}`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 3. PREDICT RELEVANCE - Score likelihood memory is useful now
            // ═══════════════════════════════════════════════════════════════
            case 'predict_relevance': {
                const { current_task, memory } = data

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Score how relevant a past memory is to the current task. Be practical and specific.'
                        },
                        {
                            role: 'user',
                            content: `Current task: ${current_task}
Past memory: ${JSON.stringify(memory)}

Return JSON:
{
  "relevance_score": 0-100,
  "relevance_reason": "string",
  "is_actionable": boolean,
  "suggested_application": "string",
  "time_investment": "none|quick_reference|worth_reviewing|deep_dive"
}`
                        }
                    ],
                    max_tokens: 300,
                    response_format: { type: 'json_object' }
                })

                result = JSON.parse(completion.choices[0].message.content || '{}')
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 4. LEARN FROM FAILURE - Extract lessons from past struggles
            // ═══════════════════════════════════════════════════════════════
            case 'learn_from_failure': {
                const { context } = data

                // Search for past struggles (brain dumps with negative sentiment)
                const { data: brainDumps } = await supabase
                    .from('brain_dumps')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('created_at', { ascending: false })
                    .limit(20)

                if (!brainDumps || brainDumps.length === 0) {
                    result = { lessons: [], message: 'No past experiences found' }
                    break
                }

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Analyze past brain dumps to extract lessons from failures, struggles, and challenges. Be specific and actionable.'
                        },
                        {
                            role: 'user',
                            content: `Current context: ${context}

Past experiences:
${brainDumps.map((d: any, i: number) => `[${i + 1}] ${d.raw_text || d.summary}`).join('\n')}

Extract relevant lessons and return JSON:
{
  "lessons": [{
    "lesson": "string",
    "original_struggle": "string",
    "how_to_avoid": "string",
    "applies_now": boolean,
    "confidence": "low|medium|high"
  }],
  "pattern_warning": "string - any recurring pattern to watch out for",
  "encouragement": "string - something positive from past experiences"
}`
                        }
                    ],
                    max_tokens: 800,
                    response_format: { type: 'json_object' }
                })

                result = JSON.parse(completion.choices[0].message.content || '{}')
                result.message = result.lessons?.length > 0
                    ? `📚 Found ${result.lessons.length} lessons from past experiences`
                    : 'No specific lessons found'
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 5. PROACTIVE SURFACE - Auto-detect relevant memories for task
            // ═══════════════════════════════════════════════════════════════
            case 'proactive_surface': {
                const { task_title, task_description } = data
                const context = `${task_title}. ${task_description || ''}`

                // Generate embedding
                const embeddingResponse = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: context.substring(0, 8000)
                })
                const embedding = embeddingResponse.data[0].embedding

                // Search all memory types
                const { data: similarDumps } = await supabase.rpc('match_brain_dumps', {
                    query_embedding: embedding,
                    match_threshold: 0.6, // Higher threshold for proactive surfacing
                    match_count: 3
                }).eq('user_id', user_id)

                if (!similarDumps || similarDumps.length === 0) {
                    result = { has_memories: false, message: null }
                    break
                }

                // Quick synthesis
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Generate a brief, helpful nudge about related past work. Be concise and actionable.'
                        },
                        {
                            role: 'user',
                            content: `Task: ${context}
Related memories: ${JSON.stringify(similarDumps.slice(0, 2))}

Return JSON:
{
  "should_surface": boolean,
  "nudge_message": "string - brief helpful reminder",
  "memory_preview": "string - 1-2 sentence preview of most relevant memory"
}`
                        }
                    ],
                    max_tokens: 200,
                    response_format: { type: 'json_object' }
                })

                const surfaceResult = JSON.parse(completion.choices[0].message.content || '{}')

                result = {
                    has_memories: surfaceResult.should_surface,
                    nudge: surfaceResult.nudge_message,
                    preview: surfaceResult.memory_preview,
                    memories: similarDumps,
                    message: surfaceResult.should_surface ? `🔮 ${surfaceResult.nudge_message}` : null
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 6. GET MEMORY TIMELINE - Recent memory activity
            // ═══════════════════════════════════════════════════════════════
            case 'get_memory_timeline': {
                const { days = 7 } = data
                const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

                const { data: dumps } = await supabase
                    .from('brain_dumps')
                    .select('id, summary, created_at')
                    .eq('user_id', user_id)
                    .gt('created_at', since)
                    .order('created_at', { ascending: false })

                const { data: logs } = await supabase
                    .from('learning_logs')
                    .select('id, topic, summary, created_at')
                    .eq('user_id', user_id)
                    .gt('created_at', since)
                    .order('created_at', { ascending: false })

                const { data: connections } = await supabase
                    .from('memory_connections')
                    .select('*')
                    .eq('user_id', user_id)
                    .gt('created_at', since)
                    .order('created_at', { ascending: false })

                result = {
                    brain_dumps: dumps || [],
                    learning_logs: logs || [],
                    connections: connections || [],
                    total_memories: (dumps?.length || 0) + (logs?.length || 0),
                    message: `${(dumps?.length || 0) + (logs?.length || 0)} memories in the last ${days} days`
                }
                break
            }

            default:
                throw new Error(`Unknown action: ${action}`)
        }

        return new Response(
            JSON.stringify({ success: true, ...result }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Déjà Vu Engine error:', error)
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
