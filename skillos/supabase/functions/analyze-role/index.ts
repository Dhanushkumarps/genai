// Setup for analyze-role function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { role, company } = await req.json()
        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert tech career coach. Analyze the given role and company (optional) to provide a JSON with:
          - "required_skills": List of technical skills (languages, frameworks, concepts).
          - "soft_skills": List of behavioral traits.
          - "interview_topics": Common technical interview topics.
          - "salary_range": Estimated range (USD).
          - "roadmap": 3 key milestones to master this role.
          
          Return RAW JSON only.`
                },
                { role: 'user', content: `Role: ${role}\nCompany: ${company || 'General Tech Industry'}` }
            ],
            response_format: { type: "json_object" }
        })

        const result = JSON.parse(completion.choices[0].message.content || '{}')

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
