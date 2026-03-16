// Contextual Skill Bridge - Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { page_content, page_url, user_id } = await req.json()

        // 1. Fetch User Profile & Skills
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Try getting detailed placement profile first, else fallback to just user metadata if any
        // For hackathon, we assume placement_profiles or generic skills
        let userSkills = []
        const { data: profile } = await supabase
            .from('placement_profiles')
            .select('current_skills')
            .eq('user_id', user_id)
            .maybeSingle()

        if (profile?.current_skills) {
            userSkills = profile.current_skills
        } else {
            // Fallback: Check if we have manual skills table or just assume basic profile
            // For now, let's look for 'profiles' or mock it if empty
            // Mocking strictly for robustness if table missing
            userSkills = ['JavaScript', 'React', 'HTML', 'CSS']
        }

        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

        // 2. AI Analysis
        // Truncate content to avoid token limits
        const truncatedContent = page_content.slice(0, 10000)

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are the "Skill Bridge" AI — an ultra-intelligent, enthusiastic career accelerator.
                    
                    Your Goal:
                    Instantly bridge the gap between where the user IS (Skills: ${JSON.stringify(userSkills)}) and where the content asks them to BE.
                    
                    Input Context:
                    - Page Type: inferred from URL/Content (Job Post, Documentation, Tutorial, GitHub Repo, Tech Blog).
                    - Content: ${page_url} (and provided snippet).

                    Output Style: 
                    - High energy, motivational, but extremely concise and actionable.
                    - "Fit Score" should be strict but fair.
                    - "Bridge Plan" must be concrete micro-tasks, not generic advice.

                    JSON Structure:
                    {
                        "type": "job" | "documentation" | "repo" | "article" | "other",
                        "fit_score": number (0-100),
                        "summary": "punchy 1-line hook about this role/resource.",
                        "gap_analysis": "Direct, no-fluff explanation of the skill delta.",
                        "missing_concepts": ["concept1", "concept2"],
                        "bridge_plan": [
                            {
                                "title": "Actionable Micro-Task",
                                "description": "Specific context on why/how. Mention specific libraries or concepts from the page.",
                                "estimated_time": "15 min",
                                "resource_query": "Best query to learn this specifically"
                            }
                        ]
                    }`
                },
                {
                    role: 'user',
                    content: `User Skills: ${JSON.stringify(userSkills)}\n\nPage URL: ${page_url}\n\nPage Content Preview:\n${truncatedContent}`
                }
            ],
            response_format: { type: "json_object" }
        })

        const result = JSON.parse(completion.choices[0].message.content || '{}')

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
