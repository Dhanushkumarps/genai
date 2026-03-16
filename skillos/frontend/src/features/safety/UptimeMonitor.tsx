import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Clock, Zap, Brain, TrendingUp, TrendingDown } from 'lucide-react'
import { useRealtimeStats } from '@/features/dashboard/useRealtimeStats'

interface UptimeMonitorProps {
    onClose?: () => void
}

export default function UptimeMonitor({ onClose }: UptimeMonitorProps) {
    const { data: stats } = useRealtimeStats()
    const [sessionTime, setSessionTime] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => setSessionTime(prev => prev + 1), 1000)
        return () => clearInterval(interval)
    }, [])

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const latestStat = stats[stats.length - 1]
    const prevStat = stats[stats.length - 2]
    const energyTrend = latestStat && prevStat ? latestStat.energy_level - prevStat.energy_level : 0
    const loadTrend = latestStat && prevStat ? latestStat.cognitive_load - prevStat.cognitive_load : 0

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-8 z-50 w-[280px] bg-black/95 backdrop-blur-xl border border-orange-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(249,115,22,0.2)]"
        >
            {/* Window Title Bar */}
            <div className="p-3 bg-gradient-to-r from-orange-900/50 to-amber-900/50 border-b border-orange-500/20">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
                        <button onClick={onClose} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400" />
                        <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-400" />
                        <span className="font-medium text-white text-sm">System Monitor</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Session Timer */}
                <div className="text-center py-2">
                    <Clock className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                    <p className="font-mono text-xl font-bold text-white">{formatTime(sessionTime)}</p>
                    <p className="text-xs text-white/50">Session Uptime</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Zap className="w-4 h-4 text-cyan-400" />
                            {energyTrend > 0 ? <TrendingUp className="w-3 h-3 text-green-400" /> : energyTrend < 0 ? <TrendingDown className="w-3 h-3 text-red-400" /> : null}
                        </div>
                        <p className="text-lg font-bold text-white">{latestStat?.energy_level || 50}%</p>
                        <p className="text-[10px] text-white/50">Energy</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Brain className="w-4 h-4 text-purple-400" />
                            {loadTrend > 0 ? <TrendingUp className="w-3 h-3 text-red-400" /> : loadTrend < 0 ? <TrendingDown className="w-3 h-3 text-green-400" /> : null}
                        </div>
                        <p className="text-lg font-bold text-white">{latestStat?.cognitive_load || 50}%</p>
                        <p className="text-[10px] text-white/50">CPU Load</p>
                    </div>
                </div>

                {/* Mini Chart */}
                <div className="h-12 flex items-end gap-0.5">
                    {stats.slice(-20).map((s, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-cyan-500 to-purple-500 rounded-t opacity-70" style={{ height: `${s.energy_level}%` }} />
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
