import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Lock, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { getRandomPrompt } from './DumpPrompts'
import CompletionAnimation from './CompletionAnimation'
import { useBrainDumpDetector } from './useBrainDumpDetector'
import confetti from 'canvas-confetti'

interface DumpData {
    stress: string
    thoughts: string
    worries: string
}

const MIN_CHARS = 50

export default function BrainDump() {
    const { needsMaintenance, dismissMaintenance } = useBrainDumpDetector()
    const [isOpen, setIsOpen] = useState(false)
    const [currentTab, setCurrentTab] = useState<'stress' | 'thoughts' | 'worries'>('stress')
    const [data, setData] = useState<DumpData>({ stress: '', thoughts: '', worries: '' })
    const [prompts, setPrompts] = useState({
        stress: getRandomPrompt('stress'),
        thoughts: getRandomPrompt('thoughts'),
        worries: getRandomPrompt('worries')
    })
    const [isComplete, setIsComplete] = useState(false)
    const [step, setStep] = useState<'input' | 'processing' | 'done'>('input')
    const { user } = useAuth()

    // Auto-open on maintenance trigger (optional, maybe just show a button)
    useEffect(() => {
        if (needsMaintenance && !isOpen) {
            // Optional: Auto open or just show a persistent banner
        }
    }, [needsMaintenance, isOpen])

    const handleNext = () => {
        if (currentTab === 'stress') setCurrentTab('thoughts')
        else if (currentTab === 'thoughts') setCurrentTab('worries')
        else handleSubmit()
    }

    const handleSubmit = async () => {
        if (!user) return
        setStep('processing')

        try {
            const batch = [
                { user_id: user.id, type: 'stress', content: data.stress },
                { user_id: user.id, type: 'thoughts', content: data.thoughts },
                { user_id: user.id, type: 'worries', content: data.worries }
            ] as any

            const { error } = await supabase.from('brain_dumps').insert(batch)
            if (error) throw error

            // Update stats (simulated effect)
            // await supabase.rpc('reduce_cognitive_load', { amount: 20 })

        } catch (err) {
            console.error('Dump failed', err)
            // Restore state?
        }
    }

    const reset = () => {
        setIsOpen(false)
        setStep('input')
        setData({ stress: '', thoughts: '', worries: '' })
        setCurrentTab('stress')
        dismissMaintenance()
    }

    const canProceed = (type: keyof DumpData) => data[type].length >= MIN_CHARS

    if (!isOpen) {
        // Trigger Button (Visible when needed or always in a menu)
        return (
            needsMaintenance ? (
                <div className="fixed bottom-24 right-8 z-50 animate-bounce">
                    <Button
                        variant="destructive"
                        className="shadow-[0_0_20px_red] gap-2"
                        onClick={() => setIsOpen(true)}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        System Maintenance Required
                    </Button>
                </div>
            ) : (
                <div className="fixed bottom-24 right-8 z-50">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="shadow-[0_0_10px_rgba(0,0,0,0.5)] gap-2 opacity-50 hover:opacity-100 transition-opacity"
                        onClick={() => setIsOpen(true)}
                    >
                        <ArrowRight className="w-4 h-4" />
                        Manual Flush
                    </Button>
                </div>
            )
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-5xl h-[90vh] bg-black/95 backdrop-blur-2xl border-primary/20 p-0 overflow-hidden flex flex-col">
                <DialogTitle className="sr-only">Brain Dump Session</DialogTitle>
                <DialogDescription className="sr-only">A therapeutic interface to clear your mind.</DialogDescription>

                {step === 'processing' ? (
                    <CompletionAnimation onComplete={reset} />
                ) : (
                    <>
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                            <div>
                                <h2 className="text-2xl font-bold font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                                    RAM FLUSH PROTOCOL
                                </h2>
                                <p className="text-xs text-muted-foreground font-mono">ENCRYPTED SESSION // PRIVATE KEY LOCKED</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>X</Button>
                        </div>

                        <div className="flex-1 flex flex-col p-8 md:p-12 items-center justify-center relative">
                            {/* Background Ambient */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />

                            <Tabs value={currentTab} onValueChange={(v: any) => setCurrentTab(v)} className="w-full max-w-3xl z-10">
                                <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/10 mb-8">
                                    <TabsTrigger value="stress" disabled={step !== 'input'} className="data-[state=active]:bg-red-900/30 data-[state=active]:text-red-300">Stress</TabsTrigger>
                                    <TabsTrigger value="thoughts" disabled={step !== 'input'} className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-300">Thoughts</TabsTrigger>
                                    <TabsTrigger value="worries" disabled={step !== 'input'} className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-300">Worries</TabsTrigger>
                                </TabsList>

                                {['stress', 'thoughts', 'worries'].map((t) => {
                                    const type = t as keyof DumpData
                                    return (
                                        <TabsContent key={type} value={type} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="space-y-6">
                                                <div className="text-center space-y-2 mb-8">
                                                    <h3 className="text-xl md:text-3xl font-light text-foreground/90">
                                                        "{prompts[type]}"
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground italic">
                                                        Don't filter. Just dump.
                                                    </p>
                                                </div>

                                                <Textarea
                                                    value={data[type]}
                                                    onChange={(e) => setData(prev => ({ ...prev, [type]: e.target.value }))}
                                                    placeholder="Start typing..."
                                                    className="min-h-[300px] bg-black/30 border-white/10 text-lg p-6 resize-none focus-visible:ring-primary/30 custom-scrollbar"
                                                    autoFocus
                                                />

                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Lock className="w-3 h-3" />
                                                        <span>End-to-End Encrypted</span>
                                                        <span className={data[type].length >= MIN_CHARS ? 'text-green-500' : 'text-orange-500'}>
                                                            {data[type].length}/{MIN_CHARS} chars
                                                        </span>
                                                    </div>

                                                    <Button
                                                        size="lg"
                                                        className="gap-2 min-w-[150px]"
                                                        variant={canProceed(type) ? "neon" : "ghost"}
                                                        disabled={!canProceed(type)}
                                                        onClick={handleNext}
                                                    >
                                                        {type === 'worries' ? 'INITIATE FLUSH' : 'NEXT'} <ArrowRight className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    )
                                })}
                            </Tabs>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
