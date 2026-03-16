import { useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Sparkles } from 'lucide-react'
import { useVoiceInput } from './useVoiceInput'
import { Badge } from '@/components/ui/badge'

interface LogEntryProps {
    value: string
    onChange: (val: string) => void
    tags: string[]
}

export default function LogEntry({ value, onChange, tags }: LogEntryProps) {
    const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useVoiceInput()
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Sync voice transcript to text
    useEffect(() => {
        if (transcript) {
            onChange(value + (value && !value.endsWith(' ') ? ' ' : '') + transcript)
            resetTranscript()
        }
    }, [transcript, onChange, resetTranscript, value])

    // Auto-focus on mount
    useEffect(() => {
        textareaRef.current?.focus()
    }, [])

    return (
        <div className="relative group">
            <div className="absolute right-2 top-2 z-10 flex gap-2">
                {isSupported && (
                    <Button
                        size="icon"
                        variant={isListening ? "destructive" : "ghost"}
                        className={`h-8 w-8 rounded-full transition-all ${isListening ? 'animate-pulse shadow-[0_0_10px_red]' : 'hover:bg-primary/10'}`}
                        onClick={isListening ? stopListening : startListening}
                        title="Voice Input"
                    >
                        {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    </Button>
                )}
            </div>

            <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="What did you learn today? (Type or speak...)"
                className="min-h-[200px] text-lg p-6 resize-none font-mono bg-black/40 border-none focus-visible:ring-0 leading-relaxed custom-scrollbar"
                style={{
                    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)'
                }}
            />

            {/* Tag Suggestions Overlay */}
            <div className="flex gap-2 p-2 min-h-[40px] flex-wrap items-center">
                {tags.length > 0 ? tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 opacity-80">#{tag}</Badge>
                )) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 opacity-50"><Sparkles size={10} /> AI Tagging Active</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground font-mono">{value.length} chars</span>
            </div>
        </div>
    )
}
