import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Coffee, RotateCcw, Play } from 'lucide-react'
import { type BreakState } from './useBreakScheduler'

interface BreakNotificationProps {
    activeBreak: { type: string; suggestion: string } | null
    onComplete: () => void
    onSnooze: () => void
    onSkip: () => void
}

export default function BreakNotification({ activeBreak, onComplete, onSnooze, onSkip }: BreakNotificationProps) {
    if (!activeBreak) return null

    const isLong = activeBreak.type === 'long'

    return (
        <Dialog open={!!activeBreak} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md bg-black/95 backdrop-blur-xl border-primary/20" onPointerDownOutside={(e) => e.preventDefault()}>

                <div className="flex flex-col items-center text-center gap-6 py-6">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                        <Coffee className="w-10 h-10 text-primary" />
                    </div>

                    <div className="space-y-2">
                        <DialogTitle className="text-2xl font-bold">
                            {activeBreak.type === 'long' ? 'System Cooldown Required' : 'Time for a Stretch'}
                        </DialogTitle>
                        <DialogDescription className="text-lg text-foreground/80">
                            {activeBreak.suggestion}
                        </DialogDescription>
                    </div>

                    <div className="flex gap-4 w-full">
                        {!isLong && (
                            <Button variant="outline" className="flex-1" onClick={onSnooze}>
                                <RotateCcw className="w-4 h-4 mr-2" /> Snooze (5m)
                            </Button>
                        )}
                        <Button variant="neon" className="flex-1" onClick={onComplete}>
                            <Play className="w-4 h-4 mr-2" /> I'm Back
                        </Button>
                    </div>

                    <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={onSkip}>
                        Skip (Not Recommended)
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
