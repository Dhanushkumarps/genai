import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Send, Sparkles, Trash2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAIChat } from './useAIChat'

interface NeuralChatProps {
    onClose?: () => void
}

export default function NeuralChat({ onClose }: NeuralChatProps) {
    const [input, setInput] = useState('')
    const { messages, isLoading, sendMessage, clearChat } = useAIChat()
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return
        const msg = input
        setInput('')
        await sendMessage(msg)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-8 z-50 w-[400px] max-h-[500px] bg-black/95 backdrop-blur-2xl border border-violet-500/30 rounded-2xl shadow-[0_0_50px_rgba(139,92,246,0.3)] flex flex-col overflow-hidden"
        >
            {/* Window Title Bar - OS Style */}
            <div className="p-3 border-b border-violet-500/20 bg-gradient-to-r from-violet-900/40 to-purple-900/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Traffic lights */}
                    <div className="flex gap-1.5">
                        <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" />
                        <button onClick={onClose} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors" />
                        <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <h3 className="font-medium text-white text-sm">Neural Chat</h3>
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={clearChat} className="w-6 h-6 text-violet-300 hover:text-white">
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[250px] max-h-[350px]">
                {messages.length === 0 && (
                    <div className="text-center text-violet-300/60 py-6">
                        <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Ask me anything!</p>
                        <div className="mt-3 space-y-2">
                            {['What should I study next?', 'Summarize my progress', 'Give me a quick tip'].map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(q)}
                                    className="block w-full text-left text-xs bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-lg p-2 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user'
                                ? 'bg-violet-600 text-white'
                                : 'bg-white/5 border border-violet-500/20 text-violet-100'
                                }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </motion.div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 border border-violet-500/20 rounded-xl px-4 py-2">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-violet-500/20 bg-black/50">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-violet-500/10 border-violet-500/30 focus:border-violet-500 text-white text-sm placeholder:text-violet-300/50"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </motion.div>
    )
}
