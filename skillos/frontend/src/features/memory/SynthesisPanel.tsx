import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, Network, Lightbulb, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SynthesisPanelProps {
    isOpen: boolean
    onClose: () => void
    clusters: { label: string; insight: string; nodeIds: string[] }[]
    connections: { sourceId: string; targetId: string; reason: string }[]
    selectedNodeId?: string | null
}

export function SynthesisPanel({ isOpen, onClose, clusters, connections, selectedNodeId }: SynthesisPanelProps) {
    if (!isOpen) return null

    // Filter content based on selection or show overview
    const relevantClusters = selectedNodeId
        ? clusters.filter(c => c.nodeIds.includes(selectedNodeId))
        : clusters

    const relevantConnections = selectedNodeId
        ? connections.filter(c => c.sourceId === selectedNodeId || c.targetId === selectedNodeId)
        : connections.slice(0, 5) // Top 5 global connections

    return (
        <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-4 right-4 bottom-4 w-80 bg-black/95 backdrop-blur-2xl border border-purple-500/30 rounded-2xl z-40 overflow-hidden flex flex-col shadow-2xl"
        >
            {/* Header with animated gradient border */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/10 to-blue-900/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Neural Synthesis</h3>
                        <p className="text-[10px] text-purple-300/70">AI-Generated Insights</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                    <X className="w-4 h-4 text-white/50 hover:text-white" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-purple-900/50">

                {/* Global Insight / Cluster Analysis */}
                {relevantClusters.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-mono text-purple-400 uppercase tracking-widest">
                            <Brain className="w-3 h-3" />
                            <span>Thematic Clusters</span>
                        </div>

                        {relevantClusters.map((cluster, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="group relative p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                            >
                                <div className="absolute top-2 right-2 flex items-center gap-1">
                                    <span className="text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">{cluster.nodeIds.length} nodes</span>
                                </div>
                                <h4 className="text-sm font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                                    {cluster.label}
                                </h4>
                                <p className="text-xs text-white/70 leading-relaxed font-light">
                                    {cluster.insight}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Brain className="w-12 h-12 text-white/10 mx-auto mb-2" />
                        <p className="text-xs text-white/40">No cluster analysis available yet. Click "AI Analyze" to generate insights.</p>
                    </div>
                )}

                {/* Connections / Synapses */}
                {relevantConnections.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-widest">
                            <Network className="w-3 h-3" />
                            <span>Active Synapses</span>
                        </div>

                        <div className="space-y-2">
                            {relevantConnections.map((conn, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + i * 0.05 }}
                                    className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors group cursor-pointer"
                                >
                                    <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] group-hover:scale-125 transition-transform" />
                                    <div>
                                        <p className="text-xs text-white/90 leading-snug">
                                            {conn.reason}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Suggestion Generator */}
                <div className="mt-6 pt-6 border-t border-white/5">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-white/20 shadow-lg shadow-purple-900/40 group">
                        <Lightbulb className="w-4 h-4 mr-2 group-hover:text-yellow-300 transition-colors" />
                        Generate New Idea
                        <ArrowRight className="w-3 h-3 ml-2 opacity-50 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>

            </div>
        </motion.div>
    )
}
