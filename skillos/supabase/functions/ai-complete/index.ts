import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIRequest {
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

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const openai = new OpenAI({
            apiKey: Deno.env.get('OPENAI_API_KEY'),
        })

        const body: AIRequest = await req.json()
        const { mode, messages, content, context } = body

        let response: string = ''

        switch (mode) {
            case 'chat': {
                // Neural Chat - conversational AI with context
                const systemPrompt = `You are SkillOS Neural Assistant, an AI companion helping users optimize their learning and cognitive performance. 
You have access to the user's learning history and can help them:
- Recall and connect concepts they've learned
- Suggest what to learn next
- Provide encouragement and motivation
- Answer questions about their progress

Be concise, friendly, and use a slightly futuristic/cyberpunk tone. Use emojis sparingly.
${context?.recentLogs ? `\nUser's recent learning logs:\n${context.recentLogs.join('\n')}` : ''}`

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...(messages || [])
                    ],
                    max_tokens: 500,
                    temperature: 0.7,
                })
                response = completion.choices[0].message.content || ''
                break
            }

            case 'summarize': {
                // Summarize learning log content
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a learning assistant. Summarize the following learning note into 2-3 bullet points. Extract key concepts. Be concise.' },
                        { role: 'user', content: content || '' }
                    ],
                    max_tokens: 200,
                })
                response = completion.choices[0].message.content || ''
                break
            }

            case 'sentiment': {
                // Analyze brain dump sentiment
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system', content: `Analyze the emotional state from this brain dump. Return JSON only:
{
  "score": <1-10, 1=very stressed, 10=very calm>,
  "mood": "<one word>",
  "concerns": ["<main concern 1>", "<main concern 2>"],
  "suggestion": "<one actionable coping suggestion>"
}` },
                        { role: 'user', content: content || '' }
                    ],
                    max_tokens: 200,
                    response_format: { type: 'json_object' },
                })
                response = completion.choices[0].message.content || '{}'
                break
            }

            case 'recommend': {
                // Task recommendation based on context
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system', content: `You are a productivity advisor. Based on the user's current state, recommend what they should do next. Return JSON:
{
  "recommendation": "<what to do>",
  "reason": "<why this is optimal>",
  "difficulty": "<low/medium/high>"
}` },
                        {
                            role: 'user', content: `Current state:
- Cognitive Load: ${context?.cognitiveLoad || 50}%
- Energy Level: ${context?.energyLevel || 50}%
- Pending Tasks: ${context?.recentTasks?.join(', ') || 'None'}
- Time: ${new Date().toLocaleTimeString()}`
                        }
                    ],
                    max_tokens: 200,
                    response_format: { type: 'json_object' },
                })
                response = completion.choices[0].message.content || '{}'
                break
            }

            case 'insights': {
                // Generate insights from learning content
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system', content: `Analyze this learning note and extract insights. Return JSON:
{
  "keyTakeaways": ["<point 1>", "<point 2>"],
  "concepts": ["<concept 1>", "<concept 2>"],
  "questions": ["<question to explore>"],
  "connections": "<how this might connect to other topics>"
}` },
                        { role: 'user', content: content || '' }
                    ],
                    max_tokens: 300,
                    response_format: { type: 'json_object' },
                })
                response = completion.choices[0].message.content || '{}'
                break
            }

            default:
                throw new Error(`Unknown mode: ${mode}`)
        }

        return new Response(
            JSON.stringify({ success: true, data: response }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('AI Complete Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
