// Neural Process Manager - Task Manager for Your Brain
// AI-powered cognitive load management and context switching optimization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessRequest {
    action: string
    user_id: string
    data: Record<string, any>
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, user_id, data }: ProcessRequest = await req.json()

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
            // 1. GET RUNNING PROCESSES - Current mental load
            // ═══════════════════════════════════════════════════════════════
            case 'get_processes': {
                const { data: processes } = await supabase
                    .from('mental_processes')
                    .select('*, tasks(title, status)')
                    .eq('user_id', user_id)
                    .in('status', ['running', 'suspended', 'blocked'])
                    .order('priority', { ascending: false })

                // Calculate total cognitive load
                const totalLoad = (processes || []).reduce((sum: number, p: any) =>
                    p.status === 'running' ? sum + (p.cognitive_load || 0) : sum, 0
                )

                // Count active threads
                const activeThreads = (processes || []).filter((p: any) => p.status === 'running').length

                result = {
                    processes: processes || [],
                    total_cognitive_load: Math.min(totalLoad, 100),
                    active_threads: activeThreads,
                    max_recommended_threads: 4,
                    is_overloaded: totalLoad > 80 || activeThreads > 5,
                    message: activeThreads > 5
                        ? '⚠️ Too many active processes! Consider suspending some.'
                        : `${activeThreads} active mental threads`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 2. ADD PROCESS - Register new mental thread
            // ═══════════════════════════════════════════════════════════════
            case 'add_process': {
                const { name, type = 'task', priority = 5, cognitive_load = 20, task_id, context_tags } = data

                const { data: process, error } = await supabase
                    .from('mental_processes')
                    .insert({
                        user_id,
                        task_id,
                        process_name: name,
                        process_type: type,
                        priority,
                        cognitive_load,
                        context_tags: context_tags || [],
                        status: 'running'
                    })
                    .select()
                    .single()

                if (error) throw error

                result = {
                    process,
                    message: `Process "${name}" started with ${cognitive_load}% load`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 3. SUSPEND PROCESS - Free mental bandwidth
            // ═══════════════════════════════════════════════════════════════
            case 'suspend_process': {
                const { process_id, notes } = data

                await supabase
                    .from('mental_processes')
                    .update({
                        status: 'suspended',
                        notes: notes || 'Suspended to free cognitive resources'
                    })
                    .eq('id', process_id)

                result = { success: true, message: 'Process suspended ✓' }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 4. RESUME PROCESS - Reactivate mental thread
            // ═══════════════════════════════════════════════════════════════
            case 'resume_process': {
                const { process_id } = data

                await supabase
                    .from('mental_processes')
                    .update({
                        status: 'running',
                        last_active: new Date().toISOString()
                    })
                    .eq('id', process_id)

                result = { success: true, message: 'Process resumed ✓' }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 5. COMPLETE PROCESS - Mark as done
            // ═══════════════════════════════════════════════════════════════
            case 'complete_process': {
                const { process_id } = data

                await supabase
                    .from('mental_processes')
                    .update({ status: 'completed' })
                    .eq('id', process_id)

                result = { success: true, message: 'Process completed ✓' }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 6. CONTEXT SWITCH - Log switching between tasks
            // ═══════════════════════════════════════════════════════════════
            case 'context_switch': {
                const { from_process_id, to_process_id, reason } = data

                // Get process details
                const { data: fromProcess } = await supabase
                    .from('mental_processes')
                    .select('process_name, context_tags, cognitive_load')
                    .eq('id', from_process_id)
                    .single()

                const { data: toProcess } = await supabase
                    .from('mental_processes')
                    .select('process_name, context_tags, cognitive_load')
                    .eq('id', to_process_id)
                    .single()

                // Calculate context switch cost using AI
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Calculate cognitive cost of switching between two tasks. Consider context overlap, cognitive load difference, and task types. Return JSON.'
                        },
                        {
                            role: 'user',
                            content: `Calculate switch cost from:
FROM: "${fromProcess?.process_name}" (tags: ${JSON.stringify(fromProcess?.context_tags)}, load: ${fromProcess?.cognitive_load}%)
TO: "${toProcess?.process_name}" (tags: ${JSON.stringify(toProcess?.context_tags)}, load: ${toProcess?.cognitive_load}%)

Return JSON:
{
  "switch_cost": 0-100,
  "reason": "string explaining cost",
  "recovery_time_minutes": number,
  "recommendation": "proceed|delay|batch"
}`
                        }
                    ],
                    max_tokens: 200,
                    response_format: { type: 'json_object' }
                })

                const switchAnalysis = JSON.parse(completion.choices[0].message.content || '{}')

                // Log the switch
                await supabase.from('context_switches').insert({
                    user_id,
                    from_process_id,
                    to_process_id,
                    switch_cost: switchAnalysis.switch_cost,
                    reason
                })

                // Update process activity times
                await supabase
                    .from('mental_processes')
                    .update({ last_active: new Date().toISOString() })
                    .eq('id', to_process_id)

                result = {
                    ...switchAnalysis,
                    from_task: fromProcess?.process_name,
                    to_task: toProcess?.process_name,
                    message: switchAnalysis.switch_cost > 50
                        ? `⚠️ High switch cost (${switchAnalysis.switch_cost}%). ${switchAnalysis.recommendation === 'delay' ? 'Consider finishing current task first.' : ''}`
                        : `Switch cost: ${switchAnalysis.switch_cost}%`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 7. OPTIMIZE QUEUE - AI reorders tasks for flow
            // ═══════════════════════════════════════════════════════════════
            case 'optimize_queue': {
                const { data: processes } = await supabase
                    .from('mental_processes')
                    .select('id, process_name, process_type, priority, cognitive_load, context_tags')
                    .eq('user_id', user_id)
                    .in('status', ['running', 'suspended'])
                    .order('priority', { ascending: false })

                if (!processes || processes.length < 2) {
                    result = { message: 'Not enough processes to optimize', optimized_order: processes }
                    break
                }

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a cognitive optimization expert. Reorder tasks to minimize context switching cost and maximize flow state. 
                            
Rules:
- Group similar context tasks together
- High priority tasks should be addressed first within groups
- High cognitive load tasks are better done when fresh
- Balance intensity with recovery tasks`
                        },
                        {
                            role: 'user',
                            content: `Optimize this task queue for maximum cognitive efficiency:
${JSON.stringify(processes, null, 2)}

Return JSON:
{
  "optimized_order": [{ "id": "uuid", "recommended_position": 1, "reason": "string" }],
  "groupings": [{ "group_name": "string", "task_ids": ["uuid"], "rationale": "string" }],
  "estimated_efficiency_gain": "string",
  "key_insight": "string"
}`
                        }
                    ],
                    max_tokens: 1000,
                    response_format: { type: 'json_object' }
                })

                const optimization = JSON.parse(completion.choices[0].message.content || '{}')

                result = {
                    original_order: processes,
                    ...optimization,
                    message: `Queue optimized! ${optimization.key_insight}`
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 8. DETECT THRASHING - Identify rapid context switching
            // ═══════════════════════════════════════════════════════════════
            case 'detect_thrashing': {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

                const { data: recentSwitches, count } = await supabase
                    .from('context_switches')
                    .select('*', { count: 'exact' })
                    .eq('user_id', user_id)
                    .gt('switched_at', oneHourAgo)
                    .order('switched_at', { ascending: false })

                const avgCost = recentSwitches?.length
                    ? recentSwitches.reduce((sum, s) => sum + (s.switch_cost || 0), 0) / recentSwitches.length
                    : 0

                const isThrashing = (count || 0) > 10 || avgCost > 60

                let recommendation = 'Normal switching patterns'
                if (isThrashing) {
                    if ((count || 0) > 15) {
                        recommendation = '🚨 SEVERE THRASHING: You switched tasks 15+ times this hour. Pick ONE task and commit for 25 minutes.'
                    } else {
                        recommendation = '⚠️ High context switching detected. Try batching similar tasks together.'
                    }
                }

                result = {
                    switches_last_hour: count || 0,
                    avg_switch_cost: Math.round(avgCost),
                    is_thrashing: isThrashing,
                    recommendation,
                    recent_switches: recentSwitches?.slice(0, 5)
                }
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 9. SUGGEST BATCH - Group similar tasks
            // ═══════════════════════════════════════════════════════════════
            case 'suggest_batch': {
                const { data: processes } = await supabase
                    .from('mental_processes')
                    .select('id, process_name, process_type, context_tags, cognitive_load')
                    .eq('user_id', user_id)
                    .in('status', ['running', 'suspended'])

                if (!processes || processes.length < 2) {
                    result = { batches: [], message: 'Not enough tasks to batch' }
                    break
                }

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'Group similar tasks that can be batched together for flow-state work.'
                        },
                        {
                            role: 'user',
                            content: `Group these tasks into batches that share context:
${JSON.stringify(processes)}

Return JSON:
{
  "batches": [{
    "batch_name": "string",
    "task_ids": ["uuid"],
    "shared_context": "string",
    "estimated_time_mins": number,
    "flow_potential": "low|medium|high"
  }],
  "solo_tasks": ["uuid"],
  "optimal_sequence": ["batch1", "solo1", "batch2"]
}`
                        }
                    ],
                    max_tokens: 800,
                    response_format: { type: 'json_object' }
                })

                result = JSON.parse(completion.choices[0].message.content || '{}')
                result.message = `Found ${result.batches?.length || 0} task batches for optimal flow`
                break
            }

            // ═══════════════════════════════════════════════════════════════
            // 10. SYNC FROM TASKS - Import tasks as mental processes
            // ═══════════════════════════════════════════════════════════════
            case 'sync_from_tasks': {
                const { data: tasks } = await supabase
                    .from('tasks')
                    .select('id, title, status, priority')
                    .eq('user_id', user_id)
                    .in('status', ['todo', 'in_progress'])

                if (!tasks || tasks.length === 0) {
                    result = { synced: 0, message: 'No active tasks to sync' }
                    break
                }

                // Get existing processes to avoid duplicates
                const { data: existingProcesses } = await supabase
                    .from('mental_processes')
                    .select('task_id')
                    .eq('user_id', user_id)
                    .in('status', ['running', 'suspended'])

                const existingTaskIds = new Set((existingProcesses || []).map(p => p.task_id))

                const newProcesses = tasks
                    .filter(t => !existingTaskIds.has(t.id))
                    .map(t => ({
                        user_id,
                        task_id: t.id,
                        process_name: t.title,
                        process_type: 'task',
                        priority: t.priority || 5,
                        cognitive_load: t.status === 'in_progress' ? 30 : 15,
                        status: t.status === 'in_progress' ? 'running' : 'suspended'
                    }))

                if (newProcesses.length > 0) {
                    await supabase.from('mental_processes').insert(newProcesses)
                }

                result = {
                    synced: newProcesses.length,
                    total_tasks: tasks.length,
                    message: `Synced ${newProcesses.length} tasks as mental processes`
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
        console.error('Neural Process Manager error:', error)
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
