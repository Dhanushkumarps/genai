import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { user_id } = await req.json()

        // 1. Calculate Cognitive Load (0-100)
        // Factors: Active tasks count, high difficulty tasks, recent panic events
        const { count: activeTasks } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .eq('status', 'active')

        const { data: recentPanic } = await supabase
            .from('panic_events')
            .select('created_at')
            .eq('user_id', user_id)
            .gt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // last 15 mins

        let load = (activeTasks || 0) * 10 // Base load: 10 per task
        if (recentPanic && recentPanic.length > 0) load += 50 // Panic adds 50
        load = Math.min(Math.max(load, 10), 100) // Clamp 10-100

        // 2. Calculate Energy Level (0-100)
        // Factors: Time since last break, total uptime
        const { data: lastBreak } = await supabase
            .from('break_logs')
            .select('created_at')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        let energy = 100
        if (lastBreak) {
            const minutesSinceBreak = (Date.now() - new Date(lastBreak.created_at).getTime()) / 60000
            // Energy drops 1 point every 2 minutes
            energy = Math.max(100 - (minutesSinceBreak / 2), 20)
        }

        // 3. Insert new stat point
        const { data, error } = await supabase
            .from('system_stats')
            .insert({
                user_id,
                cognitive_load: Math.round(load),
                energy_level: Math.round(energy)
            })
            .select()
            .single()

        if (error) throw error

        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
