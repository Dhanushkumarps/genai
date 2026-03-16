import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Circle, ArrowRight, BookOpen, Video, Code } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import MacWindow from '@/components/ui/MacWindow'

interface LearningItem {
    id: string
    title: string
    type: 'video' | 'article' | 'project'
    duration: string
    completed: boolean
}

interface LearningPlanProps {
    plan: {
        week: number
        theme: string
        items: LearningItem[]
    }[]
}

export default function LearningPlanView({ plan }: LearningPlanProps) {
    const [expandedWeek, setExpandedWeek] = useState<number>(1)

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Your Personalized Roadmap</h2>

            <div className="grid gap-4">
                {plan.map((week) => (
                    <motion.div
                        key={week.week}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card
                            className={`p-4 border-white/10 transition-all ${expandedWeek === week.week ? 'bg-white/10' : 'bg-black/40 hover:bg-white/5'}`}
                            onClick={() => setExpandedWeek(week.week)}
                        >
                            <div className="flex items-center justify-between cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${expandedWeek === week.week ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50'}`}>
                                        {week.week}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{week.theme}</h3>
                                        <p className="text-xs text-white/50">{week.items.length} tasks</p>
                                    </div>
                                </div>
                                <ArrowRight className={`w-4 h-4 text-white/40 transition-transform ${expandedWeek === week.week ? 'rotate-90' : ''}`} />
                            </div>

                            {expandedWeek === week.week && (
                                <div className="mt-4 space-y-2 pl-12 border-l border-white/10 ml-4">
                                    {week.items.map(item => (
                                        <div key={item.id} className="flex items-center justify-between group p-2 rounded hover:bg-white/5">
                                            <div className="flex items-center gap-3">
                                                <button className="text-white/30 hover:text-green-400">
                                                    {item.completed ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    {item.type === 'video' && <Video className="w-3 h-3 text-blue-400" />}
                                                    {item.type === 'article' && <BookOpen className="w-3 h-3 text-yellow-400" />}
                                                    {item.type === 'project' && <Code className="w-3 h-3 text-purple-400" />}
                                                    <span className="text-sm text-white/90">{item.title}</span>
                                                </div>
                                            </div>
                                            <span className="text-xs text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">{item.duration}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
