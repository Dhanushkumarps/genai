// Flow State Orchestrator - Automatic Deep Work Mode
// Learns flow patterns and orchestrates optimal work conditions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FlowRequest {
    action: string
    user_id: string
    data: Record<string, any>
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, user_id, data }: FlowRequest = await req.json()

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
            // 1. START FLOW SESSION - Begin tracking deep work
            // ═══════════════════════════════════════════════════════════════
            case 'start_flow': {
                const { task_context } = data
                const now = new Date()
                const hour = now.getHours()

                let timeOfDay: string
                if (hour < 6) timeOfDay = 'night'
                else if (hour < 12) timeOfDay = 'morning'
                else if (hour < 18) timeOfDay = 'afternoon'
                else timeOfDay = 'evening'

                const { data: session, error } = await supabase
                    .from('flow_sessions')
                    .insert({
                        user_id,
                        task_context,
                        time_of_day: timeOfDay,
                        day_of_week: now.getDay(),
                        started_at: now.toISOString()
                    })
                    .select()
                    .single()

                if (error) throw error

                // Get personalized tips based on patterns
                const { data: patterns } = await supabase
                    .from('flow_patterns')
                    .select('*')
                    .eq('user_id', user_id)

                let tips: string[] = ['Focus on one task at a time', 'Take deep breaths before starting']

                const timePattern = patterns?.find(p => p.pattern_type === 'time_preference')
                if (timePattern?.pattern_data?.best_times?.includes(timeOfDay)) {
                    tips.push(`Great timing! ${timeOfDay} is your peak flow period.`)
                }

                result = {
                    session_id: session.id,
                    started_at: session.started_at,
                    tips,
                    message: '🌊 Flow session started. Entering deep work mode...'
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 2. END FLOW SESSION - Complete and analyze session
            // ═══════════════════════════════════════════════════════════════
            case 'end_flow': {
                const { session_id, quality_score, triggers, breakers } = data

                const { data: session } = await supabase
                    .from('flow_sessions')
                    .select('*')
                    .eq('id', session_id)
                    .single()

                if (!session) throw new Error('Session not found')

                const endTime = new Date()
                const duration = Math.round((endTime.getTime() - new Date(session.started_at).getTime()) / 60000)

                await supabase
                    .from('flow_sessions')
                    .update({
                        ended_at: endTime.toISOString(),
                        duration_minutes: duration,
                        quality_score,
                        triggers: triggers || [],
                        breakers: breakers || [],
                        peak_depth: quality_score
                    })
                    .eq('id', session_id)

                // Update patterns based on this session
                await supabase.from('flow_patterns').upsert({
                    user_id,
                    pattern_type: 'time_preference',
                    pattern_data: {
                        last_session: {
                            time_of_day: session.time_of_day,
                            quality: quality_score,
                            duration
                        }
                    },
                    sample_count: 1,
                    last_updated: new Date().toISOString()
                }, { onConflict: 'user_id,pattern_type' })

                result = {
                    duration_minutes: duration,
                    quality_score,
                    message: `✨ Flow session complete! ${duration} minutes of deep work.`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 3. LOG INTERRUPTION - Track flow breakers
            // ═══════════════════════════════════════════════════════════════
            case 'log_interruption': {
                const { session_id, interruption_type, source } = data

                const { data: session } = await supabase
                    .from('flow_sessions')
                    .select('interruptions, breakers')
                    .eq('id', session_id)
                    .single()

                if (session) {
                    const breakers = [...(session.breakers || []), { type: interruption_type, source, time: new Date().toISOString() }]

                    await supabase
                        .from('flow_sessions')
                        .update({
                            interruptions: (session.interruptions || 0) + 1,
                            breakers
                        })
                        .eq('id', session_id)
                }

                result = {
                    logged: true,
                    message: `Interruption logged: ${interruption_type}`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 4. ANALYZE FLOW PATTERNS - ML on historical data
            // ═══════════════════════════════════════════════════════════════
            case 'analyze_patterns': {
                // Get last 30 days of flow sessions
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

                const { data: sessions } = await supabase
                    .from('flow_sessions')
                    .select('*')
                    .eq('user_id', user_id)
                    .gt('started_at', thirtyDaysAgo)
                    .not('ended_at', 'is', null)
                    .order('started_at', { ascending: false })

                if (!sessions || sessions.length < 3) {
                    result = {
                        patterns: null,
                        message: 'Need at least 3 completed flow sessions to analyze patterns'
                    }
                    break
                }

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Analyze flow session data to identify patterns. Be specific and actionable.'
                        },
                        {
                            role: 'user',
                            content: `Analyze these flow sessions and identify patterns:
${JSON.stringify(sessions, null, 2)}

Return JSON:
{
  "best_times": [{ "time_of_day": "string", "avg_quality": number, "avg_duration": number }],
  "best_days": [{ "day": "string", "avg_quality": number }],
  "common_triggers": [{ "trigger": "string", "frequency": number }],
  "common_breakers": [{ "breaker": "string", "frequency": number, "avg_impact": number }],
  "optimal_duration": number,
  "flow_fingerprint": {
    "peak_time": "string",
    "ideal_session_length": number,
    "vulnerability": "string - biggest flow killer",
    "superpower": "string - biggest flow enabler"
  },
  "recommendations": [string],
  "weekly_flow_hours": number
}`
                        }
                    ],
                    max_tokens: 1000,
                    response_format: { type: 'json_object' }
                })

                const patterns = JSON.parse(completion.choices[0].message.content || '{}')

                // Store patterns
                await supabase.from('flow_patterns').upsert({
                    user_id,
                    pattern_type: 'time_preference',
                    pattern_data: patterns,
                    sample_count: sessions.length,
                    confidence: Math.min(sessions.length / 20, 1),
                    last_updated: new Date().toISOString()
                }, { onConflict: 'user_id,pattern_type' })

                result = {
                    patterns,
                    sessions_analyzed: sessions.length,
                    message: `Analyzed ${sessions.length} flow sessions`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 5. DETECT FLOW ENTRY - Recognize early flow signals
            // ═══════════════════════════════════════════════════════════════
            case 'detect_flow_entry': {
                const { typing_speed, tab_switches, time_on_task_mins, mouse_idle_seconds } = data

                // Heuristic flow detection
                let flowSignals = 0
                let indicators: string[] = []

                if (typing_speed && typing_speed > 60) {
                    flowSignals++
                    indicators.push('High typing velocity')
                }
                if (tab_switches === 0 && time_on_task_mins > 5) {
                    flowSignals += 2
                    indicators.push('Zero context switches')
                }
                if (time_on_task_mins > 15) {
                    flowSignals++
                    indicators.push('Sustained focus (15+ min)')
                }
                if (mouse_idle_seconds && mouse_idle_seconds > 30) {
                    flowSignals++
                    indicators.push('Keyboard-focused work')
                }

                const isEnteringFlow = flowSignals >= 3
                const flowDepth = Math.min(flowSignals * 20, 100)

                result = {
                    is_entering_flow: isEnteringFlow,
                    flow_depth: flowDepth,
                    indicators,
                    recommendation: isEnteringFlow
                        ? '🌊 You\'re entering flow! Protect this state - silence notifications.'
                        : 'Keep focusing - flow state building...'
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 6. CALCULATE INTERRUPTION COST - Dollar value of interruption
            // ═══════════════════════════════════════════════════════════════
            case 'calculate_interruption_cost': {
                const { current_flow_depth, hourly_rate = 50 } = data

                // Research: average recovery time is 23 minutes
                const baseRecoveryMins = 23
                const adjustedRecovery = baseRecoveryMins * (current_flow_depth / 100)

                const dollarCost = Math.round((adjustedRecovery / 60) * hourly_rate)
                const productivityLoss = Math.round(adjustedRecovery * 2) // Lost time + ramp-up

                result = {
                    recovery_time_mins: Math.round(adjustedRecovery),
                    dollar_cost: dollarCost,
                    productivity_loss_mins: productivityLoss,
                    message: current_flow_depth > 50
                        ? `⚠️ Interrupting now costs ~$${dollarCost} in lost productivity`
                        : 'Low flow depth - safe to context switch'
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 7. GENERATE RECOVERY PATH - Steps to re-enter flow
            // ═══════════════════════════════════════════════════════════════
            case 'generate_recovery_path': {
                const { interrupted_task, interruption_reason, time_since_interruption_mins } = data

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Help user recover flow state after interruption. Be concise and practical.'
                        },
                        {
                            role: 'user',
                            content: `User was working on: ${interrupted_task}
Interrupted by: ${interruption_reason}
Time since interruption: ${time_since_interruption_mins} minutes

Generate recovery path JSON:
{
  "estimated_recovery_mins": number,
  "steps": [{ "step": number, "action": "string", "duration_mins": number }],
  "mental_reset": "string - quick technique to clear interruption",
  "context_rebuild": "string - how to rebuild mental context",
  "momentum_starter": "string - easy first action to build momentum"
}`
                        }
                    ],
                    max_tokens: 400,
                    response_format: { type: 'json_object' }
                })

                result = JSON.parse(completion.choices[0].message.content || '{}')
                result.message = `Recovery path ready. Start with: ${result.momentum_starter}`
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 8. GET FLOW STATS - Dashboard summary
            // ═══════════════════════════════════════════════════════════════
            case 'get_flow_stats': {
                const { days = 7 } = data
                const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

                const { data: sessions } = await supabase
                    .from('flow_sessions')
                    .select('*')
                    .eq('user_id', user_id)
                    .gt('started_at', since)
                    .not('ended_at', 'is', null)

                if (!sessions || sessions.length === 0) {
                    result = {
                        total_flow_minutes: 0,
                        sessions_count: 0,
                        avg_quality: 0,
                        avg_duration: 0,
                        streak_days: 0,
                        message: 'No flow sessions recorded'
                    }
                    break
                }

                const totalMins = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
                const avgQuality = sessions.reduce((sum, s) => sum + (s.quality_score || 0), 0) / sessions.length
                const avgDuration = totalMins / sessions.length
                const totalInterruptions = sessions.reduce((sum, s) => sum + (s.interruptions || 0), 0)

                result = {
                    total_flow_minutes: totalMins,
                    total_flow_hours: Math.round(totalMins / 60 * 10) / 10,
                    sessions_count: sessions.length,
                    avg_quality: Math.round(avgQuality),
                    avg_duration: Math.round(avgDuration),
                    total_interruptions: totalInterruptions,
                    interruption_rate: Math.round(totalInterruptions / sessions.length * 10) / 10,
                    message: `${Math.round(totalMins / 60)} hours of deep work in the last ${days} days`
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
        console.error('Flow Orchestrator error:', error)
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
