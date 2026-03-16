import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export default function BreathingExercise({ onComplete }: { onComplete: () => void }) {
    const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale')
    const [cycles, setCycles] = useState(0)
    const TARGET_CYCLES = 3

    useEffect(() => {
        let timeout: NodeJS.Timeout

        if (cycles >= TARGET_CYCLES) {
            onComplete()
            return
        }

        const runCycle = () => {
            setPhase('inhale')
            timeout = setTimeout(() => {
                setPhase('hold')
                timeout = setTimeout(() => {
                    setPhase('exhale')
                    timeout = setTimeout(() => {
                        setCycles(c => c + 1)
                    }, 8000) // Exhale 8s
                }, 7000) // Hold 7s
            }, 4000) // Inhale 4s
        }

        runCycle()

        return () => clearTimeout(timeout)
    }, [cycles, onComplete])

    const getInstructions = () => {
        if (phase === 'inhale') return "Inhale deeply..."
        if (phase === 'hold') return "Hold..."
        if (phase === 'exhale') return "Exhale slowly..."
        return "Complete"
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 gap-8">
            <div className="relative flex items-center justify-center w-64 h-64">
                {/* Outer Glow */}
                <motion.div
                    animate={{
                        scale: phase === 'inhale' ? 1.5 : phase === 'hold' ? 1.5 : 1,
                        opacity: phase === 'inhale' ? 0.5 : 0.2,
                    }}
                    transition={{ duration: phase === 'inhale' ? 4 : phase === 'exhale' ? 8 : 0 }}
                    className="absolute inset-0 bg-blue-500 rounded-full blur-xl"
                />

                {/* Core Circle */}
                <motion.div
                    animate={{
                        scale: phase === 'inhale' ? [1, 1.2, 1.3] : phase === 'hold' ? 1.3 : 1,
                    }}
                    transition={{ duration: phase === 'inhale' ? 4 : phase === 'exhale' ? 8 : 0 }}
                    className="w-32 h-32 bg-blue-400 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.6)] z-10"
                >
                    <span className="text-2xl font-bold text-white">{phase.toUpperCase()}</span>
                </motion.div>
            </div>

            <div className="text-center space-y-2">
                <h3 className="text-2xl font-light text-blue-200">{getInstructions()}</h3>
                <p className="text-muted-foreground text-sm">Cycles: {cycles}/{TARGET_CYCLES}</p>
            </div>

            {/* Manual Skip (for demo/emergency) */}
            <Button variant="ghost" className="text-xs text-muted-foreground hover:text-white" onClick={onComplete}>
                (Skip Protocol)
            </Button>
        </div>
    )
}
