import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Target, Zap, BookOpen, CheckCircle, ExternalLink, ArrowRight, Loader2, Briefcase, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'

export interface BridgeAnalysis {
    type: 'job' | 'documentation' | 'repo' | 'article' | 'other'
    fit_score: number
    summary: string
    gap_analysis: string
    missing_concepts: string[]
    bridge_plan: {
        title: string
        description: string
        estimated_time: string
        resource_query: string
    }[]
}

interface ContextPanelProps {
    isOpen: boolean
    onClose: () => void
    isLoading: boolean
    analysis: BridgeAnalysis | null
    onAddToTasks: (task: any) => void
}

export function ContextPanel({ isOpen, onClose, isLoading, analysis, onAddToTasks }: ContextPanelProps) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute right-0 top-14 bottom-0 w-[400px] bg-black/80 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/20 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Contextual Bridge</h3>
                            <p className="text-xs text-white/50">Skill Gap Analysis</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-white/10">
                        <X className="w-4 h-4 text-white/60" />
                    </Button>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 p-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin relative z-10" />
                            </div>
                            <p className="text-sm text-white/60 animate-pulse">Analyzing page context...</p>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${analysis.type === 'job' ? 'bg-green-500/20 text-green-400' :
                                            analysis.type === 'documentation' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-purple-500/20 text-purple-400'
                                        }`}>
                                        {analysis.type}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Target className="w-3 h-3 text-cyan-400" />
                                        <span className={`text-sm font-bold ${analysis.fit_score > 80 ? 'text-green-400' :
                                                analysis.fit_score > 50 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>{analysis.fit_score}% Fit</span>
                                    </div>
                                </div>
                                <h4 className="text-white font-medium mb-1 line-clamp-2">{analysis.summary}</h4>
                                <p className="text-xs text-white/50">{analysis.gap_analysis}</p>
                            </div>

                            {/* Missing Concepts */}
                            {analysis.missing_concepts?.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Zap className="w-3 h-3" /> Missing Concepts
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.missing_concepts.map((concept, i) => (
                                            <span key={i} className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                                                {concept}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bridge Plan */}
                            <div>
                                <h5 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <BookOpen className="w-3 h-3" /> Bridge Plan
                                </h5>
                                <div className="space-y-3">
                                    {analysis.bridge_plan.map((item, i) => (
                                        <Card key={i} className="bg-white/5 border-white/10 p-3 hover:bg-white/10 transition-colors group">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                                                            {i + 1}
                                                        </span>
                                                        <h6 className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                                                            {item.title}
                                                        </h6>
                                                    </div>
                                                    <p className="text-xs text-white/50 ml-7 mb-2">{item.description}</p>
                                                    <div className="flex items-center gap-2 ml-7">
                                                        <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <ClockIcon className="w-3 h-3" /> {item.estimated_time}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-white/40 hover:text-green-400 hover:bg-green-500/10"
                                                    onClick={() => onAddToTasks({ title: item.title, description: item.description })}
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                            <Briefcase className="w-12 h-12 text-white/10 mb-4" />
                            <p className="text-white/40 text-sm">Navigate to any job post, documentation, or repo and click "Analyze Gap" to generate a custom bridge plan.</p>
                        </div>
                    )}
                </ScrollArea>

                {/* Footer Action */}
                {analysis && (
                    <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur">
                        <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">
                            Generate Full Roadmap <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    )
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
