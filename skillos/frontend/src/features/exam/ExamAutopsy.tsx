import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Camera, FileText, Loader2, BookOpen, BrainCircuit, ChevronDown, ListChecks, Download, Link as LinkIcon, Layers, FileImage } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import * as pdfjsLib from 'pdfjs-dist'
import html2pdf from 'html2pdf.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

interface ParsedQuestion {
    frequency: number
    importanceScore: number
    marks: number
    text: string
    modelAnswer: string
    bloomsTaxonomy: string
}

interface ModuleData {
    moduleName: string
    questions: ParsedQuestion[]
}

interface ExamResult {
    subjectCode: string | null
    courseName: string | null
    detectedSubjects: string[]
    modules: ModuleData[]
}

type UIState = 'upload' | 'scanning' | 'results'

export default function ExamAutopsy() {
    const [uiState, setUiState] = useState<UIState>('upload')
    const [collectedImages, setCollectedImages] = useState<string[]>([])
    const [driveLink, setDriveLink] = useState('')
    
    const [result, setResult] = useState<ExamResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [expandedQ, setExpandedQ] = useState<string | null>(null) // "modIdx-qIdx"
    const [isPrinting, setIsPrinting] = useState(false)
    
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const resultsRef = useRef<HTMLDivElement>(null)
    const printRef = useRef<HTMLDivElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return

        files.forEach(file => {
            if (file.type === 'application/pdf') {
                const fileReader = new FileReader()
                fileReader.onload = async function() {
                    const typedarray = new Uint8Array(this.result as ArrayBuffer)
                    try {
                        const pdf = await pdfjsLib.getDocument(typedarray).promise
                        const totalPages = pdf.numPages
                        const pageImages: string[] = []

                        for (let i = 1; i <= totalPages; i++) {
                            const page = await pdf.getPage(i)
                            const scale = 2.0
                            const viewport = page.getViewport({ scale })
                            const canvas = document.createElement('canvas')
                            const context = canvas.getContext('2d')
                            if (!context) continue
                            canvas.height = viewport.height
                            canvas.width = viewport.width
                            const renderContext: any = {
                                canvasContext: context,
                                viewport: viewport
                            }
                            await page.render(renderContext).promise
                            pageImages.push(canvas.toDataURL('image/jpeg', 0.8))
                        }
                        setCollectedImages(prev => [...prev, ...pageImages])
                    } catch (err: any) {
                        setError('Failed to read PDF file: ' + err.message)
                    }
                }
                fileReader.readAsArrayBuffer(file)
            } else {
                const reader = new FileReader()
                reader.onloadend = () => {
                    setCollectedImages(prev => [...prev, reader.result as string])
                }
                reader.readAsDataURL(file)
            }
        })
    }

    const startAnalysis = async () => {
        if (collectedImages.length === 0 && !driveLink) {
            setError("Please add at least one exam paper or a Google Drive link first.")
            return
        }

        setUiState('scanning')
        setError(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exam-batch-analyzer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ files: collectedImages, driveLink })
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Failed to analyze exam batches. ' + (errData.message || ''))
            }

            const data = await response.json()
            setResult(data)
            setUiState('results')

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'An unexpected error occurred.')
            setUiState('upload')
        }
    }

    const downloadPDF = async () => {
        // We set isPrinting true first to render the overlay
        setIsPrinting(true)
        
        // Wait for React to mount the pure print view in the actual viewport
        await new Promise(resolve => setTimeout(resolve, 800))

        if (!printRef.current) {
            setIsPrinting(false)
            return
        }

        const element = printRef.current
        const opt = {
            margin:       [0.2, 0.2, 0.2, 0.2] as any, // Add slight margin for PDF bounds
            filename:     'CYBER_Q_BANK.pdf',
            image:        { type: 'jpeg' as const, quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                letterRendering: true,
                windowWidth: 850 // Fix the width for consistency
            },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
        }

        try {
            await html2pdf().set(opt).from(element).save()
        } catch (err) {
            console.error("PDF Generation Error:", err)
        } finally {
            setIsPrinting(false)
        }
    }

    const reset = () => {
        setUiState('upload')
        setCollectedImages([])
        setDriveLink('')
        setResult(null)
        setError(null)
        setExpandedQ(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (cameraInputRef.current) cameraInputRef.current.value = ''
    }

    const formatAnswer = (text: string) => {
        if (!text) return null
        return text.split('\n').map((line, i) => {
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return <li key={i} className="ml-4 mb-2 list-disc text-[#c9c7c3] text-sm">{line.substring(2)}</li>
            }
            if (line.match(/\*\*(.*?)\*\*/)) {
                const parts = line.split(/(\*\*.*?\*\*)/g)
                return (
                    <p key={i} className="mb-2 text-[#E8E6E3] text-sm">
                        {parts.map((p, j) => p.startsWith('**') ? <strong key={j} className="text-[#30e8bd]">{p.slice(2, -2)}</strong> : p)}
                    </p>
                )
            }
            return <p key={i} className="mb-2 text-[#E8E6E3] text-sm">{line}</p>
        })
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#30e8bd]/10 flex items-center justify-center">
                    <BrainCircuit className="w-8 h-8 text-[#30e8bd]" />
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[#8A8885] mb-2">
                    VTU Question Bank Generator
                </h1>
                <p className="text-[#9A9996]">Upload multiple papers or paste a Drive link. We'll find the most important questions.</p>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                </div>
            )}

            {/* UPLOAD STATE */}
            {uiState === 'upload' && (
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Collection Stats */}
                    <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#22262A] border border-[rgba(255,255,255,0.04)] flex items-center justify-center">
                                <Layers className="w-6 h-6 text-[#30e8bd]" />
                            </div>
                            <div>
                                <h3 className="text-[#E8E6E3] font-medium">Batch Collection</h3>
                                <p className="text-sm text-[#9A9996]">{collectedImages.length} pages queued for analysis</p>
                            </div>
                        </div>
                        <button 
                            onClick={startAnalysis}
                            disabled={collectedImages.length === 0 && !driveLink}
                            className="px-6 py-2.5 bg-[#30e8bd] hover:bg-[#25c19c] disabled:bg-[#30e8bd]/20 disabled:text-[#30e8bd]/50 text-black font-medium text-sm rounded-xl transition"
                        >
                            Analyze Batch
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] hover:border-[#30e8bd]/40 hover:bg-[#30e8bd]/5 transition-all cursor-pointer rounded-2xl p-8 flex flex-col items-center justify-center gap-4 group"
                        >
                            <div className="w-14 h-14 rounded-full bg-[#22262A] group-hover:bg-[#30e8bd]/20 flex items-center justify-center transition-colors">
                                <Upload className="w-6 h-6 text-[#6B6966] group-hover:text-[#30e8bd]" />
                            </div>
                            <div className="text-center">
                                <h3 className="font-medium text-[#E8E6E3] mb-1">Add PDFs or Images</h3>
                                <p className="text-xs text-[#6B6966]">Select multiple files at once</p>
                            </div>
                            <input 
                                type="file" 
                                accept="image/*,application/pdf"
                                multiple 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                            />
                        </div>

                        <div 
                            onClick={() => cameraInputRef.current?.click()}
                            className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] hover:border-[#30e8bd]/40 hover:bg-[#30e8bd]/5 transition-all cursor-pointer rounded-2xl p-8 flex flex-col items-center justify-center gap-4 group"
                        >
                            <div className="w-14 h-14 rounded-full bg-[#22262A] group-hover:bg-[#30e8bd]/20 flex items-center justify-center transition-colors">
                                <Camera className="w-6 h-6 text-[#6B6966] group-hover:text-[#30e8bd]" />
                            </div>
                            <div className="text-center">
                                <h3 className="font-medium text-[#E8E6E3] mb-1">Take a Photo</h3>
                                <p className="text-xs text-[#6B6966]">Add physical papers to the batch</p>
                            </div>
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment"
                                ref={cameraInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                            />
                        </div>
                    </div>

                    {/* Drive Link Input */}
                    <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6">
                        <label className="flex items-center gap-2 text-sm font-medium text-[#E8E6E3] mb-3">
                            <LinkIcon className="w-4 h-4 text-[#6B6966]" /> Or paste a public Google Drive folder link
                        </label>
                        <div className="flex gap-3">
                            <input 
                                type="text"
                                value={driveLink}
                                onChange={(e) => setDriveLink(e.target.value)}
                                placeholder="https://drive.google.com/drive/folders/..."
                                className="flex-1 bg-[#22262A] border border-[rgba(255,255,255,0.04)] rounded-xl px-4 py-2.5 text-sm text-[#E8E6E3] focus:outline-none focus:border-[#30e8bd]/50"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* SCANNING STATE */}
            {uiState === 'scanning' && (
                <div className="max-w-xl mx-auto text-center space-y-6 pt-10">
                    <div className="relative w-32 h-32 mx-auto">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-2 border-dashed border-[#30e8bd]/30 rounded-full"
                        />
                        <motion.div 
                            animate={{ rotate: -360 }}
                            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-2 border-2 border-dashed border-[#8B5CF6]/30 rounded-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <BrainCircuit className="w-10 h-10 text-[#30e8bd] animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-[#E8E6E3] mb-2 animate-pulse">Aggregating Q-Bank...</h3>
                        <p className="text-sm text-[#6B6966]">Cross-referencing {collectedImages.length} pages of material. Identifying duplicates and calculating importance scores.</p>
                    </div>
                </div>
            )}

            {/* RESULTS STATE */}
            {uiState === 'results' && result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={reset} className="text-sm text-[#9A9996] hover:text-[#30e8bd] transition flex items-center gap-2">
                            ← Start New Batch
                        </button>
                        <button 
                            onClick={downloadPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-[#22262A] hover:bg-[#2A2E33] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm font-medium text-[#E8E6E3] transition"
                        >
                            <Download className="w-4 h-4 text-[#30e8bd]" />
                            Download Q-Bank PDF
                        </button>
                    </div>

                    {/* Needs to be wrapped in a ref for PDF generation */}
                    <div ref={resultsRef} className="bg-[#121417] min-h-screen pb-12">
                        {/* PDF Header (Only visible in PDF visually if styled, but we just print the container) */}
                        <div className="p-8 border-b border-[rgba(255,255,255,0.06)] bg-[#1A1D20]">
                            <h1 className="text-3xl font-bold text-[#E8E6E3] mb-2">Important Question Bank</h1>
                            <div className="flex flex-wrap gap-2 text-sm text-[#9A9996]">
                                Subject(s): {result.detectedSubjects?.join(', ') || 'VTU Engineering'}
                            </div>
                        </div>

                        <div className="p-8 space-y-12">
                            {result.modules?.map((mod, modIdx) => (
                                <div key={modIdx} className="space-y-6">
                                    <h2 className="text-xl font-bold text-[#E8E6E3] flex items-center gap-2 pb-2 border-b border-[rgba(255,255,255,0.06)]">
                                        <BookOpen className="w-5 h-5 text-[#8B5CF6]" />
                                        {mod.moduleName}
                                    </h2>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        {mod.questions.map((q, qIdx) => {
                                            const isExpanded = expandedQ === `${modIdx}-${qIdx}`
                                            return (
                                                <div key={qIdx} className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden [&.pdf-render-mode_.answer-breakdown]:block">
                                                    <div 
                                                        onClick={() => setExpandedQ(isExpanded ? null : `${modIdx}-${qIdx}`)}
                                                        className="p-5 cursor-pointer hover:bg-[rgba(255,255,255,0.01)] transition flex justify-between gap-4"
                                                    >
                                                        <div className="flex gap-4">
                                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#f0b429]/10 border border-[#f0b429]/30 flex items-center justify-center font-bold text-[#f0b429] text-xs">
                                                                Q{qIdx + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-[#E8E6E3] font-medium leading-relaxed mb-3">
                                                                    {q.text}
                                                                </p>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    {q.frequency > 1 && (
                                                                        <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20 flex items-center gap-1">
                                                                            🔥 REPEATED {q.frequency} TIMES
                                                                        </span>
                                                                    )}
                                                                    <span className="px-2 py-1 rounded bg-[#22262A] text-[#9A9996] text-[10px] font-medium border border-[rgba(255,255,255,0.04)] flex items-center gap-1">
                                                                        ⭐ IMPORTANCE: {q.importanceScore}/10
                                                                    </span>
                                                                    {q.marks && (
                                                                        <span className="px-2 py-1 rounded bg-[#22262A] text-[#9A9996] text-[10px] font-medium border border-[rgba(255,255,255,0.04)]">
                                                                            ~{q.marks} Marks
                                                                        </span>
                                                                    )}
                                                                    <span className="px-2 py-1 rounded bg-[#60A5FA]/10 text-[#60A5FA] text-[10px] font-medium border border-[#60A5FA]/20">
                                                                        {q.bloomsTaxonomy}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0 flex items-start pt-1">
                                                            <ChevronDown className={`w-5 h-5 text-[#6B6966] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </div>

                                                    {/* Expanded Content: Model Answer */}
                                                    <AnimatePresence>
                                                        {(isExpanded || isPrinting) && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden border-t border-[rgba(255,255,255,0.04)] bg-[#101215] answer-breakdown"
                                                            >
                                                                <div className="p-6">
                                                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#6B6966] mb-3 flex items-center gap-1.5">
                                                                        <FileText className="w-3 h-3" /> Standard Model Answer
                                                                    </h4>
                                                                    <div className="text-sm">
                                                                        {formatAnswer(q.modelAnswer)}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* OFF-SCREEN NERDY PRINT VIEW - Now fixed to avoid blank capture */}
            {isPrinting && result && (
                <div className="fixed inset-0 z-[99999] bg-[#0A0D14] flex flex-col">
                    {/* UI Overlay during generation */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[100000] flex items-center justify-center">
                        <div className="bg-[#0A0D14] border-2 border-[#30e8bd]/50 p-8 rounded-2xl flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(48,232,189,0.2)]">
                            <Loader2 className="w-12 h-12 text-[#30e8bd] animate-spin" />
                            <div className="text-center">
                                <h2 className="text-[#30e8bd] font-mono text-xl font-bold tracking-[0.2em] mb-2">COMPUTING_ENTITY_BANK</h2>
                                <p className="text-[#6B6966] text-xs font-mono uppercase tracking-widest">Compiling futuristic Q-data... DO NOT CLOSE</p>
                            </div>
                        </div>
                    </div>

                    <div 
                        ref={printRef}
                        className="w-[850px] mx-auto bg-[#0A0D14] text-[#30e8bd] font-mono p-12 min-h-screen"
                        style={{ backgroundColor: '#0A0D14' }}
                    >
                    <div className="border-[3px] border-[#30e8bd] p-[3px] mb-12 shadow-[0_0_15px_rgba(48,232,189,0.3)]">
                        <div className="border border-[#30e8bd] p-8 bg-[linear-gradient(45deg,rgba(48,232,189,0.05),transparent)] relative">
                            <div className="absolute top-2 right-4 text-[10px] opacity-70 tracking-widest">[ SYSTEM.SECURE.EXTRACT ]</div>
                            <h1 className="text-4xl font-bold tracking-[0.2em] mb-6 uppercase flex items-center gap-4">
                                <span className="text-white">{'>>'} </span>
                                {result?.courseName || result?.detectedSubjects?.[0] || 'SUBJECT_DATA'} <span className="text-[#06b6d4] text-xl bg-[#06b6d4]/10 px-3 py-1 border border-[#06b6d4]/50">AUTORUN</span>
                            </h1>
                            <div className="flex gap-10 text-xs font-bold opacity-90 tracking-[0.1em] uppercase">
                                <div className="bg-[#30e8bd]/10 px-4 py-2 border border-[#30e8bd]/30"><span className="text-[#06b6d4] block text-[10px] mb-1 opacity-70">CID_MATCH</span> {result?.subjectCode || 'UNK'}</div>
                                <div className="bg-[#30e8bd]/10 px-4 py-2 border border-[#30e8bd]/30"><span className="text-[#06b6d4] block text-[10px] mb-1 opacity-70">RECORDS</span> {result?.modules.reduce((acc, m) => acc + m.questions.length, 0)} SCANNED</div>
                                <div className="bg-[#30e8bd]/10 px-4 py-2 border border-[#30e8bd]/30"><span className="text-[#06b6d4] block text-[10px] mb-1 opacity-70">STATUS_OK</span> AGGREGATED</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-16">
                        {result?.modules.map((mod, modIdx) => (
                            <div key={modIdx}>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-[#30e8bd]/70"></div>
                                    <h2 className="text-2xl font-bold tracking-[0.2em] text-white uppercase px-6 py-2 border-2 border-[#30e8bd]/70 bg-[#30e8bd]/10 shadow-[0_0_10px_rgba(48,232,189,0.4)] relative">
                                        <div className="absolute -top-[2px] -left-[2px] w-2 h-2 bg-[#06b6d4]"></div>
                                        <div className="absolute -bottom-[2px] -right-[2px] w-2 h-2 bg-[#06b6d4]"></div>
                                        [ {mod.moduleName} ]
                                    </h2>
                                    <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-[#30e8bd]/70"></div>
                                </div>

                                <div className="space-y-10">
                                    {mod.questions.map((q, qIdx) => (
                                        <div key={qIdx} className="border-l-[3px] border-[#30e8bd]/40 pl-8 relative">
                                            {/* Decorative indicator box */}
                                            <div className="absolute -left-[7px] top-6 w-3 h-3 bg-[#06b6d4] shadow-[0_0_10px_#06b6d4]"></div>

                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex gap-6">
                                                    <div className="text-4xl font-black text-white opacity-20 mt-1">
                                                        {(qIdx + 1).toString().padStart(2, '0')}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap gap-4 text-[10px] tracking-widest mb-4 font-bold uppercase">
                                                            {q.frequency > 1 ? (
                                                                <span className="text-red-400 border border-red-500/50 bg-red-500/10 px-3 py-1.5 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                                                    ⚠ FREQ_REPEATED: {q.frequency}X
                                                                </span>
                                                            ) : (
                                                                <span className="text-[#30e8bd] border border-[#30e8bd]/20 px-3 py-1.5 opacity-60">
                                                                    FREQ_SINGLE
                                                                </span>
                                                            )}
                                                            <span className="text-[#06b6d4] border border-[#06b6d4]/30 px-3 py-1.5 bg-[#06b6d4]/5 flex items-center gap-2">
                                                                <span>LVL: {q.importanceScore.toString().padStart(2, '0')}</span> 
                                                                <span className="text-[8px]">{'█'.repeat(q.importanceScore).padEnd(10, '░')}</span>
                                                            </span>
                                                            <span className="text-white border border-white/20 px-3 py-1.5 bg-white/5">
                                                                BLM: {q.bloomsTaxonomy.split('-')[0].trim()}
                                                            </span>
                                                            <span className="text-[#f0b429] border border-[#f0b429]/30 px-3 py-1.5 bg-[#f0b429]/5">
                                                                {q.marks || '?'} PTS
                                                            </span>
                                                        </div>
                                                        <p className="text-lg text-gray-100 leading-relaxed font-sans font-medium mb-6 border border-[#30e8bd]/20 bg-[#30e8bd]/[0.02] p-6 shadow-[inset_0_0_20px_rgba(48,232,189,0.02)]">
                                                            {q.text}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ml-[68px] border-t border-[#30e8bd]/20 border-b bg-[#050810] shadow-[inset_0_0_30px_rgba(48,232,189,0.02)] p-6 text-sm font-sans line-clamp-none text-gray-300 [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 leading-loose">
                                                <div className="text-[#30e8bd] font-mono text-[10px] tracking-[0.2em] uppercase mb-4 opacity-70 flex items-center gap-2">
                                                    <span>-- BEGIN COMPUTE : SOLUTION </span>
                                                    <div className="h-[1px] flex-1 bg-[#30e8bd]/20"></div>
                                                </div>
                                                {formatAnswer(q.modelAnswer)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            )}
        </div>
    )
}
