// Skill Profiler Edge Function
// Complex AI-powered skill assessment and personalized learning path generation

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Skill taxonomy with detailed competency frameworks
const SKILL_TAXONOMY = {
    software_engineering: {
        core: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust'],
        frameworks: ['React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Django', 'FastAPI'],
        databases: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch'],
        practices: ['Clean Code', 'TDD', 'Code Review', 'Documentation'],
        architecture: ['Microservices', 'Monolith', 'Event-Driven', 'Serverless'],
    },
    data_science: {
        fundamentals: ['Statistics', 'Linear Algebra', 'Probability', 'Calculus'],
        programming: ['Python', 'R', 'SQL', 'Pandas', 'NumPy'],
        ml: ['Supervised Learning', 'Unsupervised Learning', 'Deep Learning', 'NLP'],
        tools: ['Jupyter', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'MLflow'],
        visualization: ['Matplotlib', 'Seaborn', 'Plotly', 'Tableau', 'D3.js'],
    },
    product_management: {
        discovery: ['User Research', 'Market Analysis', 'Competitive Analysis', 'Jobs-to-be-Done'],
        strategy: ['Product Vision', 'Roadmapping', 'OKRs', 'Prioritization Frameworks'],
        execution: ['Agile', 'Scrum', 'Kanban', 'Sprint Planning', 'Stakeholder Management'],
        analytics: ['A/B Testing', 'Funnel Analysis', 'Retention Metrics', 'LTV/CAC'],
        tools: ['Jira', 'Notion', 'Figma', 'Amplitude', 'Mixpanel'],
    },
    ai_ml: {
        theory: ['Neural Networks', 'Backpropagation', 'Optimization', 'Regularization'],
        nlp: ['Transformers', 'BERT', 'GPT', 'RAG', 'Fine-tuning', 'Prompt Engineering'],
        cv: ['CNNs', 'Object Detection', 'Image Segmentation', 'GANs'],
        production: ['Model Deployment', 'MLOps', 'Model Monitoring', 'A/B Testing'],
        frameworks: ['PyTorch', 'TensorFlow', 'Hugging Face', 'LangChain', 'OpenAI API'],
    },
}

// Career level definitions
const CAREER_LEVELS = {
    beginner: { minYears: 0, maxYears: 1, expectedSkills: 3 },
    intermediate: { minYears: 1, maxYears: 3, expectedSkills: 6 },
    advanced: { minYears: 3, maxYears: 7, expectedSkills: 10 },
    expert: { minYears: 7, maxYears: 20, expectedSkills: 15 },
}

// Learning style preferences
const LEARNING_STYLES = {
    visual: ['video courses', 'diagrams', 'infographics', 'demos'],
    reading: ['documentation', 'books', 'articles', 'written tutorials'],
    hands_on: ['projects', 'coding exercises', 'labs', 'challenges'],
    social: ['pair programming', 'study groups', 'mentorship', 'conferences'],
}

interface ProfileRequest {
    action: 'analyze_profile' | 'generate_path' | 'assess_skills' | 'parse_goals' | 'get_recommendations'
    userId?: string
    careerDomains?: string[]
    learningGoals?: string
    skillAssessments?: Array<{ skill: string; level: number; category: string }>
    hoursPerWeek?: number
    preferredTimes?: string[]
    voiceTranscript?: string
}

interface SkillGap {
    skill: string
    currentLevel: number
    targetLevel: number
    gap: number
    priority: 'critical' | 'high' | 'medium' | 'low'
    estimatedHours: number
}

interface LearningMilestone {
    id: number
    title: string
    description: string
    skills: string[]
    estimatedWeeks: number
    resources: Array<{ type: string; name: string; url?: string }>
    projects: string[]
    assessmentCriteria: string[]
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
        const body: ProfileRequest = await req.json()

        switch (body.action) {
            case 'analyze_profile':
                return await analyzeUserProfile(supabase, body, openaiKey)

            case 'generate_path':
                return await generateLearningPath(supabase, body, openaiKey)

            case 'assess_skills':
                return await assessSkillLevels(supabase, body)

            case 'parse_goals':
                return await parseNaturalLanguageGoals(body, openaiKey)

            case 'get_recommendations':
                return await getRecommendations(supabase, body, openaiKey)

            default:
                throw new Error(`Unknown action: ${body.action}`)
        }

    } catch (error) {
        console.error('Skill Profiler Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// Analyze user profile and generate comprehensive skill assessment
async function analyzeUserProfile(
    supabase: ReturnType<typeof createClient>,
    body: ProfileRequest,
    openaiKey?: string
) {
    const { userId, careerDomains, learningGoals, skillAssessments, hoursPerWeek, preferredTimes } = body

    // Calculate skill gaps
    const skillGaps = calculateSkillGaps(careerDomains || [], skillAssessments || [])

    // Determine career level based on self-assessment
    const avgSkillLevel = skillAssessments?.length
        ? skillAssessments.reduce((sum, s) => sum + s.level, 0) / skillAssessments.length
        : 3
    const careerLevel = determineCareerLevel(avgSkillLevel)

    // Generate AI analysis if OpenAI key available
    let aiAnalysis = null
    if (openaiKey && learningGoals) {
        aiAnalysis = await generateAIProfileAnalysis({
            careerDomains: careerDomains || [],
            learningGoals,
            skillGaps,
            careerLevel,
            hoursPerWeek: hoursPerWeek || 10,
        }, openaiKey)
    }

    // Calculate recommended focus areas
    const focusAreas = prioritizeFocusAreas(skillGaps, careerDomains || [])

    // Store profile in database
    if (userId) {
        await supabase.from('user_skill_profiles').upsert({
            user_id: userId,
            career_domains: careerDomains,
            learning_goals: learningGoals,
            learning_goals_parsed: aiAnalysis?.parsedGoals || {},
            hours_per_week: hoursPerWeek,
            preferred_times: preferredTimes,
            ai_profile_summary: aiAnalysis?.summary,
            ai_recommended_focus_areas: focusAreas,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        // Store skill assessments
        if (skillAssessments?.length) {
            for (const assessment of skillAssessments) {
                await supabase.from('skill_assessments').upsert({
                    user_id: userId,
                    category: assessment.category,
                    skill_name: assessment.skill,
                    current_level: assessment.level,
                    target_level: Math.min(10, assessment.level + 3),
                    confidence: 'medium',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id,category,skill_name' })
            }
        }
    }

    return new Response(
        JSON.stringify({
            success: true,
            data: {
                skillGaps,
                careerLevel,
                focusAreas,
                aiAnalysis,
                estimatedTimeToGoal: calculateTimeToGoal(skillGaps, hoursPerWeek || 10),
            }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

// Generate personalized learning path with AI
async function generateLearningPath(
    supabase: ReturnType<typeof createClient>,
    body: ProfileRequest,
    openaiKey?: string
) {
    const { userId, careerDomains } = body

    // Get user profile
    const { data: profile } = await supabase
        .from('user_skill_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

    // Get skill assessments
    const { data: assessments } = await supabase
        .from('skill_assessments')
        .select('*')
        .eq('user_id', userId)

    // Calculate skill gaps
    const skillGaps = calculateSkillGaps(
        profile?.career_domains || careerDomains || [],
        assessments?.map(a => ({ skill: a.skill_name, level: a.current_level, category: a.category })) || []
    )

    // Generate milestones
    const milestones = generateMilestones(skillGaps, profile?.hours_per_week || 10)

    // Enhance with AI if available
    let aiEnhancedPath = null
    if (openaiKey && profile?.learning_goals) {
        aiEnhancedPath = await enhancePathWithAI({
            milestones,
            learningGoals: profile.learning_goals,
            careerDomains: profile.career_domains,
            hoursPerWeek: profile.hours_per_week,
        }, openaiKey)
    }

    // Store learning path
    const pathData = {
        user_id: userId,
        title: `${(profile?.career_domains || ['General'])[0]} Mastery Path`,
        description: aiEnhancedPath?.description || `Personalized learning path to master ${(profile?.career_domains || []).join(', ')}`,
        difficulty: determineDifficulty(skillGaps),
        milestones: aiEnhancedPath?.milestones || milestones,
        estimated_weeks: milestones.reduce((sum, m) => sum + m.estimatedWeeks, 0),
        ai_model_used: openaiKey ? 'gpt-4o-mini' : 'rule-based',
        ai_confidence_score: aiEnhancedPath?.confidence || 0.7,
        status: 'active',
    }

    const { data: path, error } = await supabase
        .from('learning_paths')
        .insert(pathData)
        .select()
        .single()

    if (error) throw error

    return new Response(
        JSON.stringify({
            success: true,
            data: {
                path,
                summary: {
                    totalWeeks: pathData.estimated_weeks,
                    totalMilestones: milestones.length,
                    primarySkills: skillGaps.slice(0, 5).map(g => g.skill),
                }
            }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

// Parse natural language goals using AI
async function parseNaturalLanguageGoals(body: ProfileRequest, openaiKey?: string) {
    const { learningGoals, voiceTranscript } = body
    const text = voiceTranscript || learningGoals || ''

    if (!text) {
        return new Response(
            JSON.stringify({ success: false, error: 'No goals provided' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    let parsedGoals = {
        shortTermGoals: [] as string[],
        longTermGoals: [] as string[],
        targetRoles: [] as string[],
        specificSkills: [] as string[],
        timeframe: '6 months',
        motivation: '',
    }

    if (openaiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                        content: `You are an expert career counselor and learning path designer. 
            Parse the user's learning goals and extract structured information.
            Return JSON with: shortTermGoals (array), longTermGoals (array), targetRoles (array), 
            specificSkills (array), timeframe (string), motivation (string).
            Be specific and actionable. If goals are vague, interpret them intelligently.`
                    },
                    { role: 'user', content: text }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
            }),
        })

        const result = await response.json()
        if (result.choices?.[0]?.message?.content) {
            try {
                parsedGoals = JSON.parse(result.choices[0].message.content)
            } catch (e) {
                console.error('Failed to parse AI response:', e)
            }
        }
    } else {
        // Rule-based parsing fallback
        parsedGoals = ruleBasedGoalParsing(text)
    }

    return new Response(
        JSON.stringify({ success: true, data: parsedGoals }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

// Get personalized recommendations
async function getRecommendations(
    supabase: ReturnType<typeof createClient>,
    body: ProfileRequest,
    openaiKey?: string
) {
    const { userId } = body

    // Get user profile and assessments
    const { data: profile } = await supabase
        .from('user_skill_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

    const { data: assessments } = await supabase
        .from('skill_assessments')
        .select('*')
        .eq('user_id', userId)

    // Generate recommendations based on profile
    const recommendations = {
        dailyFocus: getDailyFocusRecommendation(assessments || [], profile?.preferred_times || []),
        weeklyGoals: getWeeklyGoals(assessments || [], profile?.hours_per_week || 10),
        resources: getResourceRecommendations(profile?.career_domains || []),
        challenges: getChallengeRecommendations(assessments || []),
        streakSuggestions: getStreakSuggestions(),
    }

    return new Response(
        JSON.stringify({ success: true, data: recommendations }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

// Assess skill levels based on various inputs
async function assessSkillLevels(
    supabase: ReturnType<typeof createClient>,
    body: ProfileRequest
) {
    const { skillAssessments } = body

    const enhancedAssessments = (skillAssessments || []).map(assessment => {
        const taxonomy = Object.values(SKILL_TAXONOMY).flat()
        const isKnownSkill = Object.values(SKILL_TAXONOMY).some(domain =>
            Object.values(domain).flat().includes(assessment.skill)
        )

        return {
            ...assessment,
            isRecognized: isKnownSkill,
            benchmarkLevel: isKnownSkill ? getSkillBenchmark(assessment.skill) : null,
            gap: isKnownSkill ? assessment.level - getSkillBenchmark(assessment.skill) : 0,
            relatedSkills: getRelatedSkills(assessment.skill),
        }
    })

    return new Response(
        JSON.stringify({ success: true, data: enhancedAssessments }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}

// Helper functions
function calculateSkillGaps(domains: string[], assessments: Array<{ skill: string; level: number; category: string }>): SkillGap[] {
    const gaps: SkillGap[] = []
    const assessmentMap = new Map(assessments.map(a => [a.skill.toLowerCase(), a.level]))

    for (const domain of domains) {
        const taxonomy = SKILL_TAXONOMY[domain as keyof typeof SKILL_TAXONOMY]
        if (!taxonomy) continue

        for (const [category, skills] of Object.entries(taxonomy)) {
            for (const skill of skills) {
                const currentLevel = assessmentMap.get(skill.toLowerCase()) || 1
                const targetLevel = getTargetLevel(domain, category)
                const gap = targetLevel - currentLevel

                if (gap > 0) {
                    gaps.push({
                        skill,
                        currentLevel,
                        targetLevel,
                        gap,
                        priority: gap >= 5 ? 'critical' : gap >= 3 ? 'high' : gap >= 2 ? 'medium' : 'low',
                        estimatedHours: gap * 20, // Rough estimate: 20 hours per skill level
                    })
                }
            }
        }
    }

    return gaps.sort((a, b) => b.gap - a.gap)
}

function determineCareerLevel(avgSkillLevel: number): string {
    if (avgSkillLevel <= 3) return 'beginner'
    if (avgSkillLevel <= 5) return 'intermediate'
    if (avgSkillLevel <= 7) return 'advanced'
    return 'expert'
}

function prioritizeFocusAreas(gaps: SkillGap[], domains: string[]): Array<{ area: string; skills: string[]; priority: string }> {
    const areaMap = new Map<string, { skills: string[]; totalGap: number }>()

    for (const gap of gaps) {
        for (const domain of domains) {
            const taxonomy = SKILL_TAXONOMY[domain as keyof typeof SKILL_TAXONOMY]
            if (!taxonomy) continue

            for (const [category, skills] of Object.entries(taxonomy)) {
                if (skills.includes(gap.skill)) {
                    const key = `${domain}:${category}`
                    const existing = areaMap.get(key) || { skills: [], totalGap: 0 }
                    existing.skills.push(gap.skill)
                    existing.totalGap += gap.gap
                    areaMap.set(key, existing)
                }
            }
        }
    }

    return Array.from(areaMap.entries())
        .map(([key, value]) => ({
            area: key.split(':')[1],
            skills: value.skills,
            priority: value.totalGap >= 15 ? 'critical' : value.totalGap >= 10 ? 'high' : 'medium',
        }))
        .sort((a, b) => b.skills.length - a.skills.length)
        .slice(0, 5)
}

function generateMilestones(gaps: SkillGap[], hoursPerWeek: number): LearningMilestone[] {
    const milestones: LearningMilestone[] = []
    const criticalGaps = gaps.filter(g => g.priority === 'critical' || g.priority === 'high')

    for (let i = 0; i < Math.min(6, criticalGaps.length); i++) {
        const gap = criticalGaps[i]
        const estimatedWeeks = Math.ceil(gap.estimatedHours / hoursPerWeek)

        milestones.push({
            id: i + 1,
            title: `Master ${gap.skill}`,
            description: `Build proficiency in ${gap.skill} from level ${gap.currentLevel} to ${gap.targetLevel}`,
            skills: [gap.skill, ...getRelatedSkills(gap.skill).slice(0, 2)],
            estimatedWeeks,
            resources: [
                { type: 'course', name: `${gap.skill} Fundamentals` },
                { type: 'documentation', name: `Official ${gap.skill} Docs` },
                { type: 'project', name: `Build a ${gap.skill} Project` },
            ],
            projects: [`Create a portfolio project using ${gap.skill}`],
            assessmentCriteria: [
                `Complete 3 exercises using ${gap.skill}`,
                `Build one real-world project`,
                `Pass skill assessment quiz`,
            ],
        })
    }

    return milestones
}

function calculateTimeToGoal(gaps: SkillGap[], hoursPerWeek: number): string {
    const totalHours = gaps.reduce((sum, g) => sum + g.estimatedHours, 0)
    const weeks = Math.ceil(totalHours / hoursPerWeek)
    const months = Math.ceil(weeks / 4)
    return months <= 12 ? `${months} months` : `${Math.ceil(months / 12)} years`
}

function determineDifficulty(gaps: SkillGap[]): string {
    const avgGap = gaps.length ? gaps.reduce((sum, g) => sum + g.gap, 0) / gaps.length : 0
    if (avgGap <= 2) return 'beginner'
    if (avgGap <= 4) return 'intermediate'
    if (avgGap <= 6) return 'advanced'
    return 'expert'
}

function getTargetLevel(domain: string, category: string): number {
    const targetLevels: Record<string, number> = {
        core: 8, fundamentals: 8, theory: 7,
        frameworks: 7, programming: 7, tools: 6,
        practices: 7, execution: 7, production: 7,
        architecture: 6, strategy: 6, discovery: 6,
    }
    return targetLevels[category] || 7
}

function getSkillBenchmark(skill: string): number {
    // Industry benchmarks for common skills
    const benchmarks: Record<string, number> = {
        'JavaScript': 6, 'Python': 6, 'React': 6, 'Node.js': 6,
        'TypeScript': 5, 'SQL': 5, 'Git': 5,
        'Machine Learning': 5, 'Deep Learning': 4, 'Statistics': 5,
    }
    return benchmarks[skill] || 5
}

function getRelatedSkills(skill: string): string[] {
    const relations: Record<string, string[]> = {
        'JavaScript': ['TypeScript', 'Node.js', 'React'],
        'Python': ['NumPy', 'Pandas', 'Machine Learning'],
        'React': ['JavaScript', 'TypeScript', 'Next.js', 'Redux'],
        'Machine Learning': ['Python', 'Statistics', 'Deep Learning'],
        'Product Management': ['User Research', 'Agile', 'Analytics'],
    }
    return relations[skill] || []
}

function ruleBasedGoalParsing(text: string) {
    const lowerText = text.toLowerCase()

    return {
        shortTermGoals: lowerText.includes('learn') ? ['Learn foundational concepts'] : [],
        longTermGoals: lowerText.includes('career') || lowerText.includes('job') ? ['Advance career'] : [],
        targetRoles: extractRoles(lowerText),
        specificSkills: extractSkills(lowerText),
        timeframe: extractTimeframe(lowerText),
        motivation: text,
    }
}

function extractRoles(text: string): string[] {
    const roles = ['developer', 'engineer', 'designer', 'manager', 'analyst', 'scientist']
    return roles.filter(role => text.includes(role))
}

function extractSkills(text: string): string[] {
    const skills = ['javascript', 'python', 'react', 'machine learning', 'data science', 'design']
    return skills.filter(skill => text.includes(skill))
}

function extractTimeframe(text: string): string {
    if (text.includes('month')) return '1-3 months'
    if (text.includes('year')) return '1 year'
    return '6 months'
}

async function generateAIProfileAnalysis(data: any, openaiKey: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                    content: `You are an expert career advisor and learning path designer.
          Analyze the user's profile and provide personalized insights.
          Be encouraging but realistic. Focus on actionable advice.`
                },
                {
                    role: 'user',
                    content: `Analyze this learner profile:
          Career Domains: ${data.careerDomains.join(', ')}
          Goals: ${data.learningGoals}
          Current Level: ${data.careerLevel}
          Available Time: ${data.hoursPerWeek} hours/week
          Key Skill Gaps: ${data.skillGaps.slice(0, 5).map((g: SkillGap) => g.skill).join(', ')}`
                }
            ],
            temperature: 0.7,
        }),
    })

    const result = await response.json()
    return {
        summary: result.choices?.[0]?.message?.content || 'Profile analysis pending',
        parsedGoals: {},
        confidence: 0.85,
    }
}

async function enhancePathWithAI(data: any, openaiKey: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                    content: `You are an expert curriculum designer. Enhance the learning path with:
          1. Better milestone descriptions
          2. Specific resource recommendations
          3. Real-world project ideas
          Return JSON with: description, milestones (enhanced array), confidence (0-1)`
                },
                {
                    role: 'user',
                    content: JSON.stringify(data)
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        }),
    })

    const result = await response.json()
    try {
        return JSON.parse(result.choices?.[0]?.message?.content || '{}')
    } catch {
        return { milestones: data.milestones, confidence: 0.7 }
    }
}

function getDailyFocusRecommendation(assessments: any[], preferredTimes: string[]) {
    const lowestSkill = assessments.sort((a, b) => a.current_level - b.current_level)[0]
    const bestTime = preferredTimes[0] || 'morning'

    return {
        skill: lowestSkill?.skill_name || 'General Study',
        suggestedDuration: '45 minutes',
        bestTime,
        activity: 'focused practice',
    }
}

function getWeeklyGoals(assessments: any[], hoursPerWeek: number) {
    return {
        totalHours: hoursPerWeek,
        breakdown: [
            { activity: 'Learning new concepts', hours: Math.round(hoursPerWeek * 0.4) },
            { activity: 'Practice & projects', hours: Math.round(hoursPerWeek * 0.4) },
            { activity: 'Review & reflection', hours: Math.round(hoursPerWeek * 0.2) },
        ],
        targetSkills: assessments.slice(0, 3).map(a => a.skill_name),
    }
}

function getResourceRecommendations(domains: string[]) {
    const resources: Record<string, any[]> = {
        software_engineering: [
            { name: 'freeCodeCamp', type: 'platform', url: 'https://freecodecamp.org' },
            { name: 'LeetCode', type: 'practice', url: 'https://leetcode.com' },
        ],
        data_science: [
            { name: 'Kaggle', type: 'platform', url: 'https://kaggle.com' },
            { name: 'Fast.ai', type: 'course', url: 'https://fast.ai' },
        ],
        ai_ml: [
            { name: 'Hugging Face', type: 'platform', url: 'https://huggingface.co' },
            { name: 'DeepLearning.AI', type: 'course', url: 'https://deeplearning.ai' },
        ],
    }

    return domains.flatMap(d => resources[d] || [])
}

function getChallengeRecommendations(assessments: any[]) {
    return [
        { type: 'daily', title: 'Complete one coding challenge', xp: 10 },
        { type: 'weekly', title: 'Build a mini project', xp: 50 },
        { type: 'monthly', title: 'Contribute to open source', xp: 200 },
    ]
}

function getStreakSuggestions() {
    return {
        current: 0,
        target: 7,
        reward: 'Unlock new challenge theme',
        tips: [
            'Set a daily reminder',
            'Start with just 10 minutes',
            'Track your progress visually',
        ],
    }
}
