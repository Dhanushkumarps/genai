import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { Clock, Pause, Play } from 'lucide-react'

interface EditorTimerProps {
    isRunning: boolean
    onToggle: () => void
    resetDependency: any // Changes when a new problem is loaded to reset the timer
}

export const EditorTimer: FC<EditorTimerProps> = ({ isRunning, onToggle, resetDependency }) => {
    const [seconds, setSeconds] = useState(0)

    useEffect(() => {
        setSeconds(0)
    }, [resetDependency])

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(s => s + 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [isRunning])

    const formattedTime = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-lg">
            <Clock className="w-3.5 h-3.5 text-[#6B6966]" />
            <span className="text-sm font-mono text-[#E8E6E3] w-[45px] text-center">{formattedTime}</span>
            <button
                onClick={onToggle}
                className="p-1 hover:bg-[#22262A] rounded text-[#6B6966] hover:text-[#E8E6E3] transition"
                title={isRunning ? "Pause Timer" : "Resume Timer"}
            >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
        </div>
    )
}
