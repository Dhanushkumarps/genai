import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
    FileText, Download, Trash2, Star, StarOff,
    Loader2, Search, Calendar, Tag, Clock
} from 'lucide-react'

interface SmartNote {
    id: string
    title: string
    content: string
    topics: string[]
    source_count: number
    is_favorite: boolean
    created_at: string
    session_started_at?: string
    session_ended_at?: string
}

export default function ResourcesPage() {
    const { user } = useAuth()
    const [notes, setNotes] = useState<SmartNote[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedNote, setSelectedNote] = useState<SmartNote | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        if (!user?.id) return
        fetchNotes()
    }, [user?.id])

    const fetchNotes = async () => {
        setLoading(true)
        // Fetch notes with session times
        const { data, error } = await supabase
            .from('smart_notes')
            .select(`
                *,
                browsing_sessions (
                    started_at,
                    ended_at
                )
            `)
            .order('created_at', { ascending: false })

        if (!error && data) {
            // Map the nested session data to flat structure
            const notesWithTimes = data.map((note: any) => ({
                ...note,
                session_started_at: note.browsing_sessions?.started_at,
                session_ended_at: note.browsing_sessions?.ended_at
            }))
            setNotes(notesWithTimes)
        }
        setLoading(false)
    }

    const toggleFavorite = async (note: SmartNote) => {
        const newValue = !note.is_favorite
        await supabase.from('smart_notes').update({ is_favorite: newValue }).eq('id', note.id)
        setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_favorite: newValue } : n))
        if (selectedNote?.id === note.id) {
            setSelectedNote({ ...selectedNote, is_favorite: newValue })
        }
    }

    const deleteNote = async (id: string) => {
        await supabase.from('smart_notes').delete().eq('id', id)
        setNotes(prev => prev.filter(n => n.id !== id))
        if (selectedNote?.id === id) setSelectedNote(null)
    }

    const exportToPdf = async (note: SmartNote) => {
        setIsExporting(true)

        // Format session times
        const sessionStart = note.session_started_at
            ? new Date(note.session_started_at).toLocaleString()
            : 'N/A'
        const sessionEnd = note.session_ended_at
            ? new Date(note.session_ended_at).toLocaleString()
            : 'Ongoing'
        const fileName = `${note.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

        try {
            // Dynamic import for PDF generation
            const { default: html2pdf } = await import('html2pdf.js')

            const element = document.createElement('div')
            element.innerHTML = `
                <div style="font-family: system-ui, sans-serif; padding: 40px; max-width: 800px;">
                    <h1 style="color: #1a1a1a; margin-bottom: 8px;">${note.title}</h1>
                    <p style="color: #666; font-size: 12px; margin-bottom: 8px;">
                        Created: ${new Date(note.created_at).toLocaleString()}
                    </p>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 24px;">
                        <p style="color: #444; font-size: 12px; margin: 0;">
                            <strong>Session Times</strong><br/>
                            Started: ${sessionStart}<br/>
                            Ended: ${sessionEnd}<br/>
                            Sources: ${note.source_count}
                        </p>
                    </div>
                    <div style="line-height: 1.6; color: #333;">
                        ${note.content.split('\n').map(line => {
                if (line.startsWith('# ')) return `<h1 style="margin-top: 24px;">${line.slice(2)}</h1>`
                if (line.startsWith('## ')) return `<h2 style="margin-top: 20px; color: #444;">${line.slice(3)}</h2>`
                if (line.startsWith('• ') || line.startsWith('- ')) return `<li>${line.slice(2)}</li>`
                if (line.trim() === '') return '<br/>'
                return `<p>${line}</p>`
            }).join('')}
                    </div>
                    ${note.topics.length ? `
                        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
                            <p style="color: #888; font-size: 11px;">Topics: ${note.topics.join(', ')}</p>
                        </div>
                    ` : ''}
                </div>
            `

            const opt = {
                margin: 0.5,
                filename: fileName,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
            }

            await html2pdf().set(opt).from(element).save()
        } catch (err) {
            console.error('PDF export failed:', err)
            // Fallback: download as markdown
            const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.md`
            a.click()
        } finally {
            setIsExporting(false)
        }
    }

    const filteredNotes = notes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.topics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const formatDate = (date: string) => {
        const d = new Date(date)
        const now = new Date()
        const diff = now.getTime() - d.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))

        if (days === 0) return 'Today'
        if (days === 1) return 'Yesterday'
        if (days < 7) return `${days} days ago`
        return d.toLocaleDateString()
    }

    return (
        <div className="flex h-[calc(100vh-80px)] gap-4">
            {/* Notes List */}
            <div className="w-80 flex flex-col bg-[#1A1D20] border border-[rgba(255,255,255,0.04)] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
                    <h2 className="text-lg font-semibold text-[#E8E6E3] mb-3">Smart Notes</h2>
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#23262A] rounded-lg">
                        <Search className="w-4 h-4 text-[#4A4845]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search notes..."
                            className="flex-1 bg-transparent text-[#E8E6E3] placeholder:text-[#4A4845] outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-[#C49B3A] animate-spin" />
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="text-center py-8">
                            <FileText className="w-10 h-10 text-[#4A4845] mx-auto mb-2" />
                            <p className="text-[#6B6966] text-sm">No notes yet</p>
                            <p className="text-[#4A4845] text-xs mt-1">Generate notes from the browser</p>
                        </div>
                    ) : (
                        filteredNotes.map(note => (
                            <button
                                key={note.id}
                                onClick={() => setSelectedNote(note)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg transition-colors",
                                    selectedNote?.id === note.id
                                        ? "bg-[rgba(196,155,58,0.15)] border border-[rgba(196,155,58,0.3)]"
                                        : "hover:bg-[#23262A] border border-transparent"
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#E8E6E3] truncate">{note.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar className="w-3 h-3 text-[#6B6966]" />
                                            <span className="text-[10px] text-[#6B6966]">{formatDate(note.created_at)}</span>
                                            <span className="text-[10px] text-[#4A4845]">•</span>
                                            <span className="text-[10px] text-[#6B6966]">{note.source_count} sources</span>
                                        </div>
                                    </div>
                                    {note.is_favorite && <Star className="w-3.5 h-3.5 text-[#C49B3A] flex-shrink-0" />}
                                </div>
                                {note.topics.length > 0 && (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                        {note.topics.slice(0, 3).map(topic => (
                                            <span key={topic} className="px-1.5 py-0.5 text-[9px] bg-[rgba(196,155,58,0.1)] text-[#C49B3A] rounded">
                                                {topic}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Note Preview */}
            <div className="flex-1 flex flex-col bg-[#1A1D20] border border-[rgba(255,255,255,0.04)] rounded-xl overflow-hidden">
                <AnimatePresence mode="wait">
                    {selectedNote ? (
                        <motion.div
                            key={selectedNote.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.04)]">
                                <div>
                                    <h1 className="text-xl font-semibold text-[#E8E6E3]">{selectedNote.title}</h1>
                                    <p className="text-xs text-[#6B6966] mt-1">
                                        {new Date(selectedNote.created_at).toLocaleDateString()} • {selectedNote.source_count} sources
                                    </p>
                                    {selectedNote.session_started_at && (
                                        <div className="flex items-center gap-3 mt-2 text-[10px] text-[#4A4845]">
                                            <span>Session: {new Date(selectedNote.session_started_at).toLocaleTimeString()}</span>
                                            <span>→</span>
                                            <span>{selectedNote.session_ended_at ? new Date(selectedNote.session_ended_at).toLocaleTimeString() : 'Ongoing'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => toggleFavorite(selectedNote)}
                                        className="p-2 rounded-lg hover:bg-[#23262A] text-[#6B6966]"
                                        title={selectedNote.is_favorite ? "Remove from favorites" : "Add to favorites"}
                                    >
                                        {selectedNote.is_favorite ? (
                                            <Star className="w-4 h-4 text-[#C49B3A] fill-[#C49B3A]" />
                                        ) : (
                                            <StarOff className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => exportToPdf(selectedNote)}
                                        disabled={isExporting}
                                        className="p-2 rounded-lg bg-[rgba(90,154,90,0.15)] text-[#5A9A5A] hover:bg-[rgba(90,154,90,0.25)]"
                                        title="Download as PDF"
                                    >
                                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => deleteNote(selectedNote.id)}
                                        className="p-2 rounded-lg hover:bg-[rgba(184,84,80,0.15)] text-[#6B6966] hover:text-[#B85450]"
                                        title="Delete note"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="prose prose-invert max-w-none">
                                    {selectedNote.content.split('\n').map((line, i) => {
                                        if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-[#E8E6E3] mt-6 mb-3">{line.slice(2)}</h1>
                                        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-[#C49B3A] mt-5 mb-2">{line.slice(3)}</h2>
                                        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-medium text-[#E8E6E3] mt-4 mb-2">{line.slice(4)}</h3>
                                        if (line.startsWith('• ') || line.startsWith('- ')) return <li key={i} className="text-[#9A9996] ml-4">{line.slice(2)}</li>
                                        if (line.trim() === '') return <br key={i} />
                                        return <p key={i} className="text-[#9A9996] mb-2">{line}</p>
                                    })}
                                </div>

                                {selectedNote.topics.length > 0 && (
                                    <div className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.04)]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Tag className="w-3.5 h-3.5 text-[#6B6966]" />
                                            <span className="text-xs text-[#6B6966]">Topics</span>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {selectedNote.topics.map(topic => (
                                                <span key={topic} className="px-2 py-1 text-xs bg-[rgba(196,155,58,0.1)] text-[#C49B3A] rounded-lg">
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex items-center justify-center"
                        >
                            <div className="text-center">
                                <FileText className="w-16 h-16 text-[#23262A] mx-auto mb-4" />
                                <p className="text-[#6B6966]">Select a note to preview</p>
                                <p className="text-[#4A4845] text-sm mt-1">Or generate notes from the Learning Browser</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
