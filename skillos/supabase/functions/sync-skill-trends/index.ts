// Sync Skill Trends — receives aggregated skill demand data from Chrome extension
// and upserts into skill_market_trends table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrendEntry {
    skill: string
    count: number
    pct: number
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { trends }: { trends: TrendEntry[] } = await req.json()

        if (!trends || !Array.isArray(trends) || trends.length === 0) {
            return new Response(
                JSON.stringify({ success: false, error: 'No trends data provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const rows = trends.map((t) => ({
            skill: t.skill,
            demand_score: t.pct,
            job_count: t.count,
            source: 'extension',
            updated_at: new Date().toISOString(),
        }))

        const { error } = await supabase
            .from('skill_market_trends')
            .upsert(rows, { onConflict: 'skill' })

        if (error) throw error

        return new Response(
            JSON.stringify({ success: true, synced: rows.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Sync skill trends error:', error)
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
