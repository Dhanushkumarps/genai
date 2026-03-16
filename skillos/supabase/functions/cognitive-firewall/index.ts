// Cognitive Firewall - Distraction Defense System
// AI-powered protection against productivity threats with root cause analysis

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FirewallRequest {
    action: string
    user_id: string
    data: Record<string, any>
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, user_id, data }: FirewallRequest = await req.json()

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
            // 1. LOG DISTRACTION - Record distraction event
            // ═══════════════════════════════════════════════════════════════
            case 'log_distraction': {
                const { type, source, context, duration_seconds, was_blocked, intervention } = data

                await supabase.from('distraction_events').insert({
                    user_id,
                    distraction_type: type,
                    distraction_source: source,
                    trigger_context: context,
                    duration_seconds,
                    was_blocked: was_blocked || false,
                    intervention_type: intervention || 'allowed'
                })

                // Check for patterns
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
                const { count } = await supabase
                    .from('distraction_events')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user_id)
                    .gt('created_at', oneHourAgo)

                const isHighFrequency = (count || 0) > 5

                result = {
                    logged: true,
                    distractions_last_hour: count || 0,
                    is_high_frequency: isHighFrequency,
                    message: isHighFrequency
                        ? `⚠️ ${count} distractions in the last hour. Consider focus mode.`
                        : 'Distraction logged'
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 2. ANALYZE PATTERNS - Understand distraction behavior
            // ═══════════════════════════════════════════════════════════════
            case 'analyze_patterns': {
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

                const { data: distractions } = await supabase
                    .from('distraction_events')
                    .select('*')
                    .eq('user_id', user_id)
                    .gt('created_at', sevenDaysAgo)
                    .order('created_at', { ascending: false })

                if (!distractions || distractions.length < 5) {
                    result = {
                        patterns: null,
                        message: 'Need more data to analyze patterns (min 5 events)'
                    }
                    break
                }

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `Analyze distraction patterns to identify root causes and suggest interventions.
                            
Look for:
- Time-based patterns (when do distractions happen?)
- Avoidance patterns (what tasks trigger distractions?)
- Source patterns (which sites/apps are most distracting?)
- Emotional patterns (stress, boredom, anxiety triggers)`
                        },
                        {
                            role: 'user',
                            content: `Analyze these distraction events:
${JSON.stringify(distractions)}

Return JSON:
{
  "top_sources": [{ "source": "string", "count": number, "total_time_mins": number }],
  "peak_distraction_hours": [number],
  "avoidance_triggers": [{ "task_type": "string", "correlation": "high|medium|low" }],
  "patterns": [{
    "pattern_type": "time_based|avoidance|emotional|source",
    "description": "string",
    "frequency": "daily|frequent|occasional",
    "root_cause": "string",
    "intervention": "string"
  }],
  "primary_vulnerability": "string - main weakness to address",
  "strength": "string - what user does well",
  "recommendations": [string],
  "threat_level": "low|medium|high|critical"
}`
                        }
                    ],
                    max_tokens: 1000,
                    response_format: { type: 'json_object' }
                })

                const patterns = JSON.parse(completion.choices[0].message.content || '{}')

                // Store patterns
                await supabase.from('distraction_patterns').upsert({
                    user_id,
                    pattern_type: 'weekly_analysis',
                    pattern_data: patterns,
                    frequency: distractions.length,
                    last_occurred: new Date().toISOString(),
                    root_cause: patterns.primary_vulnerability,
                    suggested_intervention: patterns.recommendations?.[0]
                }, { onConflict: 'user_id,pattern_type' })

                result = {
                    patterns,
                    events_analyzed: distractions.length,
                    message: `🛡️ Threat level: ${patterns.threat_level?.toUpperCase()}`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 3. CALCULATE THREAT SCORE - Real-time vulnerability
            // ═══════════════════════════════════════════════════════════════
            case 'calculate_threat_score': {
                const { current_task, time_of_day, energy_level, burnout_score } = data

                // Get recent distraction frequency
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
                const { count: recentDistractions } = await supabase
                    .from('distraction_events')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user_id)
                    .gt('created_at', oneHourAgo)

                // Get stored patterns
                const { data: patterns } = await supabase
                    .from('distraction_patterns')
                    .select('pattern_data')
                    .eq('user_id', user_id)
                    .single()

                let threatScore = 0
                const factors: string[] = []

                // Factor: Recent distraction frequency
                if ((recentDistractions || 0) > 3) {
                    threatScore += 25
                    factors.push('High recent distraction frequency')
                }

                // Factor: Low energy
                if (energy_level && energy_level < 30) {
                    threatScore += 20
                    factors.push('Low energy increases vulnerability')
                }

                // Factor: High burnout
                if (burnout_score && burnout_score > 50) {
                    threatScore += 25
                    factors.push('Burnout makes focus harder')
                }

                // Factor: Peak distraction time
                const hour = new Date().getHours()
                const peakHours = patterns?.pattern_data?.peak_distraction_hours || []
                if (peakHours.includes(hour)) {
                    threatScore += 20
                    factors.push(`${hour}:00 is historically a vulnerable time`)
                }

                // Factor: Difficult task
                if (current_task?.includes('complex') || current_task?.includes('boring')) {
                    threatScore += 10
                    factors.push('Task type increases distraction risk')
                }

                const threatLevel = threatScore >= 70 ? 'critical'
                    : threatScore >= 50 ? 'high'
                        : threatScore >= 30 ? 'medium'
                            : 'low'

                result = {
                    threat_score: Math.min(threatScore, 100),
                    threat_level: threatLevel,
                    factors,
                    recent_distractions: recentDistractions || 0,
                    recommendation: threatLevel === 'critical'
                        ? '🚨 Enable quarantine mode immediately!'
                        : threatLevel === 'high'
                            ? '⚠️ Consider enabling focus mode'
                            : '✅ Threat level manageable'
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 4. SUGGEST INTERVENTION - Context-aware defense
            // ═══════════════════════════════════════════════════════════════
            case 'suggest_intervention': {
                const { distraction_source, current_context, urgency } = data

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Suggest the most appropriate intervention for the distraction. Consider user context and be practical.'
                        },
                        {
                            role: 'user',
                            content: `User is trying to access: ${distraction_source}
Current task: ${current_context}
Urgency level: ${urgency || 'normal'}

Suggest intervention JSON:
{
  "intervention_type": "block|delay|breathing|allow|redirect",
  "message_to_user": "string - empathetic, not preachy",
  "delay_seconds": number | null,
  "breathing_exercise": boolean,
  "alternative_suggestion": "string - healthier alternative",
  "root_cause_guess": "string - why they might be distracted",
  "allow_anyway": boolean
}`
                        }
                    ],
                    max_tokens: 300,
                    response_format: { type: 'json_object' }
                })

                result = JSON.parse(completion.choices[0].message.content || '{}')
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 5. GENERATE DEFENSE REPORT - Weekly analysis
            // ═══════════════════════════════════════════════════════════════
            case 'generate_defense_report': {
                const { days = 7 } = data
                const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

                const { data: events } = await supabase
                    .from('distraction_events')
                    .select('*')
                    .eq('user_id', user_id)
                    .gt('created_at', since)

                if (!events || events.length === 0) {
                    result = { report: null, message: 'No distraction data for this period' }
                    break
                }

                const totalEvents = events.length
                const totalTimeLost = events.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 60
                const blockedCount = events.filter(e => e.was_blocked).length
                const blockRate = Math.round((blockedCount / totalEvents) * 100)

                // Group by source
                const sourceMap = new Map<string, number>()
                events.forEach(e => {
                    const source = e.distraction_source || 'unknown'
                    sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
                })
                const topSources = Array.from(sourceMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([source, count]) => ({ source, count }))

                // Group by hour
                const hourMap = new Map<number, number>()
                events.forEach(e => {
                    const hour = new Date(e.created_at).getHours()
                    hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
                })
                const peakHour = Array.from(hourMap.entries())
                    .sort((a, b) => b[1] - a[1])[0]

                result = {
                    report: {
                        period_days: days,
                        total_distractions: totalEvents,
                        time_lost_minutes: Math.round(totalTimeLost),
                        blocked_count: blockedCount,
                        block_rate: blockRate,
                        avg_per_day: Math.round((totalEvents / days) * 10) / 10,
                        top_sources: topSources,
                        peak_vulnerability_hour: peakHour ? peakHour[0] : null,
                        trend: totalEvents > 30 ? 'increasing' : totalEvents > 15 ? 'moderate' : 'controlled'
                    },
                    message: `📊 ${totalEvents} distractions | ${Math.round(totalTimeLost)} mins lost | ${blockRate}% blocked`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 6. ENABLE QUARANTINE MODE - Emergency lockdown
            // ═══════════════════════════════════════════════════════════════
            case 'enable_quarantine': {
                const { duration_minutes = 30, reason } = data

                // Store quarantine state (in practice, this would integrate with browser extension)
                await supabase.from('distraction_patterns').upsert({
                    user_id,
                    pattern_type: 'quarantine_mode',
                    pattern_data: {
                        enabled: true,
                        started_at: new Date().toISOString(),
                        duration_minutes,
                        reason,
                        ends_at: new Date(Date.now() + duration_minutes * 60 * 1000).toISOString()
                    },
                    last_occurred: new Date().toISOString()
                }, { onConflict: 'user_id,pattern_type' })

                result = {
                    enabled: true,
                    duration_minutes,
                    ends_at: new Date(Date.now() + duration_minutes * 60 * 1000).toISOString(),
                    message: `🔒 Quarantine mode enabled for ${duration_minutes} minutes. All distractions blocked.`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 7. GET FIREWALL STATUS - Current protection level
            // ═══════════════════════════════════════════════════════════════
            case 'get_status': {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

                // Recent distractions
                const { data: recentEvents, count } = await supabase
                    .from('distraction_events')
                    .select('*', { count: 'exact' })
                    .eq('user_id', user_id)
                    .gt('created_at', oneHourAgo)
                    .order('created_at', { ascending: false })
                    .limit(5)

                // Quarantine status
                const { data: quarantine } = await supabase
                    .from('distraction_patterns')
                    .select('pattern_data')
                    .eq('user_id', user_id)
                    .eq('pattern_type', 'quarantine_mode')
                    .single()

                const isQuarantined = quarantine?.pattern_data?.enabled &&
                    new Date(quarantine.pattern_data.ends_at) > new Date()

                result = {
                    distractions_last_hour: count || 0,
                    recent_events: recentEvents || [],
                    is_quarantine_mode: isQuarantined,
                    quarantine_ends_at: isQuarantined ? quarantine?.pattern_data?.ends_at : null,
                    protection_level: isQuarantined ? 'maximum'
                        : (count || 0) > 5 ? 'elevated'
                            : 'standard'
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
        console.error('Cognitive Firewall error:', error)
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
