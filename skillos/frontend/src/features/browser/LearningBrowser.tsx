import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBrowserSession } from './useBrowserSession'
import {
    Globe, ArrowLeft, ArrowRight, RotateCw, Home, Search,
    MessageCircle, Mic, MicOff, X,
    Send, Sparkles, ExternalLink, Star, Eye, Camera, Upload,
    Volume2, VolumeX, Loader2, AlertTriangle, Clipboard,
    BookOpen, Code, Database, Lightbulb, TrendingUp, Play, Youtube, Scan, FileDown, Layers, Zap
} from 'lucide-react'
import { ContextPanel, type BridgeAnalysis } from './ContextPanel'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
    isVoice?: boolean
    image?: string
}

interface SiteRecommendation {
    url: string
    title: string
    description: string
    icon: React.ReactNode
    color: string
    external?: boolean
}

export default function LearningBrowser() {
    const { user } = useAuth()
    const [searchParams] = useSearchParams()

    // Auto-analysis state
    const autoAnalyze = searchParams.get('autoAnalyze') === 'true'
    const initialUrl = searchParams.get('url') || ''
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [url, setUrl] = useState(initialUrl)
    const [inputUrl, setInputUrl] = useState(initialUrl)
    const [isLoading, setIsLoading] = useState(false)
    const [pageContent, setPageContent] = useState<string | null>(null)
    const [pageTitle, setPageTitle] = useState('')
    const [pageText, setPageText] = useState('')
    const [history, setHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [showHome, setShowHome] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [showAssistant, setShowAssistant] = useState(true)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)

    // Initial Load & Auto Analysis
    useEffect(() => {
        if (initialUrl && !url) {
            navigateTo(initialUrl)
        }
        if (autoAnalyze) {
            setContextPanelOpen(true)
            setIsAnalyzing(true)
        }
    }, [initialUrl])

    // Trigger analysis once content is loaded if requested
    useEffect(() => {
        if (autoAnalyze && pageText && !bridgeAnalysis) {
            onAnalyzeGap()
        }
    }, [pageText, autoAnalyze])
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Screenshot upload state
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [pendingImage, setPendingImage] = useState<string | null>(null)
    const [isProcessingImage, setIsProcessingImage] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [addToContextToggle, _setAddToContextToggle] = useState(true)
    const [screenshotAction, setScreenshotAction] = useState<'choice' | 'quick' | 'question' | 'detailed' | null>(null)
    const [screenshotQuestion, setScreenshotQuestion] = useState('')

    // Notes preference modal state
    const [showNotesModal, setShowNotesModal] = useState(false)
    const [notesFormat, setNotesFormat] = useState<'concise' | 'standard' | 'detailed' | 'custom'>('standard')
    const [customNotesInstructions, setCustomNotesInstructions] = useState('')

    // Session context
    const {
        contextCount,
        addToContext,
        generateNotes,
        isGeneratingNotes,
        analyzeGap
    } = useBrowserSession()

    // Context Bridge State
    const [contextPanelOpen, setContextPanelOpen] = useState(false)
    const [bridgeAnalysis, setBridgeAnalysis] = useState<BridgeAnalysis | null>(null)

    const onAnalyzeGap = async () => {
        if (!pageText) return
        setIsAnalyzing(true)
        setContextPanelOpen(true)
        setBridgeAnalysis(null) // Reset previous

        try {
            const result = await analyzeGap(pageText, url)
            if (result) setBridgeAnalysis(result)
        } catch (e) {
            console.error(e)
        } finally {
            setIsAnalyzing(false)
        }
    }

    const embeddableSites: SiteRecommendation[] = [
        { url: 'https://developer.mozilla.org', title: 'MDN', description: 'Web docs', icon: <BookOpen className="w-5 h-5" />, color: '#3B82F6' },
        { url: 'https://javascript.info', title: 'JS.info', description: 'Tutorial', icon: <Lightbulb className="w-5 h-5" />, color: '#F7DF1E' },
        { url: 'https://www.w3schools.com', title: 'W3Schools', description: 'Tutorials', icon: <Code className="w-5 h-5" />, color: '#04AA6D' },
        { url: 'https://css-tricks.com', title: 'CSS-Tricks', description: 'CSS', icon: <Code className="w-5 h-5" />, color: '#FF7A59' },
        { url: 'https://roadmap.sh', title: 'Roadmap', description: 'Paths', icon: <Star className="w-5 h-5" />, color: '#E8B400' },
        { url: 'https://dev.to', title: 'DEV', description: 'Articles', icon: <TrendingUp className="w-5 h-5" />, color: '#3B49DF' },
    ]

    const externalSites: SiteRecommendation[] = [
        { url: 'https://leetcode.com', title: 'LeetCode', description: 'Practice', icon: <Play className="w-5 h-5" />, color: '#FFA116', external: true },
        { url: 'https://www.youtube.com/results?search_query=programming+tutorial', title: 'YouTube', description: 'Videos', icon: <Youtube className="w-5 h-5" />, color: '#FF0000', external: true },
        { url: 'https://www.freecodecamp.org', title: 'fCC', description: 'Courses', icon: <Code className="w-5 h-5" />, color: '#0A0A23', external: true },
        { url: 'https://github.com', title: 'GitHub', description: 'Code', icon: <Database className="w-5 h-5" />, color: '#6E5494', external: true },
    ]

    const extractTextFromHtml = (html: string): string => {
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 5000)
    }

    // Extract YouTube video ID from various URL formats
    const getYouTubeVideoId = (videoUrl: string): string | null => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
            /youtube\.com\/shorts\/([^&?/]+)/,
            /youtube\.com\/v\/([^&?/]+)/
        ]
        for (const pattern of patterns) {
            const match = videoUrl.match(pattern)
            if (match) return match[1]
        }
        return null
    }

    // Check if URL is YouTube
    const isYouTubeUrl = (videoUrl: string): boolean => {
        return /(?:youtube\.com|youtu\.be)/.test(videoUrl)
    }

    const navigateTo = useCallback(async (targetUrl: string) => {
        let finalUrl = targetUrl.trim()
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = finalUrl.includes('.') ? 'https://' + finalUrl : `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`
        }

        setUrl(finalUrl)
        setInputUrl(finalUrl)
        setIsLoading(true)
        setShowHome(false)
        setPageContent(null)
        setPageText('')
        setLoadError(null)

        if (history[historyIndex] !== finalUrl) {
            const newHistory = [...history.slice(0, historyIndex + 1), finalUrl]
            setHistory(newHistory)
            setHistoryIndex(newHistory.length - 1)
        }

        // Special handling for YouTube - use native embed
        if (isYouTubeUrl(finalUrl)) {
            const videoId = getYouTubeVideoId(finalUrl)
            if (videoId) {
                const embedHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <title>YouTube Video</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { background: #0f0f0f; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                            .player-container { width: 100%; max-width: 900px; aspect-ratio: 16/9; }
                            iframe { width: 100%; height: 100%; border: none; border-radius: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="player-container">
                            <iframe 
                                src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowfullscreen>
                            </iframe>
                        </div>
                    </body>
                    </html>
                `
                setPageContent(embedHtml)
                setPageTitle('YouTube Video')
                setPageText(`YouTube video: ${videoId}`)
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `▶️ **YouTube video loaded!** Video is playing. Ask me anything about it.`
                }])
                setIsLoading(false)
                return
            }
        }

        try {
            const { data, error } = await supabase.functions.invoke('browser-proxy', { body: { url: finalUrl } })
            if (error) throw new Error(error.message)

            if (data?.success && data?.html?.length > 1000) {
                setPageContent(data.html)
                setPageTitle(data.title || new URL(finalUrl).hostname)
                setPageText(extractTextFromHtml(data.html))
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `📖 **${data.title}** loaded! Ask me anything about this page.`
                }])
            } else throw new Error('Page blocked')
        } catch (err: any) {
            setLoadError('Site blocked. Opening externally...')
            setTimeout(() => window.open(finalUrl, '_blank'), 1500)
        } finally {
            setIsLoading(false)
        }
    }, [history, historyIndex])

    // Handle paste from clipboard (for screenshots)
    const handlePaste = useCallback(async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault()
                const blob = items[i].getAsFile()
                if (!blob) continue

                const reader = new FileReader()
                reader.onload = (event) => {
                    const base64 = event.target?.result as string
                    setPendingImage(base64)
                    setShowUploadModal(true)
                }
                reader.readAsDataURL(blob)
                break
            }
        }
    }, [])

    // Add paste listener
    useState(() => {
        document.addEventListener('paste', handlePaste)
        return () => document.removeEventListener('paste', handlePaste)
    })

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !file.type.startsWith('image/')) return

        const reader = new FileReader()
        reader.onload = (event) => {
            setPendingImage(event.target?.result as string)
            setShowUploadModal(true)
        }
        reader.readAsDataURL(file)
    }

    // Open screenshot modal
    const openScreenshotHelper = () => {
        setShowUploadModal(true)
    }

    // Send image to AI for analysis with specific action
    const analyzeImage = async (action: 'quick' | 'question' | 'detailed' | 'save' = 'quick') => {
        if (!pendingImage) return

        // Save only - no AI analysis
        if (action === 'save') {
            addToContext({
                type: 'screenshot',
                content: 'Screenshot saved (no analysis)',
                imageData: pendingImage.replace(/^data:image\/\w+;base64,/, ''),
                pageUrl: url,
                pageTitle: pageTitle
            })
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '💾 Screenshot saved to session notes!'
            }])
            setShowUploadModal(false)
            setPendingImage(null)
            setScreenshotAction(null)
            return
        }

        setIsProcessingImage(true)
        const shouldAddToContext = addToContextToggle

        // Add to chat with thumbnail
        const actionLabel = action === 'quick' ? '⚡ Quick summary' : action === 'question' ? `❓ ${screenshotQuestion}` : '📖 Detailed analysis'
        setMessages(prev => [...prev, {
            role: 'user',
            content: actionLabel,
            image: pendingImage
        }])

        setShowUploadModal(false)
        const imageToSend = pendingImage
        const questionToSend = screenshotQuestion
        setPendingImage(null)
        setScreenshotAction(null)
        setScreenshotQuestion('')
        setIsTyping(true)

        try {
            const base64 = imageToSend.replace(/^data:image\/\w+;base64,/, '')

            const { data, error } = await supabase.functions.invoke('browser-vision', {
                body: {
                    action: action === 'question' ? 'explain' : 'analyze',
                    imageBase64: base64,
                    context: pageTitle ? `Page: ${pageTitle}` : undefined,
                    question: action === 'question' ? questionToSend : undefined
                }
            })

            if (!error && data?.success) {
                // Add to context if toggle is on
                if (shouldAddToContext) {
                    addToContext({
                        type: 'screenshot',
                        content: data.result.slice(0, 500),
                        imageData: base64,
                        pageUrl: url,
                        pageTitle: pageTitle
                    })
                }

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `${data.result}${shouldAddToContext ? '\n\n✅ Saved' : ''}`
                }])
            } else throw new Error(error?.message || 'Analysis failed')
        } catch (err: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ Couldn't analyze: ${err.message}`
            }])
        } finally {
            setIsProcessingImage(false)
            setIsTyping(false)
        }
    }

    // Generate notes with selected format
    const handleGenerateNotes = async () => {
        const note = await generateNotes(notesFormat, notesFormat === 'custom' ? customNotesInstructions : undefined)
        if (note) {
            const formatLabel = { concise: '📝 Quick', standard: '📄 Standard', detailed: '📚 Detailed', custom: '✏️ Custom' }[notesFormat]
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `${formatLabel} **Notes Generated**\n\n${note.content.slice(0, 600)}...\n\n💾 Saved to Resources`
            }])
        }
        setShowNotesModal(false)
        setCustomNotesInstructions('')
    }

    const analyzePage = async () => {
        if (!pageText) return
        setIsAnalyzing(true)
        setMessages(prev => [...prev, { role: 'assistant', content: '🔍 Analyzing...' }])

        try {
            const { data, error } = await supabase.functions.invoke('browser-assistant', {
                body: { action: 'summarize_page', pageContent: pageText, currentUrl: url }
            })

            if (!error && data?.summary) {
                setMessages(prev => [...prev.slice(0, -1), {
                    role: 'assistant',
                    content: `📄 **Summary:**\n\n${data.summary}`
                }])
            } else throw new Error()
        } catch {
            setMessages(prev => [...prev.slice(0, -1), {
                role: 'assistant',
                content: `📖 This is **${pageTitle}**. Ask me anything!`
            }])
        } finally { setIsAnalyzing(false) }
    }

    const openExternal = (u?: string) => window.open(u || url, '_blank')
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (inputUrl.trim()) navigateTo(inputUrl.trim()) }
    const goBack = () => historyIndex > 0 && navigateTo(history[historyIndex - 1])
    const goForward = () => historyIndex < history.length - 1 && navigateTo(history[historyIndex + 1])
    const refresh = () => url && navigateTo(url)
    const goHome = () => { setUrl(''); setInputUrl(''); setPageContent(null); setPageText(''); setShowHome(true); setLoadError(null) }

    const sendMessage = async (content: string, isVoice = false) => {
        if (!content.trim()) return
        setMessages(prev => [...prev, { role: 'user', content, isVoice }])
        setInputMessage('')
        setIsTyping(true)

        try {
            const { data, error } = await supabase.functions.invoke('browser-assistant', {
                body: { action: 'chat', userId: user?.id, message: content, currentUrl: url, pageTitle, pageContent: pageText }
            })
            if (!error && data?.response) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
                if (isVoice && isSpeaking) speakText(data.response)
            } else throw new Error()
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant', content: pageText
                    ? `📖 I can see **${pageTitle}**. What would you like to know?`
                    : "Browse a site and use 📷 to capture content!"
            }])
        } finally { setIsTyping(false) }
    }

    const startVoiceInput = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) return alert('Voice not supported')
        const r = new SR()
        r.onstart = () => setIsRecording(true)
        r.onresult = async (e: any) => await sendMessage(e.results[0][0].transcript, true)
        r.onerror = r.onend = () => setIsRecording(false)
        r.start()
    }

    const speakText = (t: string) => {
        if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(t.replace(/[*#\[\]()]/g, '')))
    }

    return (
        <div className="flex h-[calc(100vh-80px)] gap-4">
            {/* Screenshot Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowUploadModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="bg-[#1A1D20] rounded-2xl p-6 max-w-lg w-full border border-[rgba(255,255,255,0.1)]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[rgba(196,155,58,0.15)] flex items-center justify-center">
                                    <Camera className="w-5 h-5 text-[#C49B3A]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#E8E6E3]">Screenshot Analysis</h3>
                                    <p className="text-sm text-[#6B6966]">AI will extract text and explain the content</p>
                                </div>
                            </div>

                            {pendingImage ? (
                                <div className="mb-4">
                                    <img src={pendingImage} alt="Screenshot" className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] max-h-64 object-contain bg-white" />
                                    <p className="text-xs text-[#6B6966] mt-2 text-center">Image ready for analysis</p>
                                </div>
                            ) : (
                                <div className="mb-4 space-y-4">
                                    <div className="p-4 bg-[#23262A] rounded-xl text-center">
                                        <Clipboard className="w-8 h-8 text-[#C49B3A] mx-auto mb-2" />
                                        <p className="text-[#E8E6E3] font-medium mb-1">Option 1: Paste Screenshot</p>
                                        <p className="text-xs text-[#6B6966]">Press <kbd className="px-1.5 py-0.5 bg-[#1A1D20] rounded">Win+Shift+S</kbd> → Select area → <kbd className="px-1.5 py-0.5 bg-[#1A1D20] rounded">Ctrl+V</kbd> here</p>
                                    </div>

                                    <div className="text-center text-[#6B6966] text-xs">— OR —</div>

                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="w-full p-4 bg-[#23262A] hover:bg-[#2A2E33] rounded-xl text-center border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[#C49B3A] transition">
                                        <Upload className="w-8 h-8 text-[#9A9996] mx-auto mb-2" />
                                        <p className="text-[#E8E6E3] font-medium mb-1">Option 2: Upload Image</p>
                                        <p className="text-xs text-[#6B6966]">Click to browse files</p>
                                    </button>
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                </div>
                            )}

                            {pendingImage && (
                                <div className="space-y-3">
                                    {/* Action Buttons */}
                                    <p className="text-xs text-[#9A9996] text-center">What would you like to do?</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => analyzeImage('quick')} disabled={isProcessingImage}
                                            className="p-3 bg-[#23262A] hover:bg-[#2A2E33] rounded-xl text-left border border-[rgba(255,255,255,0.05)] hover:border-[#C49B3A] transition">
                                            <span className="text-lg">⚡</span>
                                            <p className="text-sm text-[#E8E6E3] font-medium">Quick Summary</p>
                                            <p className="text-[10px] text-[#6B6966]">2-3 bullet points</p>
                                        </button>
                                        <button onClick={() => setScreenshotAction('question')} disabled={isProcessingImage}
                                            className={cn("p-3 bg-[#23262A] hover:bg-[#2A2E33] rounded-xl text-left border transition",
                                                screenshotAction === 'question' ? "border-[#C49B3A]" : "border-[rgba(255,255,255,0.05)] hover:border-[#C49B3A]")}>
                                            <span className="text-lg">❓</span>
                                            <p className="text-sm text-[#E8E6E3] font-medium">Ask Question</p>
                                            <p className="text-[10px] text-[#6B6966]">Specific query</p>
                                        </button>
                                        <button onClick={() => analyzeImage('detailed')} disabled={isProcessingImage}
                                            className="p-3 bg-[#23262A] hover:bg-[#2A2E33] rounded-xl text-left border border-[rgba(255,255,255,0.05)] hover:border-[#C49B3A] transition">
                                            <span className="text-lg">📖</span>
                                            <p className="text-sm text-[#E8E6E3] font-medium">Detailed</p>
                                            <p className="text-[10px] text-[#6B6966]">Full breakdown</p>
                                        </button>
                                        <button onClick={() => analyzeImage('save')} disabled={isProcessingImage}
                                            className="p-3 bg-[#23262A] hover:bg-[#2A2E33] rounded-xl text-left border border-[rgba(255,255,255,0.05)] hover:border-[#C49B3A] transition">
                                            <span className="text-lg">💾</span>
                                            <p className="text-sm text-[#E8E6E3] font-medium">Just Save</p>
                                            <p className="text-[10px] text-[#6B6966]">No analysis</p>
                                        </button>
                                    </div>

                                    {/* Question input */}
                                    {screenshotAction === 'question' && (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={screenshotQuestion}
                                                onChange={(e) => setScreenshotQuestion(e.target.value)}
                                                placeholder="What do you want to know?"
                                                className="flex-1 px-3 py-2 bg-[#23262A] rounded-lg text-sm text-[#E8E6E3] placeholder:text-[#6B6966] outline-none border border-[rgba(255,255,255,0.1)] focus:border-[#C49B3A]"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => analyzeImage('question')}
                                                disabled={!screenshotQuestion.trim() || isProcessingImage}
                                                className="px-4 py-2 bg-[#C49B3A] hover:bg-[#D4AB4A] rounded-lg text-black text-sm font-medium disabled:opacity-50">
                                                Ask
                                            </button>
                                        </div>
                                    )}

                                    {isProcessingImage && (
                                        <div className="flex items-center justify-center gap-2 py-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-[#C49B3A]" />
                                            <span className="text-xs text-[#6B6966]">Processing...</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2 mt-4">
                                <button onClick={() => { setShowUploadModal(false); setPendingImage(null); setScreenshotAction(null); setScreenshotQuestion('') }}
                                    className="flex-1 px-4 py-2.5 bg-[#23262A] hover:bg-[#2A2E33] rounded-lg text-[#9A9996] text-sm">
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notes Preference Modal */}
            <AnimatePresence>
                {showNotesModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowNotesModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="bg-[#1A1D20] rounded-2xl p-6 max-w-md w-full border border-[rgba(255,255,255,0.1)]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[rgba(90,154,90,0.15)] flex items-center justify-center">
                                    <FileDown className="w-5 h-5 text-[#5A9A5A]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#E8E6E3]">Save Notes</h3>
                                    <p className="text-sm text-[#6B6966]">Choose your preferred format</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                {[
                                    { id: 'concise' as const, icon: '📝', title: 'Concise', desc: 'Quick bullet points' },
                                    { id: 'standard' as const, icon: '📄', title: 'Standard', desc: 'Balanced overview' },
                                    { id: 'detailed' as const, icon: '📚', title: 'Detailed', desc: 'Full elaboration' },
                                    { id: 'custom' as const, icon: '✏️', title: 'Custom', desc: 'Your instructions' }
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setNotesFormat(opt.id)}
                                        className={cn(
                                            "w-full p-3 rounded-xl text-left border transition flex items-center gap-3",
                                            notesFormat === opt.id
                                                ? "bg-[rgba(90,154,90,0.15)] border-[#5A9A5A]"
                                                : "bg-[#23262A] border-[rgba(255,255,255,0.05)] hover:border-[#5A9A5A]"
                                        )}>
                                        <span className="text-lg">{opt.icon}</span>
                                        <div>
                                            <p className="text-sm text-[#E8E6E3] font-medium">{opt.title}</p>
                                            <p className="text-[10px] text-[#6B6966]">{opt.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {notesFormat === 'custom' && (
                                <textarea
                                    value={customNotesInstructions}
                                    onChange={(e) => setCustomNotesInstructions(e.target.value)}
                                    placeholder="Describe how you'd like your notes formatted..."
                                    className="w-full mb-4 px-3 py-2 bg-[#23262A] rounded-lg text-sm text-[#E8E6E3] placeholder:text-[#6B6966] outline-none border border-[rgba(255,255,255,0.1)] focus:border-[#5A9A5A] resize-none h-20"
                                />
                            )}

                            <div className="flex gap-2">
                                <button onClick={() => { setShowNotesModal(false); setCustomNotesInstructions('') }}
                                    className="flex-1 px-4 py-2.5 bg-[#23262A] hover:bg-[#2A2E33] rounded-lg text-[#9A9996] text-sm">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateNotes}
                                    disabled={isGeneratingNotes || (notesFormat === 'custom' && !customNotesInstructions.trim())}
                                    className="flex-1 px-4 py-2.5 bg-[#5A9A5A] hover:bg-[#6AAA6A] rounded-lg text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isGeneratingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                    Generate
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Browser */}
            <div className="flex-1 flex flex-col">
                {/* URL Bar */}
                <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.04)] rounded-xl p-3 mb-4">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={goBack} disabled={historyIndex <= 0} className="p-2 rounded-lg hover:bg-[#23262A] disabled:opacity-30">
                                <ArrowLeft className="w-4 h-4 text-[#9A9996]" /></button>
                            <button type="button" onClick={goForward} disabled={historyIndex >= history.length - 1} className="p-2 rounded-lg hover:bg-[#23262A] disabled:opacity-30">
                                <ArrowRight className="w-4 h-4 text-[#9A9996]" /></button>
                            <button type="button" onClick={refresh} className="p-2 rounded-lg hover:bg-[#23262A]">
                                <RotateCw className={cn("w-4 h-4 text-[#9A9996]", isLoading && "animate-spin")} /></button>
                            <button type="button" onClick={goHome} className="p-2 rounded-lg hover:bg-[#23262A]">
                                <Home className="w-4 h-4 text-[#9A9996]" /></button>
                        </div>
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#23262A] rounded-lg">
                            {url ? <Globe className="w-4 h-4 text-[#5A9A5A]" /> : <Search className="w-4 h-4 text-[#4A4845]" />}
                            <input type="text" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)}
                                placeholder="Search or enter URL..." className="flex-1 bg-transparent text-[#E8E6E3] placeholder:text-[#4A4845] outline-none text-sm" />
                        </div>

                        {/* Screenshot button */}
                        <button type="button" onClick={openScreenshotHelper}
                            className="p-2 rounded-lg bg-[rgba(196,155,58,0.15)] text-[#C49B3A] hover:bg-[rgba(196,155,58,0.25)]" title="📷 Capture & Analyze (Ctrl+V to paste)">
                            <Camera className="w-4 h-4" />
                        </button>

                        {pageText && (
                            <button type="button" onClick={analyzePage} disabled={isAnalyzing}
                                className="p-2 rounded-lg bg-[rgba(90,154,90,0.15)] text-[#5A9A5A] hover:bg-[rgba(90,154,90,0.25)] disabled:opacity-50" title="Analyze Page">
                                <Scan className={cn("w-4 h-4", isAnalyzing && "animate-pulse")} />
                            </button>
                        )}

                        <button type="button" onClick={onAnalyzeGap} disabled={isAnalyzing || !pageText}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                isAnalyzing ? "animate-pulse" : "",
                                !pageText ? "text-gray-600 cursor-not-allowed opacity-50" : "bg-[rgba(168,85,247,0.15)] text-purple-400 hover:bg-[rgba(168,85,247,0.25)]"
                            )}
                            title={!pageText ? "Navigate to a page to analyze skills" : "Contextual Skill Bridge (Analyze Gap)"}>
                            <Zap className="w-4 h-4" />
                        </button>

                        {pageText && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-[rgba(196,155,58,0.1)] rounded-lg">
                                <Eye className="w-3 h-3 text-[#C49B3A]" />
                                <span className="text-[10px] text-[#C49B3A]">AI</span>
                            </div>
                        )}

                        {url && <button type="button" onClick={() => openExternal()} className="p-2 rounded-lg hover:bg-[#C49B3A] text-[#9A9996]">
                            <ExternalLink className="w-4 h-4" /></button>}
                        <button type="button" onClick={() => setShowAssistant(!showAssistant)}
                            className={cn("p-2 rounded-lg", showAssistant ? "bg-[#C49B3A] text-black" : "hover:bg-[#23262A] text-[#9A9996]")}>
                            <MessageCircle className="w-4 h-4" /></button>
                    </form>
                </div>

                {/* Content */}
                <div className="flex-1 bg-[#1A1D20] border border-[rgba(255,255,255,0.04)] rounded-xl overflow-hidden">
                    {showHome ? (
                        <div className="h-full overflow-y-auto p-6">
                            <div className="max-w-4xl mx-auto">
                                <div className="text-center mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C49B3A] to-[#8B6914] flex items-center justify-center mx-auto mb-4">
                                        <Globe className="w-7 h-7 text-black" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-[#E8E6E3] mb-2">AI Learning Browser</h2>
                                    <p className="text-[#6B6966] text-sm">Browse and learn with AI assistance</p>
                                </div>

                                <form onSubmit={handleSubmit} className="mb-6">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-[#23262A] rounded-xl">
                                        <Search className="w-5 h-5 text-[#4A4845]" />
                                        <input type="text" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)}
                                            placeholder="Search or enter URL..." className="flex-1 bg-transparent text-[#E8E6E3] placeholder:text-[#4A4845] outline-none" />
                                        <Button type="submit">Go</Button>
                                    </div>
                                </form>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h3 className="text-xs font-medium text-[#5A9A5A] uppercase mb-3 flex items-center gap-2">
                                            <Eye className="w-3.5 h-3.5" /> Embedded
                                        </h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {embeddableSites.map((site) => (
                                                <button key={site.url} onClick={() => navigateTo(site.url)}
                                                    className="p-2 bg-[#23262A] hover:bg-[#2A2E33] rounded-lg text-center">
                                                    <div className="w-6 h-6 rounded flex items-center justify-center mx-auto mb-1"
                                                        style={{ backgroundColor: site.color + '20', color: site.color }}>{site.icon}</div>
                                                    <p className="text-[#E8E6E3] text-[10px]">{site.title}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-medium text-[#C49B3A] uppercase mb-3 flex items-center gap-2">
                                            <ExternalLink className="w-3.5 h-3.5" /> External
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {externalSites.map((site) => (
                                                <button key={site.url} onClick={() => openExternal(site.url)}
                                                    className="p-2 bg-[#23262A] hover:bg-[#2A2E33] rounded-lg text-center">
                                                    <div className="w-6 h-6 rounded flex items-center justify-center mx-auto mb-1"
                                                        style={{ backgroundColor: site.color + '20', color: site.color }}>{site.icon}</div>
                                                    <p className="text-[#E8E6E3] text-[10px]">{site.title}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="h-full flex items-center justify-center bg-[#0F1012]">
                            <Loader2 className="w-10 h-10 text-[#C49B3A] animate-spin" />
                        </div>
                    ) : loadError ? (
                        <div className="h-full flex items-center justify-center bg-[#0F1012]">
                            <div className="text-center p-6">
                                <AlertTriangle className="w-10 h-10 text-[#C49B3A] mx-auto mb-3" />
                                <p className="text-[#E8E6E3] mb-4">{loadError}</p>
                                <div className="flex gap-2 justify-center">
                                    <Button variant="secondary" size="sm" onClick={goHome}>Home</Button>
                                    <Button size="sm" onClick={() => openExternal()}>Open</Button>
                                </div>
                            </div>
                        </div>
                    ) : pageContent ? (
                        <iframe ref={iframeRef} srcDoc={pageContent} className="w-full h-full border-0 bg-white"
                            sandbox="allow-same-origin allow-forms allow-popups" title={pageTitle} />
                    ) : null}
                </div>
            </div>

            {/* AI Assistant */}
            <AnimatePresence>
                {showAssistant && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }} className="flex flex-col bg-[#1A1D20] border border-[rgba(255,255,255,0.04)] rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-3 border-b border-[rgba(255,255,255,0.04)]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C49B3A] to-[#8B6914] flex items-center justify-center">
                                    <Sparkles className="w-3.5 h-3.5 text-black" /></div>
                                <div>
                                    <h3 className="text-sm font-medium text-[#E8E6E3]">AI Agent</h3>
                                    <p className="text-[9px] text-[#6B6966]">
                                        {contextCount > 0 ? `${contextCount} items in session` : 'Ask anything about this page'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-0.5">
                                {contextCount > 0 && (
                                    <button
                                        onClick={() => setShowNotesModal(true)}
                                        disabled={isGeneratingNotes}
                                        className="p-1.5 rounded-lg bg-[rgba(90,154,90,0.15)] text-[#5A9A5A] hover:bg-[rgba(90,154,90,0.25)]"
                                        title="Generate smart notes from session">
                                        {isGeneratingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                                {contextCount > 0 && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[rgba(196,155,58,0.15)] rounded-lg">
                                        <Layers className="w-3 h-3 text-[#C49B3A]" />
                                        <span className="text-[10px] text-[#C49B3A] font-medium">{contextCount}</span>
                                    </div>
                                )}
                                <button onClick={() => setIsSpeaking(!isSpeaking)}
                                    className={cn("p-1.5 rounded-lg", isSpeaking ? "bg-[rgba(196,155,58,0.15)] text-[#C49B3A]" : "hover:bg-[#23262A] text-[#6B6966]")}>
                                    {isSpeaking ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}</button>
                                <button onClick={() => setShowAssistant(false)} className="p-1.5 rounded-lg hover:bg-[#23262A] text-[#6B6966]">
                                    <X className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {messages.length === 0 ? (
                                <div className="text-center py-4">
                                    <Sparkles className="w-10 h-10 text-[#C49B3A] mx-auto mb-3" />
                                    <p className="text-[#E8E6E3] text-sm mb-1">AI Agent Ready</p>
                                    <p className="text-[#6B6966] text-xs mb-4">Ask me anything about the page you're viewing</p>
                                </div>
                            ) : messages.map((msg, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                    {msg.role === 'assistant' && <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C49B3A] to-[#8B6914] flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-2.5 h-2.5 text-black" /></div>}
                                    <div className={cn("max-w-[85%] rounded-xl overflow-hidden",
                                        msg.role === 'user' ? "bg-[#C49B3A]" : "bg-[#23262A]")}>
                                        {msg.image && <img src={msg.image} alt="" className="w-full max-h-24 object-cover" />}
                                        <div className={cn("px-2.5 py-1.5 text-xs whitespace-pre-wrap",
                                            msg.role === 'user' ? "text-black" : "text-[#E8E6E3]")}>{msg.content}</div>
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && <div className="flex gap-2">
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C49B3A] to-[#8B6914] flex items-center justify-center">
                                    <Sparkles className="w-2.5 h-2.5 text-black" /></div>
                                <div className="px-2.5 py-1.5 bg-[#23262A] rounded-xl flex gap-1">
                                    {[0, 100, 200].map(d => <span key={d} className="w-1.5 h-1.5 bg-[#6B6966] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                                </div>
                            </div>}
                        </div>
                        <div className="p-3 border-t border-[rgba(255,255,255,0.04)]">
                            <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputMessage) }} className="flex items-center gap-1.5">
                                <button type="button" onClick={startVoiceInput}
                                    className={cn("p-1.5 rounded-lg", isRecording ? "bg-[#B85450] text-white animate-pulse" : "hover:bg-[#23262A] text-[#6B6966]")}>
                                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}</button>
                                <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder="Ask or paste image..."
                                    className="flex-1 px-2.5 py-1.5 bg-[#23262A] rounded-lg text-xs text-[#E8E6E3] placeholder:text-[#4A4845] outline-none" />
                                <button type="submit" disabled={!inputMessage.trim()}
                                    className="p-1.5 rounded-lg bg-[#C49B3A] text-black disabled:opacity-50"><Send className="w-3.5 h-3.5" /></button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>



            <ContextPanel
                isOpen={contextPanelOpen}
                onClose={() => setContextPanelOpen(false)}
                isLoading={isAnalyzing && !bridgeAnalysis}
                analysis={bridgeAnalysis}
                onAddToTasks={(task) => {
                    // Start a task creation flow (could be integrated with TaskManager later)
                    alert(`Added task: ${task.title}`)
                }}
            />
        </div >
    )
}
