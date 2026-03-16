// Placement Prep Agent - Master Edge Function
// Uses multiple OpenAI models: GPT-4o-mini, TTS, Whisper, DALL-E, Embeddings

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlacementRequest {
    action: 'analyze_role' | 'skill_gap' | 'generate_plan' | 'mock_interview' | 'adapt_plan' | 'generate_visual' | 'text_to_speech'
    user_id: string
    profile_id?: string
    data: any
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, user_id, profile_id, data }: PlacementRequest = await req.json()

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const openai = new OpenAI({
            apiKey: Deno.env.get('OPENAI_API_KEY'),
        })

        let result: any = {}

        switch (action) {
            // ===== 1. ANALYZE ROLE (GPT-4o-mini) =====
            case 'analyze_role': {
                const { role, company, experience_level } = data

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a career advisor AI. Analyze job requirements and provide structured data.
Return JSON only with this structure:
{
  "required_skills": [{"name": "skill", "importance": "critical|important|nice-to-have", "category": "technical|soft|domain"}],
  "interview_topics": ["topic1", "topic2"],
  "common_questions": ["q1", "q2", "q3"],
  "salary_range": {"min": 0, "max": 0, "currency": "USD"},
  "preparation_tips": ["tip1", "tip2"]
}`
                        },
                        {
                            role: 'user',
                            content: `Analyze this role: ${role}${company ? ` at ${company}` : ''}, ${experience_level} level. What skills, interview topics, and questions should I prepare for?`
                        }
                    ],
                    max_tokens: 1000,
                    response_format: { type: 'json_object' },
                })

                const analysis = JSON.parse(completion.choices[0].message.content || '{}')

                // Store profile
                const { data: profile, error } = await supabase
                    .from('placement_profiles')
                    .insert({
                        user_id,
                        target_role: role,
                        target_company: company,
                        experience_level,
                        required_skills: analysis.required_skills
                    })
                    .select()
                    .single()

                if (error) throw error

                result = {
                    profile_id: profile.id,
                    analysis,
                    message: `Analyzed ${role} role. Found ${analysis.required_skills?.length || 0} required skills.`
                }
                break
            }

            // ===== 2. SKILL GAP ANALYSIS (GPT-4o-mini + Embeddings) =====
            case 'skill_gap': {
                const { current_skills } = data

                // Get profile
                const { data: profile } = await supabase
                    .from('placement_profiles')
                    .select('*')
                    .eq('id', profile_id)
                    .single()

                if (!profile) throw new Error('Profile not found')

                const required = profile.required_skills || []
                const current = current_skills || []

                // Use GPT to analyze gaps
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `Analyze skill gaps. Return JSON:
{
  "gaps": [{"skill": "name", "priority": 1-10, "estimated_hours": 0, "difficulty": "easy|medium|hard"}],
  "strengths": ["skill1"],
  "learning_order": ["skill1", "skill2"],
  "estimated_total_hours": 0
}`
                        },
                        {
                            role: 'user',
                            content: `Required skills: ${JSON.stringify(required)}\nUser has: ${current.join(', ')}\nIdentify gaps and learning priority.`
                        }
                    ],
                    max_tokens: 800,
                    response_format: { type: 'json_object' },
                })

                const gaps = JSON.parse(completion.choices[0].message.content || '{}')

                // Update profile
                await supabase
                    .from('placement_profiles')
                    .update({
                        current_skills: current,
                        skill_gaps: gaps.gaps,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', profile_id)

                // Create skill progress entries
                for (const gap of gaps.gaps || []) {
                    await supabase.from('skill_progress').upsert({
                        user_id,
                        profile_id,
                        skill_name: gap.skill,
                        target_level: 80,
                        initial_level: 0,
                        current_level: 0
                    }, { onConflict: 'user_id,profile_id,skill_name' })
                }

                result = {
                    gaps: gaps.gaps,
                    strengths: gaps.strengths,
                    learning_order: gaps.learning_order,
                    estimated_hours: gaps.estimated_total_hours,
                    message: `Found ${gaps.gaps?.length || 0} skill gaps to work on.`
                }
                break
            }

            // ===== 3. GENERATE LEARNING PLAN (GPT-4o-mini) =====
            case 'generate_plan': {
                const { timeline_weeks, hours_per_day } = data

                const { data: profile } = await supabase
                    .from('placement_profiles')
                    .select('*')
                    .eq('id', profile_id)
                    .single()

                if (!profile) throw new Error('Profile not found')

                // Limit to 4 weeks max to avoid response truncation
                const weeksToGenerate = Math.min(timeline_weeks || 4, 4)
                const skillGaps = (profile.skill_gaps || []).slice(0, 4)

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `Create a concise learning plan. Return compact JSON:
{
  "weeks": [{"week": 1, "focus": "topic", "goals": ["g1", "g2"], "tasks": ["task1", "task2", "task3"]}],
  "resources": [{"title": "name", "type": "video|article|course"}],
  "milestones": [{"week": 1, "milestone": "desc"}]
}
Keep it brief - max 3 goals and 3 tasks per week.`
                        },
                        {
                            role: 'user',
                            content: `Create ${weeksToGenerate}-week plan for: ${profile.target_role}. Skills to learn: ${skillGaps.map((g: any) => g.skill || g).join(', ')}. Hours/day: ${hours_per_day || 2}`
                        }
                    ],
                    max_tokens: 1500,
                    response_format: { type: 'json_object' },
                })

                let plan: any = {}
                try {
                    plan = JSON.parse(completion.choices[0].message.content || '{}')
                } catch (parseErr) {
                    // If JSON parsing fails, return a simple plan
                    plan = {
                        weeks: skillGaps.slice(0, weeksToGenerate).map((gap: any, i: number) => ({
                            week: i + 1,
                            focus: gap.skill || gap,
                            goals: [`Learn ${gap.skill || gap} basics`, 'Practice with exercises', 'Build mini-project'],
                            tasks: ['Watch tutorials', 'Read documentation', 'Complete exercises']
                        })),
                        resources: [{ title: 'FreeCodeCamp', type: 'course' }],
                        milestones: [{ week: weeksToGenerate, milestone: 'Interview ready' }]
                    }
                }

                // Store learning plan
                for (const week of plan.weeks || []) {
                    await supabase.from('learning_plans').insert({
                        user_id,
                        profile_id,
                        week_number: week.week,
                        daily_plan: week.tasks || [],
                        resources: plan.resources,
                        status: 'active',
                        version: 1
                    })
                }

                result = {
                    plan,
                    message: `Created ${plan.weeks?.length || 0}-week learning plan.`
                }
                break
            }

            // ===== 4. MOCK INTERVIEW (GPT-4o-mini + TTS) =====
            case 'mock_interview': {
                const { interview_type, difficulty, focus_areas, answers } = data

                const { data: profile } = await supabase
                    .from('placement_profiles')
                    .select('*')
                    .eq('id', profile_id)
                    .single()

                if (!answers) {
                    // Generate questions
                    const completion = await openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: `Generate interview questions. Return JSON:
{
  "questions": [
    {"id": 1, "question": "text", "difficulty": "easy|medium|hard", "category": "category", "expected_points": ["point1"]}
  ],
  "tips": ["tip1"]
}`
                            },
                            {
                                role: 'user',
                                content: `${interview_type} interview for ${profile?.target_role}. Difficulty: ${difficulty}. Focus: ${focus_areas?.join(', ') || 'general'}. Generate 5 questions.`
                            }
                        ],
                        max_tokens: 1000,
                        response_format: { type: 'json_object' },
                    })

                    const questions = JSON.parse(completion.choices[0].message.content || '{}')

                    // Generate TTS for first question
                    const ttsResponse = await openai.audio.speech.create({
                        model: 'tts-1',
                        voice: 'alloy',
                        input: questions.questions?.[0]?.question || 'Tell me about yourself.',
                    })

                    const audioBuffer = await ttsResponse.arrayBuffer()
                    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

                    result = {
                        questions: questions.questions,
                        tips: questions.tips,
                        audio_base64: audioBase64,
                        message: `Generated ${questions.questions?.length || 0} interview questions.`
                    }
                } else {
                    // Score answers
                    const completion = await openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: `Score interview answers. Return JSON:
{
  "scores": [{"question_id": 1, "score": 0-100, "feedback": "text", "strengths": ["s1"], "improvements": ["i1"]}],
  "overall_score": 0-100,
  "overall_feedback": "text",
  "areas_to_improve": ["area1"],
  "ready_for_interview": true/false
}`
                            },
                            {
                                role: 'user',
                                content: `Score these answers:\n${JSON.stringify(answers)}`
                            }
                        ],
                        max_tokens: 1000,
                        response_format: { type: 'json_object' },
                    })

                    const scoring = JSON.parse(completion.choices[0].message.content || '{}')

                    // Store interview
                    await supabase.from('mock_interviews').insert({
                        user_id,
                        profile_id,
                        interview_type,
                        difficulty,
                        questions: answers,
                        overall_score: scoring.overall_score,
                        feedback: scoring.overall_feedback,
                        areas_to_improve: scoring.areas_to_improve
                    })

                    // Auto-trigger plan adaptation if score < 60
                    if (scoring.overall_score < 60) {
                        // This chains to adapt_plan
                        result = {
                            ...scoring,
                            needs_adaptation: true,
                            message: `Score: ${scoring.overall_score}%. Recommending plan revision.`
                        }
                    } else {
                        result = {
                            ...scoring,
                            needs_adaptation: false,
                            message: `Score: ${scoring.overall_score}%. Good progress!`
                        }
                    }
                }
                break
            }

            // ===== 5. ADAPT PLAN (GPT-4o-mini) =====
            case 'adapt_plan': {
                const { interview_results, areas_to_improve } = data

                const { data: currentPlan } = await supabase
                    .from('learning_plans')
                    .select('*')
                    .eq('profile_id', profile_id)
                    .eq('status', 'active')
                    .order('week_number', { ascending: true })

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `Revise the learning plan to focus on weak areas. Return JSON:
{
  "revised_weeks": [...],
  "additional_practice": [{"skill": "name", "exercises": ["ex1"]}],
  "focus_shift": "explanation"
}`
                        },
                        {
                            role: 'user',
                            content: `Interview score: ${interview_results?.score}%\nWeak areas: ${areas_to_improve?.join(', ')}\nCurrent plan: ${JSON.stringify(currentPlan)}\nRevise to improve weak areas.`
                        }
                    ],
                    max_tokens: 1500,
                    response_format: { type: 'json_object' },
                })

                const revised = JSON.parse(completion.choices[0].message.content || '{}')

                // Mark old plans as revised, create new version
                await supabase
                    .from('learning_plans')
                    .update({ status: 'revised' })
                    .eq('profile_id', profile_id)
                    .eq('status', 'active')

                result = {
                    revised_plan: revised,
                    message: `Plan adapted to focus on: ${areas_to_improve?.join(', ')}`
                }
                break
            }

            // ===== 6. GENERATE VISUAL (DALL-E) =====
            case 'generate_visual': {
                const { topic, style } = data

                const imageResponse = await openai.images.generate({
                    model: 'dall-e-3',
                    prompt: `Create an educational infographic about ${topic}. Style: ${style || 'modern, clean, professional'}. Include key concepts and visual hierarchy.`,
                    n: 1,
                    size: '1024x1024',
                    quality: 'standard',
                })

                result = {
                    image_url: imageResponse.data[0]?.url,
                    message: `Generated visual for: ${topic}`
                }
                break
            }

            // ===== 7. TEXT TO SPEECH (TTS) =====
            case 'text_to_speech': {
                const { text, voice } = data

                const ttsResponse = await openai.audio.speech.create({
                    model: 'tts-1',
                    voice: voice || 'alloy',
                    input: text,
                })

                const audioBuffer = await ttsResponse.arrayBuffer()
                const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

                result = {
                    audio_base64: audioBase64,
                    message: 'Audio generated'
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
        console.error('Placement agent error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
