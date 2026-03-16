import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useBrainDumpDetector() {
    const [needsMaintenance, setNeedsMaintenance] = useState(false)
    const [cognitiveLoad, setCognitiveLoad] = useState(0)

    useEffect(() => {
        // Poll for system stats (simulated high load logic for now)
        // In real app, this would listen to realtime 'system_stats' changes
        const checkLoad = async () => {
            try {
                // Use maybeSingle() to avoid error if no stats exist yet
                const { data, error } = await supabase
                    .from('system_stats')
                    .select('cognitive_load')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (error) {
                    // Quietly ignore 406/missing table errors
                    return
                }

                if (data) {
                    setCognitiveLoad(data.cognitive_load || 0)
                    if ((data.cognitive_load || 0) > 85) {
                        setNeedsMaintenance(true)
                    }
                }
            } catch (err) {
                // Silent fail
            }
        }

        checkLoad()
        const interval = setInterval(checkLoad, 60000) // Check every minute
        return () => clearInterval(interval)
    }, [])

    const dismissMaintenance = () => setNeedsMaintenance(false)

    return { needsMaintenance, cognitiveLoad, dismissMaintenance }
}
