import type { Task, TaskStatus } from '@/types/task'
import { CheckCircle, PlayCircle, Trash2 } from 'lucide-react'

interface TaskCardProps {
    task: Task
    onStatusChange: (id: string, status: TaskStatus) => void
    onDelete: (id: string) => void
}

export default function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
    const difficultyColor = (val: number) => {
        if (val <= 3) return 'bg-green-500'
        if (val <= 7) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    return (
        <div className="glass-card group relative overflow-hidden transition-all hover:border-[--color-primary]">
            <div className={`absolute top-0 left-0 w-1 h-full ${difficultyColor(task.difficulty || 1)} opacity-50`}></div>

            <div className="pl-4">
                <div className="flex-between mb-2">
                    <h3 className={`font-bold ${task.status === 'completed' ? 'line-through text-muted' : ''}`}>
                        {task.title}
                    </h3>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        {task.status !== 'active' && task.status !== 'completed' && (
                            <button
                                onClick={() => onStatusChange(task.id, 'active')}
                                className="text-[--color-primary] hover:scale-110 transition-transform"
                                title="Start Task"
                            >
                                <PlayCircle size={18} />
                            </button>
                        )}
                        {task.status !== 'completed' && (
                            <button
                                onClick={() => onStatusChange(task.id, 'completed')}
                                className="text-[--color-success] hover:scale-110 transition-transform"
                                title="Complete Task"
                            >
                                <CheckCircle size={18} />
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(task.id)}
                            className="text-[--color-danger] hover:scale-110 transition-transform"
                            title="Delete Task"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                <p className="text-sm text-muted mb-3 line-clamp-2">{task.description}</p>

                <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="font-mono">DIFF:</span>
                    <div className="flex gap-0.5">
                        {[...Array(10)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-1 h-3 rounded-full ${i < (task.difficulty || 0) ? difficultyColor(task.difficulty || 0) : 'bg-white/10'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
