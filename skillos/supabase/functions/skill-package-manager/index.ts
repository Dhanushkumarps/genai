// Skill Package Manager - npm for Your Brain
// Track skills like packages with dependencies, versions, and upgrade paths

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SkillRequest {
    action: string
    user_id: string
    data: Record<string, any>
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, user_id, data }: SkillRequest = await req.json()

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
            // 1. GET MY SKILLS - Current skill tree
            // ═══════════════════════════════════════════════════════════════
            case 'get_my_skills': {
                const { data: skills } = await supabase
                    .from('user_skills')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('version', { ascending: false })

                // Check for decay
                const now = new Date()
                const skillsWithDecay = (skills || []).map(skill => {
                    const daysSincePractice = Math.floor(
                        (now.getTime() - new Date(skill.last_practiced).getTime()) / (1000 * 60 * 60 * 24)
                    )
                    const decayAmount = daysSincePractice * skill.decay_rate
                    const effectiveVersion = Math.max(0, skill.version - decayAmount)

                    return {
                        ...skill,
                        days_since_practice: daysSincePractice,
                        decay_amount: Math.round(decayAmount * 10) / 10,
                        effective_version: Math.round(effectiveVersion * 10) / 10,
                        needs_practice: decayAmount > 5,
                        status: decayAmount > 10 ? 'decaying' : decayAmount > 5 ? 'stale' : 'fresh'
                    }
                })

                const totalSkills = skillsWithDecay.length
                const avgVersion = totalSkills > 0
                    ? Math.round(skillsWithDecay.reduce((s, sk) => s + sk.effective_version, 0) / totalSkills)
                    : 0

                result = {
                    skills: skillsWithDecay,
                    total_skills: totalSkills,
                    avg_proficiency: avgVersion,
                    decaying_count: skillsWithDecay.filter(s => s.status === 'decaying').length,
                    message: `${totalSkills} installed skills (avg v${avgVersion})`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 2. INSTALL SKILL - Add new skill to track
            // ═══════════════════════════════════════════════════════════════
            case 'install_skill': {
                const { skill_name, initial_version = 10, category } = data

                // Check if skill exists in registry
                const { data: registrySkill } = await supabase
                    .from('skill_registry')
                    .select('*')
                    .ilike('skill_name', skill_name)
                    .single()

                // Check prerequisites
                if (registrySkill?.prerequisites?.length > 0) {
                    const { data: userSkills } = await supabase
                        .from('user_skills')
                        .select('skill_name, version')
                        .eq('user_id', user_id)

                    const userSkillMap = new Map((userSkills || []).map(s => [s.skill_name.toLowerCase(), s.version]))

                    const missingPrereqs = registrySkill.prerequisites.filter((prereq: any) => {
                        const userVersion = userSkillMap.get(prereq.skill.toLowerCase()) || 0
                        return userVersion < prereq.min_version
                    })

                    if (missingPrereqs.length > 0) {
                        result = {
                            success: false,
                            missing_prerequisites: missingPrereqs,
                            message: `⚠️ Missing prerequisites: ${missingPrereqs.map((p: any) => `${p.skill} (need v${p.min_version}+)`).join(', ')}`
                        }
                        break
                    }
                }

                // Install skill
                const { data: skill, error } = await supabase
                    .from('user_skills')
                    .upsert({
                        user_id,
                        skill_name: registrySkill?.skill_name || skill_name,
                        skill_category: category || registrySkill?.category || 'general',
                        version: initial_version,
                        dependencies: registrySkill?.prerequisites || [],
                        related_skills: registrySkill?.peer_skills || []
                    }, { onConflict: 'user_id,skill_name' })
                    .select()
                    .single()

                if (error) throw error

                result = {
                    skill,
                    installed: true,
                    peer_skills: registrySkill?.peer_skills || [],
                    message: `📦 Installed ${skill_name} v${initial_version}`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 3. UPGRADE SKILL - Increase version after practice
            // ═══════════════════════════════════════════════════════════════
            case 'upgrade_skill': {
                const { skill_name, points = 5, activity } = data

                const { data: skill } = await supabase
                    .from('user_skills')
                    .select('*')
                    .eq('user_id', user_id)
                    .ilike('skill_name', skill_name)
                    .single()

                if (!skill) {
                    result = { success: false, message: 'Skill not installed' }
                    break
                }

                const newVersion = Math.min(100, skill.version + points)
                const leveledUp = Math.floor(newVersion / 10) > Math.floor(skill.version / 10)

                await supabase
                    .from('user_skills')
                    .update({
                        version: newVersion,
                        last_practiced: new Date().toISOString(),
                        practice_count: skill.practice_count + 1
                    })
                    .eq('id', skill.id)

                result = {
                    skill_name,
                    old_version: skill.version,
                    new_version: newVersion,
                    points_gained: points,
                    leveled_up: leveledUp,
                    message: leveledUp
                        ? `🎉 ${skill_name} leveled up to v${Math.round(newVersion)}!`
                        : `📈 ${skill_name} upgraded to v${Math.round(newVersion * 10) / 10}`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 4. CHECK PREREQUISITES - What's needed before learning X
            // ═══════════════════════════════════════════════════════════════
            case 'check_prerequisites': {
                const { target_skill } = data

                const { data: registrySkill } = await supabase
                    .from('skill_registry')
                    .select('*')
                    .ilike('skill_name', target_skill)
                    .single()

                if (!registrySkill) {
                    // Generate prerequisites using AI
                    const completion = await openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: 'Determine prerequisites for learning a skill. Be practical and specific.'
                            },
                            {
                                role: 'user',
                                content: `What are the prerequisites for learning "${target_skill}"?

Return JSON:
{
  "skill_name": "${target_skill}",
  "category": "string",
  "prerequisites": [{ "skill": "string", "min_version": number, "why": "string" }],
  "peer_skills": ["string"],
  "estimated_hours": number,
  "difficulty": "beginner|intermediate|advanced|expert"
}`
                            }
                        ],
                        max_tokens: 400,
                        response_format: { type: 'json_object' }
                    })

                    result = JSON.parse(completion.choices[0].message.content || '{}')
                } else {
                    const { data: userSkills } = await supabase
                        .from('user_skills')
                        .select('skill_name, version')
                        .eq('user_id', user_id)

                    const userSkillMap = new Map((userSkills || []).map(s => [s.skill_name.toLowerCase(), s.version]))

                    const prereqStatus = (registrySkill.prerequisites || []).map((prereq: any) => {
                        const userVersion = userSkillMap.get(prereq.skill.toLowerCase()) || 0
                        return {
                            ...prereq,
                            user_version: userVersion,
                            met: userVersion >= prereq.min_version,
                            gap: Math.max(0, prereq.min_version - userVersion)
                        }
                    })

                    result = {
                        ...registrySkill,
                        prerequisites_status: prereqStatus,
                        ready_to_learn: prereqStatus.every((p: any) => p.met),
                        message: prereqStatus.every((p: any) => p.met)
                            ? `✅ Ready to learn ${target_skill}!`
                            : `Need to upgrade: ${prereqStatus.filter((p: any) => !p.met).map((p: any) => p.skill).join(', ')}`
                    }
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 5. CALCULATE UPGRADE PATH - Optimal learning sequence
            // ═══════════════════════════════════════════════════════════════
            case 'calculate_upgrade_path': {
                const { target_skill, target_version = 70 } = data

                const { data: userSkills } = await supabase
                    .from('user_skills')
                    .select('*')
                    .eq('user_id', user_id)

                const { data: registrySkills } = await supabase
                    .from('skill_registry')
                    .select('*')

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Create optimal learning path considering current skills and dependencies.'
                        },
                        {
                            role: 'user',
                            content: `Create learning path to reach ${target_skill} v${target_version}.

User's current skills:
${JSON.stringify(userSkills)}

Available skill definitions:
${JSON.stringify(registrySkills)}

Return JSON:
{
  "path": [{
    "step": number,
    "skill": "string",
    "current_version": number,
    "target_version": number,
    "estimated_hours": number,
    "reason": "string"
  }],
  "total_hours": number,
  "critical_path": ["skill names that must be done in order"],
  "quick_wins": ["skills that can be done anytime for quick progress"],
  "bottleneck": "string - hardest part of the path"
}`
                        }
                    ],
                    max_tokens: 800,
                    response_format: { type: 'json_object' }
                })

                result = JSON.parse(completion.choices[0].message.content || '{}')
                result.message = `${result.path?.length || 0} steps to reach ${target_skill} v${target_version}`
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 6. SUGGEST PEER SKILLS - What to learn together
            // ═══════════════════════════════════════════════════════════════
            case 'suggest_peer_skills': {
                const { data: userSkills } = await supabase
                    .from('user_skills')
                    .select('skill_name, version, related_skills')
                    .eq('user_id', user_id)
                    .order('version', { ascending: false })
                    .limit(5)

                const allPeers = new Set<string>()
                const userSkillNames = new Set((userSkills || []).map(s => s.skill_name.toLowerCase()))

                for (const skill of userSkills || []) {
                    for (const peer of skill.related_skills || []) {
                        if (!userSkillNames.has(peer.toLowerCase())) {
                            allPeers.add(peer)
                        }
                    }
                }

                const suggestions = Array.from(allPeers).slice(0, 5)

                result = {
                    suggestions,
                    based_on: (userSkills || []).map(s => s.skill_name),
                    message: suggestions.length > 0
                        ? `Consider learning: ${suggestions.join(', ')}`
                        : 'No peer skill suggestions available'
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 7. DETECT SKILL DECAY - Find skills that need practice
            // ═══════════════════════════════════════════════════════════════
            case 'detect_skill_decay': {
                const { threshold_days = 30 } = data
                const thresholdDate = new Date(Date.now() - threshold_days * 24 * 60 * 60 * 1000).toISOString()

                const { data: staleSkills } = await supabase
                    .from('user_skills')
                    .select('*')
                    .eq('user_id', user_id)
                    .lt('last_practiced', thresholdDate)
                    .gt('version', 20) // Only warn about skills we care about
                    .order('version', { ascending: false })

                const decayingSkills = (staleSkills || []).map(skill => {
                    const daysSince = Math.floor(
                        (Date.now() - new Date(skill.last_practiced).getTime()) / (1000 * 60 * 60 * 24)
                    )
                    const decayAmount = daysSince * skill.decay_rate
                    return {
                        ...skill,
                        days_since_practice: daysSince,
                        decay_amount: Math.round(decayAmount * 10) / 10,
                        urgency: decayAmount > 20 ? 'critical' : decayAmount > 10 ? 'high' : 'medium'
                    }
                })

                result = {
                    decaying_skills: decayingSkills,
                    count: decayingSkills.length,
                    critical_count: decayingSkills.filter(s => s.urgency === 'critical').length,
                    message: decayingSkills.length > 0
                        ? `⚠️ ${decayingSkills.length} skills need practice!`
                        : '✅ All skills are fresh'
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 8. GET SKILL REGISTRY - Browse available skills
            // ═══════════════════════════════════════════════════════════════
            case 'get_skill_registry': {
                const { category } = data

                let query = supabase
                    .from('skill_registry')
                    .select('*')
                    .eq('is_deprecated', false)
                    .order('skill_name')

                if (category) {
                    query = query.eq('category', category)
                }

                const { data: registry } = await query

                const categories = [...new Set((registry || []).map(s => s.category))]

                result = {
                    skills: registry || [],
                    categories,
                    count: registry?.length || 0
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
        console.error('Skill Package Manager error:', error)
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
