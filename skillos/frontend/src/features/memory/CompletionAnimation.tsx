import { useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import confetti from 'canvas-confetti'

interface CompletionAnimationProps {
    onComplete: () => void
}

export default function CompletionAnimation({ onComplete }: CompletionAnimationProps) {
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState('Initiating dump...')

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) return 100
                return prev + 2
            })
        }, 30)

        const statusTimers = [
            setTimeout(() => setStatus('Flushing mental RAM...'), 500),
            setTimeout(() => setStatus('Optimizing neural pathways...'), 1500),
            setTimeout(() => setStatus('Reclaiming cognitive capacity...'), 2500),
            setTimeout(() => {
                setStatus('System Cleaned. +20% Capacity Restored.')
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#00f0ff', '#ffffff', '#00ff9d']
                })
            }, 3500),
            setTimeout(() => {
                onComplete()
            }, 5500)
        ]

        return () => {
            clearInterval(interval)
            statusTimers.forEach(clearTimeout)
        }
    }, [onComplete])

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
            <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full border-4 border-primary/20 flex items-center justify-center animate-pulse">
                    {progress < 100 ? (
                        <RefreshCw className="w-12 h-12 text-primary animate-spin" />
                    ) : (
                        <CheckCircle2 className="w-16 h-16 text-green-400 animate-scale-in" />
                    )}
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin-slow" />
            </div>

            <h2 className="text-2xl font-bold font-mono text-primary mb-2 glitch-effect" data-text={status}>
                {status}
            </h2>

            <div className="w-full max-w-md bg-secondary/20 h-2 rounded-full overflow-hidden mt-8">
                <div
                    className="h-full bg-primary shadow-[0_0_15px_var(--primary)] transition-all duration-100 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-2">{progress}%</p>
        </div>
    )
}
