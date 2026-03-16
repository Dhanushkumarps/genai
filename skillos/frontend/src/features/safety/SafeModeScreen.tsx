import { useState } from 'react'
import { AlertTriangle, Lock, Wind, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BreathingExercise from './BreathingExercise'
import BrainDump from '../memory/BrainDump' // Reuse existing if possible, or trigger it

interface SafeModeProps {
    triggers: string[]
    onUnlock: () => void
}

export default function SafeModeScreen({ triggers, onUnlock }: SafeModeProps) {
    const [step, setStep] = useState<'locked' | 'breathing' | 'dump' | 'unlocked'>('locked')

    const UnlockSequence = () => {
        if (step === 'breathing') {
            return <BreathingExercise onComplete={() => setStep('dump')} />
        }
        // In reality, we might want to integrate BrainDump here directly or just a placeholder
        // Since BrainDump is a Dialog, let's just simulate the requirements for now
        if (step === 'dump') {
            return (
                <div className="flex flex-col items-center gap-6 animate-in fade-in">
                    <Brain className="w-16 h-16 text-purple-400 animate-pulse" />
                    <h3 className="text-xl">Mind Defragmentation Required</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                        To restore system stability, please document your current stressors.
                    </p>
                    <Button variant="neon" onClick={onUnlock}>
                        Open Memory Bank & Unlock
                    </Button>
                </div>
            )
        }

        return (
            <div className="flex flex-col items-center gap-8 max-w-2xl text-center">
                <div className="space-y-4">
                    <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.4)] animate-pulse">
                        <AlertTriangle className="w-12 h-12 text-red-500" />
                    </div>
                    <h1 className="text-5xl font-bold tracking-tighter text-red-100">KERNEL PANIC</h1>
                    <p className="text-xl text-red-300 font-mono">SYSTEM OVERLOAD DETECTED</p>
                </div>

                <div className="bg-black/40 border border-red-900/50 p-6 rounded-xl w-full text-left">
                    <h4 className="text-xs font-mono text-red-400 mb-4 border-b border-red-900/50 pb-2">DIAGNOSTIC REPORT</h4>
                    <ul className="space-y-2">
                        {triggers.map((t, i) => (
                            <li key={i} className="flex items-center gap-2 text-red-200 font-mono text-sm">
                                <span className="text-red-500">⚠</span> {t}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="space-y-4">
                    <p className="text-muted-foreground">Safety protocols engaged. Manual override requires system cooldown.</p>
                    <Button
                        size="lg"
                        variant="destructive"
                        className="w-full text-lg h-14"
                        onClick={() => setStep('breathing')}
                    >
                        <Wind className="mr-2" /> Initiate Recovery Protocol
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
            {/* Red Tint Overlay */}
            <div className="absolute inset-0 bg-red-900/10 pointer-events-none" />

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

            <div className="z-10 w-full max-w-3xl">
                {UnlockSequence()}
            </div>
        </div>
    )
}
