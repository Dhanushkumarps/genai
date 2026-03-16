import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { user_id, log_ids } = await req.json()

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const openai = new OpenAI({
            apiKey: Deno.env.get('OPENAI_API_KEY'),
        })

        // Fetch logs
        let query = supabase
            .from('learning_logs')
            .select('id, content, tags, created_at')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(50) // Increased limit for better context

        if (log_ids && log_ids.length > 0) {
            query = query.in('id', log_ids)
        }

        const { data: logs, error } = await query

        if (error) throw error
        if (!logs || logs.length < 2) {
            return new Response(
                JSON.stringify({ connections: [], clusters: [], message: 'Need at least 2 logs' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Prepare content
        const logSummaries = logs.map((l, i) => `[${i}] ${l.content.substring(0, 200)}`).join('\n\n')

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a Neural Knowledge Engine. Analyze these learning notes to find semantic connections and thematic clusters.
Return valid JSON with:
1. "connections": Array of { "from": index, "to": index, "reason": "brief explanation", "strength": 1-10 }
2. "clusters": Array of { "label": "Topic Name", "nodes": [indices], "insight": "Key insight from this group" }

Rules:
- Connect notes with shared concepts even if they have different tags.
- Strength 10 = direct dependency or identical concept.
- Create 3-5 broad clusters.
- Return RAW JSON only.`
                },
                { role: 'user', content: logSummaries }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" }
        })

        const result = JSON.parse(completion.choices[0].message.content || '{}')
        const connections = result.connections || []
        const clusters = result.clusters || []

        // Map indices to IDs
        const mappedConnections = connections.map((c: any) => ({
            sourceId: logs[c.from]?.id,
            targetId: logs[c.to]?.id,
            reason: c.reason,
            strength: c.strength
        })).filter((c: any) => c.sourceId && c.targetId)

        const mappedClusters = clusters.map((c: any) => ({
            label: c.label,
            insight: c.insight,
            nodeIds: (c.nodes || []).map((idx: number) => logs[idx]?.id).filter(Boolean)
        }))

        return new Response(
            JSON.stringify({ connections: mappedConnections, clusters: mappedClusters }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Analyze error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
