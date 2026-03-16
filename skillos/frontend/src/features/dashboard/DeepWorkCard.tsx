import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Target, Play, Pause, RotateCcw, Clock } from 'lucide-react'

export default function DeepWorkCard() {
    const [sessionSeconds, setSessionSeconds] = useState(0)
    const [isActive, setIsActive] = useState(false)
    const [deepWorkToday, setDeepWorkToday] = useState(0)
    const [sessionsToday, setSessionsToday] = useState(0)
    const [dailyGoal] = useState(240)

    useEffect(() => {
        const saved = localStorage.getItem('deepwork_state')
        if (saved) {
            const state = JSON.parse(saved)
            const today = new Date().toDateString()
            if (state.date === today) {
                setDeepWorkToday(state.totalMinutes || 0)
                setSessionsToday(state.sessions || 0)
            }
        }
    }, [])

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null

        if (isActive) {
            interval = setInterval(() => {
                setSessionSeconds(prev => {
                    if ((prev + 1) % 60 === 0) {
                        setDeepWorkToday(total => {
                            const newTotal = total + 1
                            saveState(newTotal, sessionsToday)
                            return newTotal
                        })
                    }
                    return prev + 1
                })
            }, 1000)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isActive, sessionsToday])

    const saveState = (minutes: number, sessions: number) => {
        localStorage.setItem('deepwork_state', JSON.stringify({
            date: new Date().toDateString(),
            totalMinutes: minutes,
            sessions
        }))
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const formatMinutes = (minutes: number) => {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        if (h > 0) return `${h}h ${m}m`
        return `${m}m`
    }

    const startSession = () => {
        setIsActive(true)
        if (sessionSeconds === 0) {
            setSessionsToday(prev => {
                const newCount = prev + 1
                saveState(deepWorkToday, newCount)
                return newCount
            })
        }
    }

    const pauseSession = () => {
        setIsActive(false)
    }

    const resetSession = () => {
        setIsActive(false)
        setSessionSeconds(0)
    }

    const progressPercent = Math.min(100, (deepWorkToday / dailyGoal) * 100)
    const goalReached = deepWorkToday >= dailyGoal

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#22262A] flex items-center justify-center">
                        <Target className="w-4 h-4 text-[#C49B3A]" />
                    </div>
                    <div>
                        <p className="text-[11px] font-medium text-[#6B6966] uppercase tracking-wide">Focus Time</p>
                        <span className="text-[20px] font-semibold text-[#E8E6E3] tabular-nums">
                            {formatMinutes(deepWorkToday)}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-[#4A4845]">Goal</p>
                    <p className="text-[13px] font-medium text-[#6B6966]">{formatMinutes(dailyGoal)}</p>
                </div>
            </div>

            {/* Progress - Thin, elegant */}
            <div className="space-y-1.5">
                <div className="h-[3px] w-full bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                    <div
                        className="h-full transition-all duration-500 ease-out rounded-full"
                        style={{
                            width: `${progressPercent}%`,
                            background: goalReached ? '#5A9A5A' : '#6B6966'
                        }}
                    />
                </div>
                <p className="text-[10px] text-[#4A4845] text-right tabular-nums">{Math.round(progressPercent)}%</p>
            </div>

            {/* Timer - Current session */}
            <div className="flex items-center justify-between p-3 bg-[#0F1113] rounded-lg border border-[rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-3">
                    <Clock className={`w-4 h-4 ${isActive ? 'text-[#5A9A5A]' : 'text-[#4A4845]'}`} />
                    <div>
                        <p className="text-[10px] text-[#4A4845]">Session</p>
                        <p className="text-[18px] font-semibold text-[#E8E6E3] tabular-nums font-mono">
                            {formatTime(sessionSeconds)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isActive ? (
                        <Button size="sm" onClick={startSession}>
                            <Play className="w-3 h-3 mr-1" /> Start
                        </Button>
                    ) : (
                        <Button size="sm" variant="secondary" onClick={pauseSession}>
                            <Pause className="w-3 h-3 mr-1" /> Pause
                        </Button>
                    )}
                    {sessionSeconds > 0 && (
                        <Button size="sm" variant="ghost" onClick={resetSession}>
                            <RotateCcw className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats - Minimal */}
            <div className="flex justify-between pt-3 border-t border-[rgba(255,255,255,0.04)]">
                <div>
                    <p className="text-[15px] font-semibold text-[#9A9996] tabular-nums">{sessionsToday}</p>
                    <p className="text-[10px] text-[#4A4845]">Sessions</p>
                </div>
                <div className="text-right">
                    <p className="text-[15px] font-semibold text-[#9A9996] tabular-nums">
                        {sessionsToday > 0 ? Math.round(deepWorkToday / sessionsToday) : 0}m
                    </p>
                    <p className="text-[10px] text-[#4A4845]">Avg</p>
                </div>
            </div>
        </div>
    )
}
