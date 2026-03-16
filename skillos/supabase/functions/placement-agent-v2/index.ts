// Placement Prep Agent v2 - Next-Generation AI Career Accelerator
// Multi-model AI orchestration with cost optimization
// Using accessible models that don't require org verification

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Model selection - using accessible models (no org verification required)
const MODELS = {
    DEEP_RESEARCH: 'gpt-4o',                 // Best available without verification
    REASONING: 'gpt-4o',                      // High quality reasoning
    REASONING_MINI: 'gpt-4o-mini',            // Cost-effective reasoning
    STANDARD: 'gpt-4o-mini',                  // General generation
    FAST: 'gpt-4o-mini',                      // Quick operations  
    FAST_ALT: 'gpt-4o-mini',                  // Flashcards
    SEARCH: 'gpt-4o',                         // Company intel (simulated search)
    TTS: 'tts-1',                             // Speech generation
    STT: 'whisper-1',                         // Speech recognition
} as const

interface PlacementRequest {
    action: string
    user_id: string
    profile_id?: string
    data: Record<string, any>
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

        let result: Record<string, any> = {}

        switch (action) {

            // ═══════════════════════════════════════════════════════════════
            // 1. DEEP ROLE ANALYSIS - Comprehensive market research
            // Model: gpt-4o (best available without verification)
            // ═══════════════════════════════════════════════════════════════
            case 'deep_role_analysis': {
                const { role, location = 'Remote', experience_level = 'mid' } = data
                const normalizedRole = role.toLowerCase().trim()
                let analysis: any = null
                let fromCache = false

                // Try to check cache first (ignore errors if table doesn't exist)
                try {
                    const { data: cached } = await supabase
                        .from('role_analysis_cache')
                        .select('*')
                        .eq('normalized_role', normalizedRole)
                        .eq('location', location)
                        .gt('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                        .single()

                    if (cached) {
                        analysis = cached.analysis_data
                        fromCache = true
                    }
                } catch (cacheErr) {
                    console.log('Cache check failed:', cacheErr)
                }

                // If not in cache, generate with AI
                if (!analysis) {
                    const completion = await openai.chat.completions.create({
                        model: MODELS.DEEP_RESEARCH,
                        messages: [
                            {
                                role: 'system',
                                content: `You are an expert career analyst with deep knowledge of the tech job market.
Conduct comprehensive research and return a detailed JSON analysis.
Be specific with numbers, companies, and actionable insights.`
                            },
                            {
                                role: 'user',
                                content: `Analyze the role: "${role}" at ${experience_level} level in ${location}.

Research and provide:
1. Market demand analysis (hiring trends, competition)
2. Salary benchmarks (min/median/max for the location)
3. Top 10 required skills with importance ranking
4. Top 5 nice-to-have skills
5. Common interview topics and question patterns
6. Top 20 companies hiring for this role
7. Career progression path
8. Industry trends affecting this role
9. Red flags to watch out for
10. Insider tips for standing out

Return as JSON:
{
  "role": "string",
  "market_outlook": "growing|stable|declining",
  "demand_score": 1-10,
  "salary": { "min": number, "median": number, "max": number, "currency": "USD" },
  "required_skills": [{ "name": "string", "importance": "critical|important|nice", "proficiency_needed": "beginner|intermediate|advanced" }],
  "nice_to_have": ["string"],
  "interview_topics": [{ "topic": "string", "weight": 1-10, "sample_questions": ["string"] }],
  "top_companies": [{ "name": "string", "hiring_volume": "high|medium|low", "culture": "string" }],
  "career_path": [{ "years": "string", "title": "string", "salary_range": "string" }],
  "trends": [{ "trend": "string", "impact": "positive|negative|neutral" }],
  "red_flags": ["string"],
  "insider_tips": ["string"],
  "preparation_timeline": { "minimum_weeks": 4, "recommended_weeks": 8 }
}`
                            }
                        ],
                        max_tokens: 4000,
                        response_format: { type: 'json_object' },
                    })

                    analysis = JSON.parse(completion.choices[0].message.content || '{}')

                    // Cache the result
                    try {
                        await supabase.from('role_analysis_cache').insert({
                            role_name: role,
                            normalized_role: normalizedRole,
                            location,
                            analysis_data: analysis,
                            salary_benchmarks: analysis.salary,
                            skill_trends: analysis.trends,
                            top_companies: analysis.top_companies
                        })
                    } catch (cacheErr) {
                        console.log('Cache insert failed:', cacheErr)
                    }
                }

                // Create/update user profile (ALWAYS do this, even if cached)
                let profileId = null
                try {
                    const { data: profile } = await supabase
                        .from('placement_profiles')
                        .insert({
                            user_id,
                            target_role: role,
                            target_company: null,
                            target_location: location,
                            experience_level,
                            required_skills: analysis.required_skills
                        })
                        .select()
                        .single()
                    profileId = profile?.id
                } catch (profileErr) {
                    console.log('Profile insert failed:', profileErr)
                    // Try to get existing profile
                    const { data: existingProfile } = await supabase
                        .from('placement_profiles')
                        .select('id')
                        .eq('user_id', user_id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single()
                    profileId = existingProfile?.id
                }

                result = {
                    profile_id: profileId,
                    analysis: analysis,
                    cached: fromCache,
                    message: `Deep analysis complete for ${role}. Found ${analysis.required_skills?.length || 0} key skills.`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 2. COMPANY INTEL - Real-time web search for company research
            // Model: gpt-4o-search (with web search capability)
            // ═══════════════════════════════════════════════════════════════
            case 'company_intel': {
                const { company } = data
                const normalizedCompany = company.toLowerCase().replace(/\s+/g, '-')

                // Check cache (24h TTL)
                const { data: cached } = await supabase
                    .from('company_research')
                    .select('*')
                    .eq('normalized_name', normalizedCompany)
                    .gt('last_updated', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                    .single()

                if (cached) {
                    result = { cached: true, ...cached.research_data }
                    break
                }

                // Web search using gpt-4o-search
                const completion = await openai.chat.completions.create({
                    model: MODELS.SEARCH,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a company research analyst. Search the web and compile comprehensive company intelligence.'
                        },
                        {
                            role: 'user',
                            content: `Research "${company}" for a job seeker. Find:
1. Company overview and mission
2. Recent news and announcements (last 6 months)
3. Culture and work environment (from Glassdoor, Blind, etc.)
4. Interview process and typical rounds
5. Common interview questions
6. Salary ranges for tech roles
7. Benefits and perks
8. Red flags or concerns
9. Tips for getting hired
10. Notable projects or products

Return as JSON:
{
  "company": string,
  "overview": string,
  "mission": string,
  "size": string,
  "industry": string,
  "culture": { "rating": 1-5, "summary": string, "pros": [string], "cons": [string] },
  "interview_process": { "rounds": number, "duration_weeks": number, "stages": [string] },
  "common_questions": [{ "question": string, "category": string }],
  "salary_ranges": [{ "role": string, "min": number, "max": number }],
  "benefits": [string],
  "recent_news": [{ "title": string, "date": string, "summary": string }],
  "red_flags": [string],
  "hiring_tips": [string],
  "tech_stack": [string]
}`
                        }
                    ],
                    max_tokens: 3000,
                    response_format: { type: 'json_object' },
                })

                const research = JSON.parse(completion.choices[0].message.content || '{}')

                // Cache result
                await supabase.from('company_research').upsert({
                    company_name: company,
                    normalized_name: normalizedCompany,
                    research_data: research,
                    interview_patterns: { rounds: research.interview_process?.rounds, stages: research.interview_process?.stages },
                    culture_summary: research.culture?.summary,
                    salary_data: research.salary_ranges,
                    recent_news: research.recent_news,
                    last_updated: new Date().toISOString()
                }, { onConflict: 'normalized_name' })

                result = {
                    research,
                    message: `Company intel gathered for ${company}`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 3. SMART SKILL GAP ANALYSIS
            // Model: gpt-5-mini (cost-effective for structured analysis)
            // ═══════════════════════════════════════════════════════════════
            case 'smart_skill_gap': {
                const { current_skills, years_experience = 0 } = data

                const { data: profile } = await supabase
                    .from('placement_profiles')
                    .select('*')
                    .eq('id', profile_id)
                    .single()

                if (!profile) throw new Error('Profile not found')

                const completion = await openai.chat.completions.create({
                    model: MODELS.STANDARD,
                    messages: [
                        {
                            role: 'system',
                            content: `Analyze skill gaps with learning recommendations. Be practical and specific.`
                        },
                        {
                            role: 'user',
                            content: `Target role: ${profile.target_role}
Required skills: ${JSON.stringify(profile.required_skills)}
User has: ${current_skills.join(', ')}
Experience: ${years_experience} years

Analyze gaps and return JSON:
{
  "gaps": [{ 
    "skill": string, 
    "priority": 1-10, 
    "current_level": 0-100, 
    "target_level": number,
    "estimated_hours": number, 
    "difficulty": "easy|medium|hard",
    "learning_path": [string],
    "resources": [{ "title": string, "type": "course|book|tutorial|practice", "url": string, "free": boolean }]
  }],
  "strengths": [{ "skill": string, "level": number }],
  "learning_order": [string],
  "total_hours": number,
  "readiness_score": 0-100,
  "quick_wins": [{ "skill": string, "hours": number, "impact": "high|medium|low" }]
}`
                        }
                    ],
                    max_tokens: 2000,
                    response_format: { type: 'json_object' },
                })

                const analysis = JSON.parse(completion.choices[0].message.content || '{}')

                // Update profile
                await supabase
                    .from('placement_profiles')
                    .update({
                        current_skills: current_skills,
                        skill_gaps: analysis.gaps,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', profile_id)

                // Initialize progress tracking
                await supabase.from('placement_progress').upsert({
                    user_id,
                    profile_id,
                    readiness_score: analysis.readiness_score,
                    weak_areas: analysis.gaps.slice(0, 5).map((g: any) => g.skill),
                    strong_areas: analysis.strengths.map((s: any) => s.skill),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,profile_id' })

                result = {
                    ...analysis,
                    message: `Found ${analysis.gaps?.length || 0} skill gaps. Estimated ${analysis.total_hours || 0} hours to interview-ready.`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 4. ADAPTIVE LEARNING PLAN
            // Model: o3 (reasoning for personalized planning)
            // ═══════════════════════════════════════════════════════════════
            case 'adaptive_plan': {
                const { timeline_weeks = 4, hours_per_day = 2, focus_areas, interview_date } = data

                const { data: profile } = await supabase
                    .from('placement_profiles')
                    .select('*')
                    .eq('id', profile_id)
                    .single()

                const { data: progress } = await supabase
                    .from('placement_progress')
                    .select('*')
                    .eq('profile_id', profile_id)
                    .single()

                const { data: pastInterviews } = await supabase
                    .from('interview_sessions')
                    .select('session_type, overall_score, improvement_areas')
                    .eq('profile_id', profile_id)
                    .order('created_at', { ascending: false })
                    .limit(5)

                const completion = await openai.chat.completions.create({
                    model: MODELS.REASONING,
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert learning strategist. Create personalized, adaptive study plans.
Consider past performance, time constraints, and learning science principles.
Apply spaced repetition and interleaving for optimal retention.`
                        },
                        {
                            role: 'user',
                            content: `Create a personalized ${timeline_weeks}-week study plan.

Context:
- Target role: ${profile?.target_role}
- Skill gaps: ${JSON.stringify(profile?.skill_gaps?.slice(0, 6))}
- Past interview scores: ${JSON.stringify(pastInterviews)}
- Weak areas from progress: ${JSON.stringify(progress?.weak_areas)}
- Focus areas requested: ${focus_areas?.join(', ') || 'None specified'}
- Available time: ${hours_per_day} hours/day
- Interview date: ${interview_date || 'Not set'}

Return JSON:
{
  "weeks": [{
    "week": number,
    "theme": string,
    "goals": [string],
    "daily_plan": [{
      "day": number,
      "focus": string,
      "tasks": [{ "title": string, "duration_mins": number, "type": "learn|practice|review|mock" }],
      "total_hours": number
    }],
    "milestone": string,
    "checkpoint_quiz": [{ "question": string, "topic": string }]
  }],
  "resources": [{ "title": string, "url": string, "type": string, "priority": "must|should|could" }],
  "key_milestones": [{ "week": number, "milestone": string, "success_criteria": string }],
  "contingency": { "if_behind": string, "if_ahead": string },
  "predicted_readiness": { "after_plan": number, "confidence": number }
}`
                        }
                    ],
                    max_tokens: 3000,
                    response_format: { type: 'json_object' },
                })

                const plan = JSON.parse(completion.choices[0].message.content || '{}')

                // Store learning plan
                await supabase.from('learning_plans').insert({
                    user_id,
                    profile_id,
                    plan,
                    status: 'active',
                    version: 1
                })

                // Update profile interview date if provided
                if (interview_date) {
                    await supabase
                        .from('placement_profiles')
                        .update({ interview_date, status: 'preparing' })
                        .eq('id', profile_id)
                }

                result = {
                    plan,
                    message: `Created adaptive ${timeline_weeks}-week plan. Predicted readiness: ${plan.predicted_readiness?.after_plan || '?'}%`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 5. INTERVIEW COACH - Generate contextual questions
            // Model: gpt-5.1 (high quality for realistic questions)
            // ═══════════════════════════════════════════════════════════════
            case 'interview_coach': {
                const { interview_type = 'technical', difficulty = 'medium', company_context, focus_topics, count = 5 } = data

                const { data: profile } = await supabase
                    .from('placement_profiles')
                    .select('target_role, target_company, required_skills')
                    .eq('id', profile_id)
                    .single()

                // Get company-specific patterns if available
                let companyPatterns = null
                if (company_context || profile?.target_company) {
                    const { data: companyData } = await supabase
                        .from('company_research')
                        .select('interview_patterns, common_questions')
                        .eq('normalized_name', (company_context || profile?.target_company || '').toLowerCase().replace(/\s+/g, '-'))
                        .single()
                    companyPatterns = companyData
                }

                const completion = await openai.chat.completions.create({
                    model: MODELS.DEEP_RESEARCH,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a senior tech interviewer at a top company.
Generate realistic, challenging interview questions that reflect actual interview patterns.
Include the STAR format hints for behavioral questions.
For technical questions, include follow-up probing questions.`
                        },
                        {
                            role: 'user',
                            content: `Generate ${count} ${interview_type} interview questions for ${profile?.target_role}.

Difficulty: ${difficulty}
Company context: ${company_context || profile?.target_company || 'General'}
Focus topics: ${focus_topics?.join(', ') || 'General'}
Company interview patterns: ${JSON.stringify(companyPatterns?.interview_patterns)}
Key skills to test: ${profile?.required_skills?.slice(0, 5).map((s: any) => s.name).join(', ')}

Return JSON:
{
  "questions": [{
    "id": number,
    "question": string,
    "type": "${interview_type}",
    "difficulty": "${difficulty}",
    "topic": string,
    "expected_duration_mins": number,
    "evaluation_criteria": [string],
    "ideal_answer_points": [string],
    "follow_ups": [string],
    "star_hints": { "situation": string, "task": string, "action": string, "result": string } | null,
    "common_mistakes": [string]
  }],
  "warm_up_tip": string,
  "interview_tips": [string]
}`
                        }
                    ],
                    max_tokens: 2500,
                    response_format: { type: 'json_object' },
                })

                const questions = JSON.parse(completion.choices[0].message.content || '{}')

                result = {
                    ...questions,
                    message: `Generated ${questions.questions?.length || 0} ${difficulty} ${interview_type} questions`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 6. ANSWER EVALUATION - Deep feedback on interview answers
            // Model: o4-mini (reasoning for thorough evaluation)
            // ═══════════════════════════════════════════════════════════════
            case 'answer_eval': {
                const { questions, answers, interview_type = 'technical' } = data

                const completion = await openai.chat.completions.create({
                    model: MODELS.REASONING_MINI,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a senior interviewer providing detailed, actionable feedback.
Evaluate answers against industry standards. Be honest but constructive.
Focus on both content and delivery aspects.`
                        },
                        {
                            role: 'user',
                            content: `Evaluate these ${interview_type} interview answers:

${questions.map((q: any, i: number) => `
Q${i + 1}: ${q.question}
Expected points: ${q.ideal_answer_points?.join(', ')}
Candidate answer: ${answers[i]?.answer || 'No answer provided'}
`).join('\n')}

Return JSON:
{
  "scores": [{
    "question_id": number,
    "score": 0-100,
    "feedback": string,
    "strengths": [string],
    "improvements": [string],
    "missing_points": [string],
    "delivery_feedback": string,
    "revised_answer_example": string
  }],
  "overall_score": 0-100,
  "overall_feedback": string,
  "technical_depth": 0-100,
  "communication_clarity": 0-100,
  "problem_solving_approach": 0-100,
  "top_strengths": [string],
  "top_improvements": [string],
  "ready_for_interview": boolean,
  "confidence_level": "not_ready|needs_practice|almost_ready|ready",
  "recommended_focus": [string],
  "next_steps": [string]
}`
                        }
                    ],
                    max_tokens: 2500,
                    response_format: { type: 'json_object' },
                })

                const evaluation = JSON.parse(completion.choices[0].message.content || '{}')

                // Store interview session
                await supabase.from('interview_sessions').insert({
                    user_id,
                    profile_id,
                    session_type: interview_type,
                    difficulty: data.difficulty || 'medium',
                    questions,
                    answers,
                    scores: evaluation.scores,
                    overall_score: evaluation.overall_score,
                    ai_feedback: evaluation.overall_feedback,
                    strengths: evaluation.top_strengths,
                    improvement_areas: evaluation.top_improvements
                })

                // Update progress
                const { data: currentProgress } = await supabase
                    .from('placement_progress')
                    .select('*')
                    .eq('profile_id', profile_id)
                    .single()

                if (currentProgress) {
                    const newAvg = ((currentProgress.avg_interview_score * currentProgress.total_interviews) + evaluation.overall_score) / (currentProgress.total_interviews + 1)
                    await supabase.from('placement_progress').update({
                        total_interviews: currentProgress.total_interviews + 1,
                        avg_interview_score: Math.round(newAvg),
                        weak_areas: evaluation.recommended_focus,
                        readiness_score: evaluation.overall_score,
                        updated_at: new Date().toISOString()
                    }).eq('id', currentProgress.id)
                }

                result = {
                    ...evaluation,
                    message: `Score: ${evaluation.overall_score}%. ${evaluation.ready_for_interview ? '✅ Interview ready!' : '📚 Keep practicing!'}`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 7. GENERATE FLASHCARDS - Auto-create review cards
            // Model: gpt-4.1-nano (fast, cheap for bulk generation)
            // ═══════════════════════════════════════════════════════════════
            case 'generate_flashcards': {
                const { topics, count_per_topic = 5, difficulty = 'medium' } = data

                const completion = await openai.chat.completions.create({
                    model: MODELS.FAST_ALT,
                    messages: [
                        {
                            role: 'system',
                            content: 'Generate concise, effective flashcards for interview preparation. Questions should be clear, answers should be complete but brief.'
                        },
                        {
                            role: 'user',
                            content: `Generate ${count_per_topic} flashcards for each topic: ${topics.join(', ')}
Difficulty: ${difficulty}

Return JSON:
{
  "flashcards": [{
    "topic": string,
    "category": "technical|behavioral|domain",
    "question": string,
    "answer": string,
    "difficulty": "${difficulty}",
    "tip": string
  }]
}`
                        }
                    ],
                    max_tokens: 2000,
                    response_format: { type: 'json_object' },
                })

                const generated = JSON.parse(completion.choices[0].message.content || '{}')

                // Insert flashcards
                const flashcardsToInsert = (generated.flashcards || []).map((f: any) => ({
                    user_id,
                    profile_id,
                    topic: f.topic,
                    category: f.category,
                    question: f.question,
                    answer: f.answer,
                    difficulty: f.difficulty,
                    next_review: new Date().toISOString()
                }))

                await supabase.from('flashcards').insert(flashcardsToInsert)

                result = {
                    flashcards: generated.flashcards,
                    count: generated.flashcards?.length || 0,
                    message: `Created ${generated.flashcards?.length || 0} flashcards for ${topics.length} topics`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 8. GET DUE FLASHCARDS - Retrieve cards for review
            // ═══════════════════════════════════════════════════════════════
            case 'get_due_flashcards': {
                const { limit = 20 } = data

                const { data: dueCards } = await supabase
                    .from('flashcards')
                    .select('*')
                    .eq('user_id', user_id)
                    .lte('next_review', new Date().toISOString())
                    .order('next_review', { ascending: true })
                    .limit(limit)

                result = {
                    flashcards: dueCards || [],
                    count: dueCards?.length || 0,
                    message: `${dueCards?.length || 0} flashcards due for review`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 9. REVIEW FLASHCARD - Update with SM-2 algorithm
            // ═══════════════════════════════════════════════════════════════
            case 'review_flashcard': {
                const { flashcard_id, quality } = data // quality: 0-5 (0=forgot, 5=perfect)

                await supabase.rpc('update_flashcard_review', {
                    p_flashcard_id: flashcard_id,
                    p_quality: quality
                })

                // Update progress
                await supabase.from('placement_progress')
                    .update({
                        total_flashcards_reviewed: supabase.raw('total_flashcards_reviewed + 1'),
                        last_study_date: new Date().toISOString().split('T')[0],
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user_id)

                result = { success: true, message: 'Flashcard reviewed' }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 10. CONCEPT EXPLAIN - Quick explanations
            // Model: gpt-5-nano (cheap, fast)
            // ═══════════════════════════════════════════════════════════════
            case 'concept_explain': {
                const { concept, depth = 'brief' } = data

                const completion = await openai.chat.completions.create({
                    model: MODELS.FAST,
                    messages: [
                        {
                            role: 'system',
                            content: `Explain technical concepts clearly for interview prep. Be ${depth === 'deep' ? 'thorough with examples' : 'concise and clear'}.`
                        },
                        {
                            role: 'user',
                            content: `Explain: "${concept}"

Return JSON:
{
  "concept": string,
  "explanation": string,
  "key_points": [string],
  "example": string,
  "interview_tip": string,
  "related_concepts": [string],
  "common_questions": [string]
}`
                        }
                    ],
                    max_tokens: 800,
                    response_format: { type: 'json_object' },
                })

                result = JSON.parse(completion.choices[0].message.content || '{}')
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 11. RESUME REVIEW - AI-powered resume analysis
            // Model: gpt-5.1 (quality feedback)
            // ═══════════════════════════════════════════════════════════════
            case 'resume_review': {
                const { resume_text } = data

                const { data: profile } = await supabase
                    .from('placement_profiles')
                    .select('target_role, target_company, required_skills')
                    .eq('id', profile_id)
                    .single()

                const completion = await openai.chat.completions.create({
                    model: MODELS.DEEP_RESEARCH,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert resume reviewer who helps candidates optimize their resumes for ATS systems and human reviewers. Provide specific, actionable feedback.'
                        },
                        {
                            role: 'user',
                            content: `Review this resume for the role: ${profile?.target_role}
Target company: ${profile?.target_company || 'Not specified'}
Required skills: ${profile?.required_skills?.map((s: any) => s.name).join(', ')}

Resume:
${resume_text}

Return JSON:
{
  "overall_score": 0-100,
  "ats_score": 0-100,
  "strengths": [string],
  "weaknesses": [string],
  "missing_keywords": [string],
  "suggestions": [{
    "section": string,
    "issue": string,
    "suggestion": string,
    "priority": "high|medium|low"
  }],
  "rewritten_summary": string,
  "rewritten_bullets": [{ "original": string, "improved": string }],
  "formatting_tips": [string],
  "action_verbs_to_add": [string]
}`
                        }
                    ],
                    max_tokens: 2000,
                    response_format: { type: 'json_object' },
                })

                result = JSON.parse(completion.choices[0].message.content || '{}')
                result.message = `Resume score: ${result.overall_score}%. ATS compatibility: ${result.ats_score}%`
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 12. SALARY NEGOTIATE - Negotiation strategy
            // Model: o3 (reasoning for strategy)
            // ═══════════════════════════════════════════════════════════════
            case 'salary_negotiate': {
                const { offered_salary, target_salary, role, company, competing_offers } = data

                const completion = await openai.chat.completions.create({
                    model: MODELS.REASONING,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a salary negotiation expert. Provide strategic, data-backed negotiation advice.'
                        },
                        {
                            role: 'user',
                            content: `Help negotiate salary:
Role: ${role}
Company: ${company}
Offered: $${offered_salary}
Target: $${target_salary}
Competing offers: ${competing_offers || 'None disclosed'}

Return JSON:
{
  "market_analysis": { "low": number, "median": number, "high": number },
  "offer_assessment": "below_market|at_market|above_market",
  "negotiation_strategy": string,
  "talking_points": [string],
  "counter_offer_script": string,
  "what_to_say": [{ "scenario": string, "response": string }],
  "non_salary_items": [{ "item": string, "typical_value": string }],
  "red_flags": [string],
  "walkaway_point": string,
  "success_probability": number
}`
                        }
                    ],
                    max_tokens: 1500,
                    response_format: { type: 'json_object' },
                })

                result = JSON.parse(completion.choices[0].message.content || '{}')
                result.message = `Strategy ready. ${result.offer_assessment === 'below_market' ? '⚠️ Offer is below market - negotiate!' : '✅ Offer is competitive'}`
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 13. TEXT TO SPEECH - Generate audio for questions
            // Model: TTS-1
            // ═══════════════════════════════════════════════════════════════
            case 'text_to_speech': {
                const { text, voice = 'alloy' } = data

                const ttsResponse = await openai.audio.speech.create({
                    model: MODELS.TTS,
                    voice: voice,
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

            // ═══════════════════════════════════════════════════════════════
            // 14. GET PROGRESS - Retrieve user's overall progress
            // ═══════════════════════════════════════════════════════════════
            case 'get_progress': {
                const { data: progress } = await supabase
                    .from('placement_progress')
                    .select('*')
                    .eq('user_id', user_id)
                    .eq('profile_id', profile_id)
                    .single()

                const { data: profile } = await supabase
                    .from('placement_profiles')
                    .select('*')
                    .eq('id', profile_id)
                    .single()

                const { data: recentInterviews } = await supabase
                    .from('interview_sessions')
                    .select('overall_score, created_at')
                    .eq('profile_id', profile_id)
                    .order('created_at', { ascending: false })
                    .limit(10)

                const { count: flashcardsDue } = await supabase
                    .from('flashcards')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user_id)
                    .lte('next_review', new Date().toISOString())

                result = {
                    profile,
                    progress: progress || { readiness_score: 0, total_interviews: 0 },
                    recent_scores: recentInterviews?.map(i => i.overall_score) || [],
                    flashcards_due: flashcardsDue || 0,
                    days_until_interview: profile?.interview_date
                        ? Math.ceil((new Date(profile.interview_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null
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
        console.error('Placement agent v2 error:', error)
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
