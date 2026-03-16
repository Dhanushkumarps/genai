import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Network, Zap, X, Tag, Loader2, Brain, Sparkles, Plus, Focus, Layers, Maximize } from 'lucide-react'
import { useVectorSearch } from './useVectorSearch'
import { useAuth } from '@/features/auth/AuthContext'
import { SynthesisPanel } from './SynthesisPanel'

interface LogData {
    id: string
    content: string
    created_at: string
    tags: string[] | null
}

interface Node extends d3.SimulationNodeDatum {
    id: string
    content: string
    tags: string[]
    clusterId?: number
    size: number
    createdAt: Date
}

interface Link extends d3.SimulationLinkDatum<Node> {
    value: number
    reason?: string
    isAI?: boolean
}

// ... Tag color logic ...
const TAG_COLORS: Record<string, string> = {}
const COLOR_PALETTE = ['#00f0ff', '#a855f7', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444', '#14b8a6']

function getTagColor(tag: string): string {
    if (!TAG_COLORS[tag]) {
        TAG_COLORS[tag] = COLOR_PALETTE[Object.keys(TAG_COLORS).length % COLOR_PALETTE.length]
    }
    return TAG_COLORS[tag]
}

export default function KnowledgeGraph() {
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const { user } = useAuth()
    const [logs, setLogs] = useState<LogData[]>([])
    const { search, isSearching, results } = useVectorSearch()
    const [query, setQuery] = useState('')

    // Graph State
    const [selectedNode, setSelectedNode] = useState<Node | null>(null)
    const [hoveredNode, setHoveredNode] = useState<Node | null>(null)
    const [allTags, setAllTags] = useState<string[]>([])
    const [filterTag, setFilterTag] = useState<string | null>(null)
    const [focusMode, setFocusMode] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // AI State
    const [aiConnections, setAIConnections] = useState<{ sourceId: string; targetId: string; reason: string; strength: number }[]>([])
    const [clusters, setClusters] = useState<{ label: string; insight: string; nodeIds: string[] }[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [showSynthesis, setShowSynthesis] = useState(false)

    // Fetch logs
    useEffect(() => {
        const fetchLogs = async () => {
            const { data } = await supabase
                .from('learning_logs')
                .select('id, content, created_at, tags')
                .order('created_at', { ascending: false })
                .limit(75) // Increased limit

            if (data) {
                setLogs(data)
                const tags = new Set<string>()
                data.forEach(log => {
                    (log.tags || []).forEach((tag: string) => tags.add(tag))
                })
                setAllTags(Array.from(tags))
            }
        }
        fetchLogs()
    }, [])

    // AI Analysis
    const analyzeConnections = useCallback(async () => {
        if (!user?.id || logs.length < 2) return

        setIsAnalyzing(true)
        try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-connections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    user_id: user.id,
                    log_ids: logs.map(l => l.id)
                })
            })

            const data = await response.json()

            if (data.connections) setAIConnections(data.connections)
            if (data.clusters) setClusters(data.clusters)

            setShowSynthesis(true)

        } catch (err) {
            console.error('AI Analysis error:', err)
        } finally {
            setIsAnalyzing(false)
        }
    }, [user?.id, logs])

    // D3 Visualization
    useEffect(() => {
        if (!logs.length || !svgRef.current || !containerRef.current) return

        const container = containerRef.current
        const width = container.clientWidth
        const height = container.clientHeight || 500

        const svg = d3.select(svgRef.current)
        svg.selectAll("*").remove()

        // Definitions (Gradients, Glows)
        const defs = svg.append("defs")

        // ... (Keep existing filters, add particle gradient) ...
        const filter = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%")
        filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur")
        filter.append("feMerge").call(merge => { merge.append("feMergeNode").attr("in", "blur"); merge.append("feMergeNode").attr("in", "SourceGraphic"); })

        const aiFilter = defs.append("filter").attr("id", "ai-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%")
        aiFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur")
        aiFilter.append("feMerge").call(merge => { merge.append("feMergeNode").attr("in", "blur"); merge.append("feMergeNode").attr("in", "SourceGraphic"); })

        const g = svg.append("g")

        // Zoom logic
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => g.attr("transform", event.transform))
        svg.call(zoom)

        // Nodes & Links Setup
        const filteredLogs = filterTag ? logs.filter(l => (l.tags || []).includes(filterTag)) : logs

        const nodes: Node[] = filteredLogs.map((l, i) => {
            const tags = l.tags || []
            // Find cluster
            const clusterIndex = clusters.findIndex(c => c.nodeIds.includes(l.id))
            return {
                id: l.id,
                content: l.content,
                tags,
                clusterId: clusterIndex !== -1 ? clusterIndex : undefined,
                group: i % 5,
                size: Math.min(20, 10 + tags.length * 2 + l.content.length / 80),
                createdAt: new Date(l.created_at)
            }
        })

        const nodeMap = new Map(nodes.map(n => [n.id, n]))
        const links: Link[] = []

        // AI Links
        aiConnections.forEach(conn => {
            if (nodeMap.has(conn.sourceId) && nodeMap.has(conn.targetId)) {
                links.push({
                    source: conn.sourceId,
                    target: conn.targetId,
                    value: conn.strength / 10,
                    reason: conn.reason,
                    isAI: true
                })
            }
        })

        // Standard Tag Links
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i], n2 = nodes[j]
                const sharedTags = n1.tags.filter(t => n2.tags.includes(t))

                // Also connect clear cluster siblings weakly
                const sameCluster = n1.clusterId !== undefined && n1.clusterId === n2.clusterId

                if (sharedTags.length > 0 || sameCluster) {
                    const alreadyConnected = links.some(l =>
                        (l.source === n1.id && l.target === n2.id) || (l.source === n2.id && l.target === n1.id)
                    )
                    if (!alreadyConnected) {
                        links.push({
                            source: n1.id,
                            target: n2.id,
                            value: sameCluster ? 0.1 : sharedTags.length * 0.2,
                            reason: sameCluster ? 'Same Cluster' : `Shared: #${sharedTags[0]}`,
                            isAI: false
                        })
                    }
                }
            }
        }

        // Simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120).strength(d => (d as Link).isAI ? 0.3 : 0.05))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius((d: any) => d.size + 30))
        // .force("cluster", d3.forceX().x(d => (d as Node).clusterId ? (d as Node).clusterId! * 100 : 0).strength(0.1)) // Optional grouping

        // Draw Links
        const link = g.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", d => d.isAI ? '#a855f7' : '#475569')
            .attr("stroke-opacity", d => d.isAI ? 0.6 : 0.2)
            .attr("stroke-width", d => d.isAI ? 2 : 1)
            .attr("filter", d => d.isAI ? "url(#ai-glow)" : "none")

        // Draw Nodes
        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .style("cursor", "pointer")
            .call(d3.drag<any, any>()
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart()
                    d.fx = d.x
                    d.fy = d.y
                })
                .on("drag", (event, d) => {
                    d.fx = event.x
                    d.fy = event.y
                })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0)
                    d.fx = null
                    d.fy = null
                }))

        // Outer Ring (Selection Indicator)
        node.append("circle")
            .attr("class", "selection-ring")
            .attr("r", d => d.size * 1.5)
            .attr("fill", "none")
            .attr("stroke", "#00f0ff")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0)

        // Main Node Circle
        node.append("circle")
            .attr("r", d => d.size)
            .attr("fill", d => d.clusterId !== undefined ? getTagColor(`cluster-${d.clusterId}`) : (d.tags.length ? getTagColor(d.tags[0]) : '#64748b'))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.5)
            .attr("filter", "url(#glow)")

        // Node Label
        node.append("text")
            .attr("dy", d => d.size + 15)
            .attr("text-anchor", "middle")
            .attr("fill", "#e2e8f0")
            .attr("font-size", "10px")
            .attr("font-weight", "500")
            .text(d => d.content.substring(0, 20) + (d.content.length > 20 ? '...' : ''))
            .style("pointer-events", "none")
            .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)")

        // --- Interaction Logic ---

        node.on("click", (event, d) => {
            event.stopPropagation()
            setSelectedNode(curr => curr?.id === d.id ? null : d)
            if (!showSynthesis) setShowSynthesis(true)
        })

        node.on("mouseenter", function (event, d) {
            setHoveredNode(d)
            d3.select(this).select("circle").transition().duration(200).attr("r", d.size * 1.2)

            // Highlight connections
            link.transition().duration(200)
                .attr("stroke-opacity", l => (l.source === d || l.target === d) ? 1 : 0.1)
                .attr("stroke", l => (l.source === d || l.target === d) ? '#00f0ff' : ((l as Link).isAI ? '#a855f7' : '#475569'))

            node.transition().duration(200).style("opacity", n => {
                if (n.id === d.id) return 1
                const isConnected = links.some(l => (l.source === d && l.target === n) || (l.source === n && l.target === d))
                return isConnected ? 1 : 0.2
            })
        })

        node.on("mouseleave", function (event, d) {
            setHoveredNode(null)
            if (!focusMode && !selectedNode) {
                // Reset visual state
                d3.select(this).select("circle").transition().duration(200).attr("r", d.size)
                link.transition().duration(200).attr("stroke-opacity", l => (l as Link).isAI ? 0.6 : 0.2).attr("stroke", l => (l as Link).isAI ? '#a855f7' : '#475569')
                node.transition().duration(200).style("opacity", 1)
            }
        })

        // Background click
        svg.on("click", () => {
            setSelectedNode(null)
        })

        // --- Neural Pulse Animation ---
        const particle = g.append("g").attr("class", "particles")

        const pulse = () => {
            if (aiConnections.length === 0) return

            // Spawn particle on random AI link
            const validLinks = links.filter(l => l.isAI)
            if (validLinks.length === 0) return

            const targetLink = validLinks[Math.floor(Math.random() * validLinks.length)]
            const source = targetLink.source as Node
            const target = targetLink.target as Node

            const circle = particle.append("circle")
                .attr("r", 3)
                .attr("fill", "#ffffff")
                .attr("filter", "url(#glow)")
                .attr("opacity", 1)

            circle.transition()
                .duration(1500)
                .ease(d3.easeLinear)
                .attrTween("transform", () => {
                    return (t) => {
                        const x = source.x! + (target.x! - source.x!) * t
                        const y = source.y! + (target.y! - source.y!) * t
                        return `translate(${x},${y})`
                    }
                })
                .on("end", () => circle.remove())
        }

        const pulseInterval = setInterval(pulse, 400) // Fire pulse every 400ms

        // Simulation Tick
        simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as Node).x!)
                .attr("y1", d => (d.source as Node).y!)
                .attr("x2", d => (d.target as Node).x!)
                .attr("y2", d => (d.target as Node).y!)

            node.attr("transform", d => `translate(${d.x},${d.y})`)

            // Maintain selection highlight
            if (selectedNode) {
                node.select(".selection-ring").attr("stroke-opacity", d => (d as Node).id === selectedNode.id ? 1 : 0)
            }
        })

        return () => {
            simulation.stop()
            clearInterval(pulseInterval)
        }

    }, [logs, filterTag, aiConnections, clusters, selectedNode, focusMode])

    const handleSearch = async () => {
        if (!query.trim()) return
        await search(query)
    }

    return (
        <Card className={`h-full flex flex-col glass-panel overflow-hidden relative transition-all duration-500 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>

            {/* Header / Toolbar */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 backdrop-blur-md flex items-center justify-center">
                        <Network className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg drop-shadow-lg">Neural Knowledge Graph</h3>
                        <p className="text-xs text-cyan-200/60 flex items-center gap-2">
                            {logs.length} Nodes
                            <span className="w-1 h-1 bg-white/20 rounded-full" />
                            {aiConnections.length} Synapses
                        </p>
                    </div>
                </div>

                <div className="pointer-events-auto flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        className={`bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20 ${isAnalyzing ? 'animate-pulse' : ''}`}
                        onClick={analyzeConnections}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
                        {isAnalyzing ? 'Synthesizing...' : 'AI Analyze'}
                    </Button>

                    <div className="h-8 w-[1px] bg-white/10 mx-1" />

                    <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" onClick={() => setFocusMode(!focusMode)}>
                        <Focus className={`w-4 h-4 ${focusMode ? 'text-cyan-400' : ''}`} />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" onClick={() => setShowSynthesis(!showSynthesis)}>
                        <Layers className={`w-4 h-4 ${showSynthesis ? 'text-purple-400' : ''}`} />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" onClick={() => setIsFullscreen(!isFullscreen)}>
                        {isFullscreen ? <X className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Graph Container */}
            <div ref={containerRef} className="flex-1 relative bg-black">
                {/* Dynamic Background with Grid */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.1) 0%, transparent 50%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                    backgroundSize: '100% 100%, 40px 40px, 40px 40px'
                }} />

                <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing relative z-10" />

                {/* Loading State */}
                {logs.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                        <div className="text-center animate-in fade-in zoom-in duration-500">
                            <Network className="w-16 h-16 text-white/10 mx-auto mb-4" />
                            <p className="text-white/40 font-light">Initialize specific nodes to begin neural mapping...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Panels */}
            <SynthesisPanel
                isOpen={showSynthesis}
                onClose={() => setShowSynthesis(false)}
                clusters={clusters}
                connections={aiConnections}
                selectedNodeId={selectedNode?.id}
            />

            {/* Floating Search Bar (Bottom Center) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4">
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full opacity-20 group-hover:opacity-30 blur-md transition-opacity" />
                    <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-4 h-12 shadow-2xl">
                        <Search className="w-4 h-4 text-white/50 mr-3" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search neural graph..."
                            className="bg-transparent border-none outline-none text-white text-sm placeholder:text-white/30 w-full"
                        />
                        {isSearching && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
                    </div>
                </div>
            </div>

        </Card>
    )
}
