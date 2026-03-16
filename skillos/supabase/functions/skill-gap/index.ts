// Setup for skill-gap function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { current_skills, required_skills } = await req.json()
        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Compare the user's current skills vs required skills. Return a JSON with:
          - "missing_skills": List of critical skills the user lacks.
          - "score": 0-100 match score.
          - "plan_outline": Brief 5-step plan to close the gap.
          - "priority": "High" if gaps are fundamental, "Low" if minor.
          
          Return RAW JSON only.`
                },
                { role: 'user', content: `Current: ${JSON.stringify(current_skills)}\nRequired: ${JSON.stringify(required_skills)}` }
            ],
            response_format: { type: "json_object" }
        })

        const result = JSON.parse(completion.choices[0].message.content || '{}')

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
