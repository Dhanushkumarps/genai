import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
    Bot, Sparkles, Brain, TrendingUp,
    Loader2, Zap, Target, RefreshCw, Terminal, Send,
    CheckCircle, AlertCircle, List, Plus, Search, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthContext'
import { useARIACommands } from './useARIACommands'

interface AIAgentProps {
    onClose?: () => void
}

interface AgentStats {
    avgEnergy: number
    avgLoad: number
    pendingTasks: number
    completedToday: number
    totalLogs: number
}

interface Message {
    role: 'user' | 'aria' | 'system'
    content: string
    timestamp: Date
    success?: boolean
}

export default function AIAgent({ onClose }: AIAgentProps) {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [stats, setStats] = useState<AgentStats>({ avgEnergy: 65, avgLoad: 55, pendingTasks: 0, completedToday: 0, totalLogs: 0 })
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const commands = useARIACommands()

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    useEffect(() => {
        if (!user?.id) return
        const fetchStats = async () => {
            const result = await commands.getDashboardStats()
            if (result.success && result.data) {
                setStats({
                    avgEnergy: result.data.energy,
                    avgLoad: result.data.cognitiveLoad,
                    pendingTasks: result.data.pendingTasks,
                    completedToday: result.data.completedTasks,
                    totalLogs: result.data.totalLogs
                })
            }
        }
        fetchStats()
    }, [user?.id])

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                role: 'aria',
                content: `👋 **ARIA Terminal Ready**\n\n• \`create task [title]\` - New task\n• \`list tasks\` - View tasks\n• \`stats\` - System overview\n• \`help\` - All commands`,
                timestamp: new Date()
            }])
        }
    }, [messages.length])

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return
        const userMessage: Message = { role: 'user', content: input, timestamp: new Date() }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const result = await commands.executeCommand(input)
            let response: Message

            if (result.success) {
                let content = result.message
                if (result.data?.pendingTasks !== undefined) {
                    content = `📊 **System Overview**\n\n🎯 Tasks: ${result.data.pendingTasks} pending, ${result.data.completedTasks} done\n⚡ Energy: ${result.data.energy}%`
                }
                response = { role: 'aria', content, timestamp: new Date(), success: true }
            } else {
                response = { role: 'aria', content: result.message, timestamp: new Date(), success: false }
            }
            setMessages(prev => [...prev, response])
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'system', content: `Error: ${err.message}`, timestamp: new Date(), success: false }])
        } finally {
            setIsLoading(false)
        }
    }, [input, isLoading, commands])

    const quickActions = [
        { label: 'Tasks', icon: List, command: 'list tasks' },
        { label: 'Stats', icon: TrendingUp, command: 'stats' },
        { label: 'Help', icon: Sparkles, command: 'help' },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-8 z-50 w-[380px] max-h-[500px] flex flex-col bg-black/95 backdrop-blur-xl border border-purple-500/40 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(139,92,246,0.3)]"
        >
            {/* Window Title Bar */}
            <div className="p-3 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border-b border-purple-500/30 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                            <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
                            <button onClick={onClose} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400" />
                            <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-purple-400" />
                            <span className="font-medium text-white text-sm">ARIA Terminal</span>
                            <span className="text-[8px] bg-green-500/30 text-green-400 px-1.5 py-0.5 rounded">ADMIN</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setMessages([])} className="w-6 h-6 text-purple-300">
                        <RefreshCw className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-5 gap-1 px-2 py-1 bg-black/60 border-b border-purple-500/20 shrink-0">
                {[
                    { icon: Zap, value: `${stats.avgEnergy}%`, label: 'PWR', color: 'text-cyan-400' },
                    { icon: Brain, value: `${stats.avgLoad}%`, label: 'CPU', color: 'text-purple-400' },
                    { icon: Target, value: stats.pendingTasks, label: 'QUE', color: 'text-orange-400' },
                    { icon: CheckCircle, value: stats.completedToday, label: 'DONE', color: 'text-green-400' },
                    { icon: FileText, value: stats.totalLogs, label: 'LOGS', color: 'text-blue-400' },
                ].map((stat, i) => (
                    <div key={i} className="text-center py-1">
                        <stat.icon className={`w-3 h-3 mx-auto ${stat.color}`} />
                        <p className="text-[9px] font-bold text-white font-mono">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-1 p-2 bg-black/40 border-b border-purple-500/10 shrink-0">
                {quickActions.map(action => (
                    <button
                        key={action.label}
                        onClick={() => { setInput(action.command); inputRef.current?.focus() }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 transition-colors"
                    >
                        <action.icon className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] text-white">{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[150px] max-h-[250px] custom-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-purple-600 text-white'
                                : msg.role === 'system' ? 'bg-red-900/50 border border-red-500/30 text-red-200'
                                    : 'bg-white/10 text-white border border-purple-500/20'
                            }`}>
                            {msg.content.split('\n').map((line, j) => (
                                <p key={j} className={line.startsWith('**') ? 'font-bold' : ''}>{line.replace(/\*\*/g, '')}</p>
                            ))}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white/10 rounded-xl px-4 py-2 border border-purple-500/20">
                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 border-t border-purple-500/20 bg-black/60 shrink-0">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 font-mono text-sm">$</span>
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Enter command..."
                            className="pl-7 bg-black/50 border-purple-500/30 text-white font-mono text-sm"
                            disabled={isLoading}
                        />
                    </div>
                    <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon" className="bg-purple-600 hover:bg-purple-700">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </motion.div>
    )
}
