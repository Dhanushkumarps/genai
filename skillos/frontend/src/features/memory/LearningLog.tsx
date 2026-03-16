import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BrainCircuit, Save, X } from 'lucide-react'
import { useDraftPersistence, getDraft } from './useDraftPersistence'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import LogEntry from './LogEntry'
import LogTimeline from './LogTimeline'
import confetti from 'canvas-confetti'

const DRAFT_KEY = 'skillos_log_draft'

export default function LearningLog() {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<'capture' | 'history'>('capture')
    const [content, setContent] = useState('')
    const [tags, setTags] = useState<string[]>([])
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const { user } = useAuth()

    // Autosave hook setup
    useDraftPersistence(DRAFT_KEY, content)

    // Load draft on open
    useEffect(() => {
        if (isOpen && !content) {
            setContent(getDraft(DRAFT_KEY))
        }
    }, [isOpen])

    // Extract tags logic
    useEffect(() => {
        const extracted = content.match(/#[\w-]+/g) || []
        setTags(extracted.map(t => t.slice(1)))
    }, [content])

    // Keyboard Shortcut Global Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+Shift+L or Ctrl+Shift+L
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyL') {
                e.preventDefault()
                setIsOpen(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const fetchLogs = async () => {
        const { data } = await supabase.from('learning_logs').select('*').order('created_at', { ascending: false }).limit(50)
        if (data) setLogs(data)
    }

    const saveLog = async (closeAfter = false) => {
        if (!content.trim() || !user) return

        setLoading(true)
        try {
            const { data, error } = await supabase.from('learning_logs').insert({
                user_id: user.id,
                content,
                tags
            }).select().single()

            if (error) throw error

            // Trigger embedding generation in background (fire and forget for UI, but good to log)
            // Trigger embedding generation (Commented out until Edge Function is deployed)
            // supabase.functions.invoke('generate-embedding', {
            //     body: { log_id: data.id, content: data.content }
            // }).then(({ error }) => {
            //     if (error) console.error('Embedding generation failed:', error)
            // })

            // Success effects
            localStorage.removeItem(DRAFT_KEY)
            setContent('')
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#00f0ff', '#ffffff'] })

            // Boost energy if system_stats (simulation)
            // await supabase.rpc('increment_energy', { amount: 5 }) 

            if (closeAfter) {
                setIsOpen(false)
            } else {
                // Just clear and maybe show toast
            }
            fetchLogs() // refresh history
        } catch (err) {
            console.error('Failed to save log', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* FAB Trigger */}
            <Button
                variant="neon"
                size="icon"
                className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-[0_0_30px_var(--primary)] z-50 hover:scale-110 transition-transform"
                onClick={() => setIsOpen(true)}
            >
                <BrainCircuit className="h-6 w-6" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 border-white/10 bg-black/90 backdrop-blur-xl overflow-hidden glass-panel">

                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-4">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <span className="text-2xl">🧠</span> Neural Link
                            </DialogTitle>
                            <DialogDescription className="sr-only">Quickly capture learning logs or review history.</DialogDescription>
                            <div className="flex bg-secondary/10 rounded-lg p-1">
                                <button
                                    onClick={() => setMode('capture')}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'capture' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Capture
                                </button>
                                <button
                                    onClick={() => { setMode('history'); fetchLogs(); }}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'history' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Memory Bank
                                </button>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X size={18} /></Button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
                        {mode === 'capture' ? (
                            <LogEntry value={content} onChange={setContent} tags={tags} />
                        ) : (
                            <LogTimeline logs={logs} onSelect={(log) => { setContent(log.content); setMode('capture'); }} />
                        )}
                    </div>

                    {/* Footer Actions (Only in capture mode) */}
                    {mode === 'capture' && (
                        <div className="p-4 border-t border-white/10 flex justify-between items-center bg-black/40">
                            <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                                Protip: Use #tags to categorize
                            </span>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button variant="ghost" onClick={() => saveLog(false)} disabled={loading || !content.trim()}>
                                    Save & Continue
                                </Button>
                                <Button variant="neon" onClick={() => saveLog(true)} disabled={loading || !content.trim()} className="flex-1 sm:flex-none gap-2">
                                    <Save size={16} /> Save & Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
