import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Upload,
    FileText,
    X,
    ChevronDown,
    ChevronUp,
    Loader2,
    FileCheck,
    AlertCircle,
    Zap,
    ShieldCheck,
    AlertTriangle,
    Sparkles,
    Target,
    BadgePlus,
    Briefcase,
    Download,
    Wand2,
} from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { openai } from '@/lib/openai'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// ── Types ──────────────────────────────────────────────────────────────
interface SectionResult {
    score: number
    issues: string[]
    suggestions: string[]
}

interface ResumeAnalysis {
    overallScore: number
    atsScore: number
    sections: {
        contact: SectionResult
        summary: SectionResult
        experience: SectionResult
        skills: SectionResult
        education: SectionResult
        projects: SectionResult
    }
    topStrengths: string[]
    criticalFixes: string[]
    missingKeywords: string[]
    estimatedJobMatchRoles: string[]
}

interface ResumeState {
    file: File | null
    extractedText: string
    analysis: ResumeAnalysis | null
    improvedResume: string
    isAnalysing: boolean
    isImproving: boolean
}

const INITIAL_STATE: ResumeState = {
    file: null,
    extractedText: '',
    analysis: null,
    improvedResume: '',
    isAnalysing: false,
    isImproving: false,
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

const SECTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
    contact: { label: 'Contact Info', icon: <FileText className="w-4 h-4" /> },
    summary: { label: 'Summary', icon: <Sparkles className="w-4 h-4" /> },
    experience: { label: 'Experience', icon: <Briefcase className="w-4 h-4" /> },
    skills: { label: 'Skills', icon: <Zap className="w-4 h-4" /> },
    education: { label: 'Education', icon: <ShieldCheck className="w-4 h-4" /> },
    projects: { label: 'Projects', icon: <Target className="w-4 h-4" /> },
}

// ── Helpers ────────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function extractTextFromFile(file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'pdf') {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const pages: string[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            pages.push(content.items.map((item: any) => item.str).join(' '))
        }
        return pages.join('\n')
    }

    if (ext === 'docx') {
        const mammoth = await import('mammoth')
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        return result.value
    }

    throw new Error('Unsupported file type')
}

function scoreColor(score: number): string {
    if (score >= 70) return '#30e8bd'
    if (score >= 40) return '#f5c542'
    return '#ef4444'
}

function scoreBg(score: number): string {
    if (score >= 70) return 'rgba(48,232,189,0.1)'
    if (score >= 40) return 'rgba(245,197,66,0.1)'
    return 'rgba(239,68,68,0.1)'
}

// ── PDF Generation Helpers ─────────────────────────────────────────────
async function downloadReviewPdf(analysisRef: React.RefObject<HTMLDivElement | null>, analysis: ResumeAnalysis) {
    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()

    // Title page with score summary
    pdf.setFontSize(24)
    pdf.setTextColor(48, 232, 189)
    pdf.text('Resume Review Report', pageWidth / 2, 30, { align: 'center' })

    pdf.setFontSize(14)
    pdf.setTextColor(232, 230, 227)
    pdf.text('SkillOS Resume Analyser', pageWidth / 2, 40, { align: 'center' })

    pdf.setFontSize(12)
    pdf.setTextColor(154, 153, 150)
    const maxTextWidth = pageWidth - 40
    let summaryY = 60
    pdf.text(`Overall Score: ${analysis.overallScore}/100`, 20, summaryY)
    summaryY += 8
    pdf.text(`ATS Score: ${analysis.atsScore}/100`, 20, summaryY)
    summaryY += 8
    const strengthLines = pdf.splitTextToSize(`Top Strengths: ${analysis.topStrengths.join(', ')}`, maxTextWidth)
    pdf.text(strengthLines, 20, summaryY)
    summaryY += strengthLines.length * 6
    const fixLines = pdf.splitTextToSize(`Critical Fixes: ${analysis.criticalFixes.join(', ')}`, maxTextWidth)
    pdf.text(fixLines, 20, summaryY)

    // Capture the analysis UI as an image
    if (analysisRef.current) {
        const canvas = await html2canvas(analysisRef.current, {
            backgroundColor: '#12141A',
            scale: 2,
        })
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = pageWidth - 20
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        pdf.addPage()

        let yOffset = 10
        const pageHeight = pdf.internal.pageSize.getHeight()

        if (imgHeight <= pageHeight - 20) {
            pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight)
        } else {
            // Split across pages if image is too tall
            const pagesNeeded = Math.ceil(imgHeight / (pageHeight - 20))
            for (let p = 0; p < pagesNeeded; p++) {
                if (p > 0) pdf.addPage()
                pdf.addImage(imgData, 'PNG', 10, yOffset - p * (pageHeight - 20), imgWidth, imgHeight)
            }
        }
    }

    pdf.save('resume-review-skillos.pdf')
}

async function downloadImprovedPdf(markdown: string) {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - margin * 2
    let y = margin

    const lines = markdown.split('\n')

    const addPageIfNeeded = (lineHeight: number) => {
        if (y + lineHeight > pageHeight - margin) {
            pdf.addPage()
            y = margin
        }
    }

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
            y += 4
            continue
        }

        // Heading 1 — ###
        if (trimmed.startsWith('### ')) {
            addPageIfNeeded(8)
            pdf.setFontSize(13)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(48, 232, 189)
            pdf.text(trimmed.replace('### ', ''), margin, y)
            y += 8
        }
        // Heading 2 — ##
        else if (trimmed.startsWith('## ')) {
            addPageIfNeeded(10)
            pdf.setFontSize(15)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(48, 232, 189)
            pdf.text(trimmed.replace('## ', ''), margin, y)
            y += 10
        }
        // Heading 1 — #
        else if (trimmed.startsWith('# ')) {
            addPageIfNeeded(12)
            pdf.setFontSize(18)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(48, 232, 189)
            pdf.text(trimmed.replace('# ', ''), margin, y)
            y += 12
        }
        // Bullet points
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            addPageIfNeeded(6)
            pdf.setFontSize(11)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(60, 60, 60)
            const bulletText = trimmed.replace(/^[-*]\s/, '')
            const wrappedLines = pdf.splitTextToSize(`  •  ${bulletText}`, maxWidth - 5)
            wrappedLines.forEach((wl: string) => {
                addPageIfNeeded(5)
                pdf.text(wl, margin + 5, y)
                y += 5
            })
            y += 1
        }
        // Bold text lines (**text**)
        else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            addPageIfNeeded(7)
            pdf.setFontSize(11)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(40, 40, 40)
            pdf.text(trimmed.replace(/\*\*/g, ''), margin, y)
            y += 7
        }
        // Regular paragraph
        else {
            pdf.setFontSize(11)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(60, 60, 60)
            // Remove inline bold markers for PDF
            const cleanText = trimmed.replace(/\*\*(.*?)\*\*/g, '$1')
            const wrappedLines = pdf.splitTextToSize(cleanText, maxWidth)
            wrappedLines.forEach((wl: string) => {
                addPageIfNeeded(5)
                pdf.text(wl, margin, y)
                y += 5
            })
            y += 2
        }
    }

    pdf.save('improved-resume-skillos.pdf')
}

// ── Sub-components ─────────────────────────────────────────────────────
function CircularScore({ score, size = 128 }: { score: number; size?: number }) {
    const pct = Math.min(100, Math.max(0, score))
    const color = scoreColor(score)
    return (
        <div
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `conic-gradient(${color} ${pct * 3.6}deg, #0a2e5c ${pct * 3.6}deg)`,
                }}
            />
            <div className="absolute inset-[6px] rounded-full bg-[#12141A] flex items-center justify-center flex-col">
                <span className="text-3xl font-bold tabular-nums" style={{ color }}>
                    {score}
                </span>
                <span className="text-[11px] text-[#6B6966] -mt-0.5">/ 100</span>
            </div>
        </div>
    )
}

function AtsBadge({ score }: { score: number }) {
    const color = scoreColor(score)
    const bg = scoreBg(score)
    return (
        <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-semibold"
            style={{ color, background: bg, borderColor: `${color}33` }}
        >
            <ShieldCheck className="w-4 h-4" />
            ATS Score: {score}%
        </div>
    )
}

function SectionBar({ name, section }: { name: string; section: SectionResult }) {
    const [open, setOpen] = useState(false)
    const meta = SECTION_LABELS[name] ?? { label: name, icon: null }
    const color = scoreColor(section.score)

    return (
        <div className="rounded-lg border border-[rgba(255,255,255,0.04)] bg-[#1A1D20] overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
                <span className="text-[#6B6966]">{meta.icon}</span>
                <span className="text-[13px] font-medium text-[#E8E6E3] flex-1 text-left">
                    {meta.label}
                </span>

                {/* Score bar */}
                <div className="w-28 h-2 rounded-full bg-[#0a2e5c] overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${section.score}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full rounded-full"
                        style={{ background: color }}
                    />
                </div>
                <span className="text-[12px] font-mono w-8 text-right" style={{ color }}>
                    {section.score}
                </span>

                {open ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[#6B6966]" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#6B6966]" />
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[rgba(255,255,255,0.04)]">
                            {section.issues.length > 0 && (
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-red-400 font-medium mb-1.5">
                                        Issues
                                    </p>
                                    <ul className="space-y-1">
                                        {section.issues.map((issue, i) => (
                                            <li key={i} className="flex items-start gap-2 text-[13px] text-[#9A9996]">
                                                <span className="text-red-400 mt-0.5">•</span>
                                                {issue}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {section.suggestions.length > 0 && (
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-[#30e8bd] font-medium mb-1.5">
                                        Suggestions
                                    </p>
                                    <ul className="space-y-1">
                                        {section.suggestions.map((sug, i) => (
                                            <li key={i} className="flex items-start gap-2 text-[13px] text-[#9A9996]">
                                                <span className="text-[#30e8bd] mt-0.5">→</span>
                                                {sug}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function ChipList({
    items,
    variant,
}: {
    items: string[]
    variant: 'green' | 'red' | 'yellow'
}) {
    const styles = {
        green: 'bg-[rgba(48,232,189,0.1)] text-[#30e8bd] border-[rgba(48,232,189,0.2)]',
        red: 'bg-red-500/10 text-red-400 border-red-500/20',
        yellow: 'bg-[rgba(245,197,66,0.1)] text-[#f5c542] border-[rgba(245,197,66,0.2)]',
    }

    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item, i) => (
                <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium border ${styles[variant]}`}
                >
                    {variant === 'red' && <AlertTriangle className="w-3 h-3" />}
                    {variant === 'yellow' && <BadgePlus className="w-3 h-3" />}
                    {item}
                    {variant === 'yellow' && (
                        <span className="text-[10px] opacity-60 ml-0.5">Add to Resume</span>
                    )}
                </span>
            ))}
        </div>
    )
}

function AnalysingOverlay({ label }: { label: string }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-[rgba(48,232,189,0.15)] bg-[#0a2e5c]/20 p-8 flex flex-col items-center gap-5"
        >
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-[#0a2e5c]" />
                <div className="absolute inset-0 rounded-full border-2 border-t-[#30e8bd] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#30e8bd]" />
                </div>
            </div>
            <div className="text-center">
                <p className="text-[15px] font-medium text-[#E8E6E3]">{label}</p>
                <p className="text-[13px] text-[#6B6966] mt-1">
                    GPT-4o is working on your resume
                </p>
            </div>
            <div className="w-full max-w-xs h-1.5 rounded-full bg-[#0a2e5c] overflow-hidden">
                <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#30e8bd] to-[#20c09a]"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '40%' }}
                />
            </div>
        </motion.div>
    )
}

// ── Markdown renderer with themed prose ────────────────────────────────
function MarkdownPanel({ content }: { content: string }) {
    return (
        <div className="prose-resume px-5 py-4 max-h-[600px] overflow-y-auto">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="text-xl font-bold text-[#30e8bd] mt-4 mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-lg font-bold text-[#30e8bd] mt-3 mb-1.5">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-[15px] font-semibold text-[#30e8bd] mt-2.5 mb-1">{children}</h3>
                    ),
                    p: ({ children }) => (
                        <p className="text-[13px] leading-relaxed text-[#E8E6E3] mb-2">{children}</p>
                    ),
                    li: ({ children }) => (
                        <li className="text-[13px] text-[#E8E6E3] ml-4 list-disc mb-1">{children}</li>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold text-[#E8E6E3]">{children}</strong>
                    ),
                    ul: ({ children }) => <ul className="mb-2 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 space-y-0.5 list-decimal ml-4">{children}</ol>,
                    a: ({ children, href }) => (
                        <a href={href} className="text-[#30e8bd] underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                            {children}
                        </a>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}

// ── Main Component ─────────────────────────────────────────────────────
export default function ResumeAnalyser() {
    const [state, setState] = useState<ResumeState>(INITIAL_STATE)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [parseError, setParseError] = useState<string | null>(null)
    const [isParsing, setIsParsing] = useState(false)
    const analysisRef = useRef<HTMLDivElement>(null)

    // ── File drop handler ──────────────────────────────────────────────
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setParseError(null)
        setIsParsing(true)
        setState((prev) => ({ ...prev, file, extractedText: '', analysis: null, improvedResume: '' }))

        try {
            const extractedText = await extractTextFromFile(file)
            setState((prev) => ({ ...prev, extractedText }))
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to parse file'
            setParseError(msg)
        } finally {
            setIsParsing(false)
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ACCEPTED_TYPES,
        maxSize: MAX_FILE_SIZE,
        multiple: false,
        onDropRejected: (rejections) => {
            const err = rejections[0]?.errors[0]
            if (err?.code === 'file-too-large') {
                setParseError('File exceeds the 5 MB limit.')
            } else if (err?.code === 'file-invalid-type') {
                setParseError('Only .pdf and .docx files are accepted.')
            } else {
                setParseError(err?.message ?? 'File rejected.')
            }
        },
    })

    // ── Remove file ────────────────────────────────────────────────────
    const handleRemove = () => {
        setState(INITIAL_STATE)
        setParseError(null)
        setPreviewOpen(false)
    }

    // ── Analyse resume via OpenAI ──────────────────────────────────────
    const analyseResume = async () => {
        if (!state.extractedText) return

        setState((prev) => ({ ...prev, isAnalysing: true, analysis: null }))
        setParseError(null)

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                temperature: 0.3,
                max_tokens: 4096,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an expert ATS resume reviewer and career coach specializing in the Indian tech job market. Analyse the resume and respond ONLY with valid JSON, no markdown.',
                    },
                    {
                        role: 'user',
                        content: `Analyse this resume and return JSON with this exact structure:
{
  "overallScore": number (0-100),
  "atsScore": number (0-100),
  "sections": {
    "contact": { "score": number, "issues": string[], "suggestions": string[] },
    "summary": { "score": number, "issues": string[], "suggestions": string[] },
    "experience": { "score": number, "issues": string[], "suggestions": string[] },
    "skills": { "score": number, "issues": string[], "suggestions": string[] },
    "education": { "score": number, "issues": string[], "suggestions": string[] },
    "projects": { "score": number, "issues": string[], "suggestions": string[] }
  },
  "topStrengths": string[],
  "criticalFixes": string[],
  "missingKeywords": string[],
  "estimatedJobMatchRoles": string[]
}

Resume text:
${state.extractedText}`,
                    },
                ],
            })

            const raw = completion.choices[0]?.message?.content ?? ''
            const cleaned = raw.replace(/```json\n?|```/g, '').trim()
            const analysis: ResumeAnalysis = JSON.parse(cleaned)
            setState((prev) => ({ ...prev, analysis }))
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Analysis failed'
            setParseError(msg)
        } finally {
            setState((prev) => ({ ...prev, isAnalysing: false }))
        }
    }

    // ── Improve resume via OpenAI ──────────────────────────────────────
    const improveResume = async () => {
        if (!state.extractedText || !state.analysis) return

        setState((prev) => ({ ...prev, isImproving: true, improvedResume: '' }))
        setParseError(null)

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                temperature: 0.4,
                max_tokens: 4096,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an expert resume writer. Rewrite the provided resume to be ATS-optimized, impactful, and tailored for Indian tech companies and global product firms. Return ONLY the improved resume text in clean markdown format.',
                    },
                    {
                        role: 'user',
                        content: `Improve this resume. Address the critical fixes and incorporate the missing keywords naturally.

Critical Fixes to address:
${state.analysis.criticalFixes.map((f) => `- ${f}`).join('\n')}

Missing Keywords to incorporate:
${state.analysis.missingKeywords.map((k) => `- ${k}`).join('\n')}

Original Resume:
${state.extractedText}`,
                    },
                ],
            })

            const improved = completion.choices[0]?.message?.content ?? ''
            setState((prev) => ({ ...prev, improvedResume: improved }))
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Improvement failed'
            setParseError(msg)
        } finally {
            setState((prev) => ({ ...prev, isImproving: false }))
        }
    }

    // ── Download handlers ──────────────────────────────────────────────
    const handleDownloadReview = () => {
        if (!state.analysis) return
        downloadReviewPdf(analysisRef, state.analysis)
    }

    const handleDownloadImproved = () => {
        if (!state.improvedResume) return
        downloadImprovedPdf(state.improvedResume)
    }

    // ── Render ─────────────────────────────────────────────────────────
    const { analysis } = state

    return (
        <div className="space-y-6">
            {/* ── Upload Zone ───────────────────────────────────────────── */}
            {!state.file ? (
                <motion.div
                    {...(({ onDrag, ...rest }) => rest)(getRootProps())}
                    animate={isDragActive ? { scale: 1.02 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`
                        relative flex flex-col items-center justify-center gap-4
                        rounded-xl border-2 border-dashed p-10 cursor-pointer
                        transition-colors duration-200
                        ${isDragActive
                            ? 'border-[#30e8bd] bg-[#0a2e5c]/40'
                            : 'border-[#30e8bd]/40 bg-[#0a2e5c]/20 hover:border-[#30e8bd]/60 hover:bg-[#0a2e5c]/30'
                        }
                    `}
                >
                    <input {...getInputProps()} />

                    <motion.div
                        animate={isDragActive ? { y: -4 } : { y: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        className="w-14 h-14 rounded-2xl bg-[rgba(48,232,189,0.1)] flex items-center justify-center"
                    >
                        <Upload className="w-7 h-7 text-[#30e8bd]" />
                    </motion.div>

                    <div className="text-center">
                        <p className="text-[15px] font-medium text-[#E8E6E3]">
                            {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
                        </p>
                        <p className="text-[13px] text-[#6B6966] mt-1">
                            or <span className="text-[#30e8bd] underline underline-offset-2">browse files</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                        <span className="px-2.5 py-1 rounded-md bg-[#23262A] text-[11px] font-medium text-[#9A9996] border border-[rgba(255,255,255,0.04)]">
                            .PDF
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-[#23262A] text-[11px] font-medium text-[#9A9996] border border-[rgba(255,255,255,0.04)]">
                            .DOCX
                        </span>
                        <span className="text-[11px] text-[#6B6966]">Max 5 MB</span>
                    </div>
                </motion.div>
            ) : (
                /* ── Uploaded file card ──────────────────────────────────── */
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 rounded-xl border border-[rgba(48,232,189,0.2)] bg-[#0a2e5c]/20 p-4"
                >
                    <div className="w-11 h-11 rounded-xl bg-[rgba(48,232,189,0.1)] flex items-center justify-center shrink-0">
                        {isParsing ? (
                            <Loader2 className="w-5 h-5 text-[#30e8bd] animate-spin" />
                        ) : (
                            <FileCheck className="w-5 h-5 text-[#30e8bd]" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#E8E6E3] truncate">
                            {state.file.name}
                        </p>
                        <p className="text-[12px] text-[#6B6966]">
                            {formatFileSize(state.file.size)}
                            {isParsing && (
                                <span className="ml-2 text-[#30e8bd]">Parsing…</span>
                            )}
                        </p>
                    </div>

                    <button
                        onClick={handleRemove}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B6966] hover:text-[#E8E6E3] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                        aria-label="Remove file"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </motion.div>
            )}

            {/* ── Parse error ───────────────────────────────────────────── */}
            <AnimatePresence>
                {parseError && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-400"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {parseError}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Extracted text stats + preview ─────────────────────────── */}
            <AnimatePresence>
                {state.extractedText && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#1A1D20] overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.04)]">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#30e8bd]" />
                                <span className="text-[13px] font-medium text-[#E8E6E3]">
                                    Extracted Text
                                </span>
                                <span className="ml-1 px-2 py-0.5 rounded-md bg-[rgba(48,232,189,0.1)] text-[11px] font-mono text-[#30e8bd]">
                                    {state.extractedText.length.toLocaleString()} chars
                                </span>
                            </div>

                            <button
                                onClick={() => setPreviewOpen((o) => !o)}
                                className="flex items-center gap-1.5 text-[12px] font-medium text-[#9A9996] hover:text-[#E8E6E3] transition-colors"
                            >
                                {previewOpen ? 'Hide' : 'Preview'}
                                {previewOpen ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>

                        <AnimatePresence>
                            {previewOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <pre className="px-5 py-4 text-[13px] leading-relaxed text-[#9A9996] whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                                        {state.extractedText.slice(0, 500)}
                                        {state.extractedText.length > 500 && (
                                            <span className="text-[#6B6966]">…</span>
                                        )}
                                    </pre>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Analyse button ─────────────────────────────────────────── */}
            {state.extractedText && !analysis && !state.isAnalysing && (
                <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={analyseResume}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                        bg-gradient-to-r from-[#30e8bd] to-[#20c09a] text-[#0a0a1a]
                        font-semibold text-[14px] hover:brightness-110 active:scale-[0.98] transition-all"
                >
                    <Sparkles className="w-5 h-5" />
                    Analyse Resume with GPT-4o
                </motion.button>
            )}

            {/* ── Analysing overlay ──────────────────────────────────────── */}
            <AnimatePresence>
                {state.isAnalysing && <AnalysingOverlay label="Analysing Resume…" />}
            </AnimatePresence>

            {/* ── Analysis Results ────────────────────────────────────────── */}
            <AnimatePresence>
                {analysis && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        <div ref={analysisRef} id="resume-analysis" className="space-y-6">
                            {/* ── Scores header ──────────────────────────────── */}
                            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#1A1D20] p-6">
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <CircularScore score={analysis.overallScore} />
                                    <div className="flex-1 space-y-3 text-center sm:text-left">
                                        <h3 className="text-[18px] font-bold text-[#E8E6E3]">
                                            Resume Score
                                        </h3>
                                        <AtsBadge score={analysis.atsScore} />
                                        {analysis.estimatedJobMatchRoles.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-[11px] uppercase tracking-wider text-[#6B6966] font-medium mb-1.5">
                                                    Matched Roles
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {analysis.estimatedJobMatchRoles.map((role, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-2 py-0.5 rounded-md bg-[rgba(48,232,189,0.08)] text-[12px] text-[#9A9996] border border-[rgba(255,255,255,0.04)]"
                                                        >
                                                            {role}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Section scores accordion ───────────────────── */}
                            <div>
                                <h3 className="text-[13px] uppercase tracking-wider text-[#6B6966] font-medium mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Section Breakdown
                                </h3>
                                <div className="space-y-2">
                                    {Object.entries(analysis.sections).map(([key, section]) => (
                                        <SectionBar key={key} name={key} section={section} />
                                    ))}
                                </div>
                            </div>

                            {/* ── Top Strengths ──────────────────────────────── */}
                            {analysis.topStrengths.length > 0 && (
                                <div>
                                    <h3 className="text-[13px] uppercase tracking-wider text-[#30e8bd] font-medium mb-3 flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        Top Strengths
                                    </h3>
                                    <ChipList items={analysis.topStrengths} variant="green" />
                                </div>
                            )}

                            {/* ── Critical Fixes ─────────────────────────────── */}
                            {analysis.criticalFixes.length > 0 && (
                                <div>
                                    <h3 className="text-[13px] uppercase tracking-wider text-red-400 font-medium mb-3 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Critical Fixes
                                    </h3>
                                    <ChipList items={analysis.criticalFixes} variant="red" />
                                </div>
                            )}

                            {/* ── Missing Keywords ───────────────────────────── */}
                            {analysis.missingKeywords.length > 0 && (
                                <div>
                                    <h3 className="text-[13px] uppercase tracking-wider text-[#f5c542] font-medium mb-3 flex items-center gap-2">
                                        <BadgePlus className="w-4 h-4" />
                                        Missing Keywords
                                    </h3>
                                    <ChipList items={analysis.missingKeywords} variant="yellow" />
                                </div>
                            )}
                        </div>

                        {/* ── Improve button ──────────────────────────────────── */}
                        {!state.improvedResume && !state.isImproving && (
                            <motion.button
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={improveResume}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                                    bg-gradient-to-r from-[#30e8bd] to-[#20c09a] text-[#0a0a1a]
                                    font-semibold text-[14px] hover:brightness-110 active:scale-[0.98] transition-all"
                            >
                                <Wand2 className="w-5 h-5" />
                                Improve Resume with GPT-4o
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Improving overlay ──────────────────────────────────────── */}
            <AnimatePresence>
                {state.isImproving && <AnalysingOverlay label="Improving Resume…" />}
            </AnimatePresence>

            {/* ── Improved Resume — Original | Improved tabs ─────────────── */}
            <AnimatePresence>
                {state.improvedResume && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        <Tabs.Root defaultValue="improved">
                            <Tabs.List className="flex gap-1 p-1 rounded-lg bg-[#23262A] border border-[rgba(255,255,255,0.04)] w-fit">
                                <Tabs.Trigger
                                    value="original"
                                    className="px-4 py-2 rounded-md text-[13px] font-medium text-[#6B6966]
                                        data-[state=active]:bg-[#0a2e5c]/40 data-[state=active]:text-[#E8E6E3]
                                        transition-colors"
                                >
                                    Original
                                </Tabs.Trigger>
                                <Tabs.Trigger
                                    value="improved"
                                    className="px-4 py-2 rounded-md text-[13px] font-medium text-[#6B6966]
                                        data-[state=active]:bg-[rgba(48,232,189,0.15)] data-[state=active]:text-[#30e8bd]
                                        transition-colors"
                                >
                                    Improved
                                </Tabs.Trigger>
                            </Tabs.List>

                            <Tabs.Content
                                value="original"
                                className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#1A1D20] mt-3"
                            >
                                <pre className="px-5 py-4 text-[13px] leading-relaxed text-[#9A9996] whitespace-pre-wrap font-mono max-h-[600px] overflow-y-auto">
                                    {state.extractedText}
                                </pre>
                            </Tabs.Content>

                            <Tabs.Content
                                value="improved"
                                className="rounded-xl border border-[rgba(48,232,189,0.15)] bg-[#1A1D20] mt-3"
                            >
                                <MarkdownPanel content={state.improvedResume} />
                            </Tabs.Content>
                        </Tabs.Root>

                        {/* ── Download Buttons ───────────────────────────────── */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleDownloadReview}
                                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                                    border border-[rgba(48,232,189,0.2)] bg-[#0a2e5c]/20
                                    text-[#30e8bd] font-semibold text-[13px]
                                    hover:bg-[#0a2e5c]/40 active:scale-[0.98] transition-all"
                            >
                                <Download className="w-4 h-4" />
                                Download Review PDF
                            </button>
                            <button
                                onClick={handleDownloadImproved}
                                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                                    bg-gradient-to-r from-[#30e8bd] to-[#20c09a] text-[#0a0a1a]
                                    font-semibold text-[13px]
                                    hover:brightness-110 active:scale-[0.98] transition-all"
                            >
                                <Download className="w-4 h-4" />
                                Download Improved Resume
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
