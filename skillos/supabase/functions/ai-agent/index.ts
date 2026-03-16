import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AgentRequest {
    user_id: string
    action: 'analyze' | 'coach' | 'summarize_day' | 'suggest_next'
    context?: any
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { user_id, action, context }: AgentRequest = await req.json()

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const openai = new OpenAI({
            apiKey: Deno.env.get('OPENAI_API_KEY'),
        })

        // Gather user context
        const [statsResult, tasksResult, logsResult, dumpsResult] = await Promise.all([
            supabase.from('system_stats').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(10),
            supabase.from('tasks').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(20),
            supabase.from('learning_logs').select('content, created_at, tags').eq('user_id', user_id).order('created_at', { ascending: false }).limit(10),
            supabase.from('brain_dumps').select('content, created_at').eq('user_id', user_id).order('created_at', { ascending: false }).limit(5)
        ])

        const stats = statsResult.data || []
        const tasks = tasksResult.data || []
        const logs = logsResult.data || []
        const dumps = dumpsResult.data || []

        // Build context summary
        const avgEnergy = stats.length > 0 ? Math.round(stats.reduce((a, s) => a + (s.energy_level || 50), 0) / stats.length) : 50
        const avgLoad = stats.length > 0 ? Math.round(stats.reduce((a, s) => a + (s.cognitive_load || 50), 0) / stats.length) : 50
        const pendingTasks = tasks.filter(t => t.status === 'pending').length
        const completedToday = tasks.filter(t => t.status === 'completed' && new Date(t.completed_at).toDateString() === new Date().toDateString()).length
        const recentLearning = logs.slice(0, 3).map(l => l.content.substring(0, 100)).join('; ')
        const recentDumps = dumps.slice(0, 2).map(d => d.content.substring(0, 100)).join('; ')

        const userProfile = `
USER STATE:
- Average Energy: ${avgEnergy}%
- Average Cognitive Load: ${avgLoad}%
- Pending Tasks: ${pendingTasks}
- Completed Today: ${completedToday}
- Recent Learning: ${recentLearning || 'None'}
- Recent Brain Dumps: ${recentDumps || 'None'}
- Current Time: ${new Date().toLocaleTimeString()}
`

        let systemPrompt = ''
        let userPrompt = ''

        switch (action) {
            case 'analyze':
                systemPrompt = `You are ARIA (Adaptive Reasoning & Intelligence Agent), a personal AI productivity coach built into SkillOS. 
You analyze user patterns and provide actionable insights. Be conversational but concise. Use emoji sparingly.
Format your response with clear sections using markdown.`
                userPrompt = `${userProfile}\n\nAnalyze my current state and provide 3 specific, actionable insights about my productivity patterns.`
                break

            case 'coach':
                systemPrompt = `You are ARIA, a supportive AI coach. Be encouraging but honest. 
Focus on practical, immediately actionable advice. Keep responses under 100 words.`
                userPrompt = `${userProfile}\n\n${context?.question || 'Give me a quick productivity tip based on my current state.'}`
                break

            case 'summarize_day':
                systemPrompt = `You are ARIA. Provide a brief, insightful summary of the user's day.
Highlight wins, patterns noticed, and one suggestion for tomorrow. Use a warm tone.`
                userPrompt = `${userProfile}\n\nSummarize my day so far and give me one actionable insight.`
                break

            case 'suggest_next':
                systemPrompt = `You are ARIA. Based on the user's current state, suggest the single best next action.
Be specific. Consider their energy level, pending tasks, and time of day.`
                userPrompt = `${userProfile}\n\nWhat should I do next? Give me ONE specific recommendation with a brief reason.`
                break

            default:
                throw new Error('Unknown action')
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 400,
            temperature: 0.7,
        })

        const response = completion.choices[0].message.content || ''

        return new Response(
            JSON.stringify({
                success: true,
                response,
                context: { avgEnergy, avgLoad, pendingTasks, completedToday }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Agent error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
