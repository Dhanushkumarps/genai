import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, Square, Award, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MacWindow from '@/components/ui/MacWindow'

interface MockInterviewProps {
    role: string
    onComplete: (score: number) => void
}

export default function MockInterview({ role, onComplete }: MockInterviewProps) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'completed'>('idle')
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [transcript, setTranscript] = useState('')
    const [score, setScore] = useState(0)

    // Mock questions for demo
    const questions = [
        "Tell me about a challenging technical problem you solved.",
        "How do you handle merge conflicts in a team?",
        "Explain the difference between SQL and NoSQL databases."
    ]

    const handleRecordToggle = () => {
        if (status === 'idle') {
            setStatus('recording')
            // Simulation of recording
            setTimeout(() => setTranscript("I once optimized a database query that was taking 5 seconds..."), 1500)
        } else {
            setStatus('processing')
            // Simulate AI grading
            setTimeout(() => {
                if (currentQuestion < questions.length - 1) {
                    setCurrentQuestion(prev => prev + 1)
                    setStatus('idle')
                    setTranscript('')
                } else {
                    setStatus('completed')
                    const finalScore = 85
                    setScore(finalScore)
                    onComplete(finalScore)
                }
            }, 2000)
        }
    }

    if (status === 'completed') {
        return (
            <MacWindow title="Interview Report" icon={<Award className="w-4 h-4 text-yellow-400" />}>
                <div className="p-8 text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <span className="text-3xl font-bold text-white">{score}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">Great Job!</h2>
                    <p className="text-white/60">You demonstrated strong problem-solving skills. Focus on being more concise.</p>
                    <div className="grid grid-cols-2 gap-4 mt-6 text-left">
                        <div className="bg-white/5 p-3 rounded-lg">
                            <p className="text-xs text-white/40 uppercase">Strengths</p>
                            <p className="text-sm text-green-400">System Design, Communication</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg">
                            <p className="text-xs text-white/40 uppercase">Improvements</p>
                            <p className="text-sm text-red-400">Database Indexing details</p>
                        </div>
                    </div>
                </div>
            </MacWindow>
        )
    }

    return (
        <MacWindow title="Mock Interview AI" icon={<Mic className="w-4 h-4 text-red-400" />}>
            <div className="p-6 h-[400px] flex flex-col relative overflow-hidden">
                {/* Visualizer Background */}
                <div className="absolute inset-0 opacity-10 flex items-center justify-center gap-1 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-2 bg-white rounded-full"
                            animate={{ height: status === 'recording' ? [20, 60, 20] : 10 }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                        />
                    ))}
                </div>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center space-y-6">
                    <div>
                        <span className="text-xs font-mono text-white/40 mb-2 block">QUESTION {currentQuestion + 1} OF {questions.length}</span>
                        <h3 className="text-2xl font-bold text-white max-w-lg mx-auto leading-relaxed">
                            "{questions[currentQuestion]}"
                        </h3>
                    </div>

                    {transcript && (
                        <div className="bg-black/50 p-4 rounded-xl border border-white/10 max-w-md">
                            <p className="text-sm text-white/80 italic">"{transcript}"</p>
                        </div>
                    )}
                </div>

                <div className="relative z-10 flex items-center justify-center gap-4 mt-auto pt-6 border-t border-white/10">
                    <Button
                        size="lg"
                        variant={status === 'recording' ? "destructive" : "default"}
                        className={`rounded-full w-16 h-16 ${status === 'recording' ? 'animate-pulse' : ''}`}
                        onClick={handleRecordToggle}
                        disabled={status === 'processing'}
                    >
                        {status === 'recording' ? <Square className="w-6 h-6" /> : (
                            status === 'processing' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6" />
                        )}
                    </Button>
                    <p className="absolute bottom-1 text-[10px] text-white/30">
                        {status === 'recording' ? 'Recording... Click to stop' : 'Click to answer'}
                    </p>
                </div>
            </div>
        </MacWindow>
    )
}
