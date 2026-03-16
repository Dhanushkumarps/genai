import { useState, useMemo } from 'react'
import { useTaskOperations } from './useTaskOperations'
import { useTaskAdvisor } from './useTaskAdvisor'
import TaskCard from './TaskCard'
import AddTaskModal from './AddTaskModal'
import MacWindow from '@/components/ui/MacWindow'
import { Plus, ListTodo, CheckCircle, Clock, AlertCircle, Sparkles, RefreshCw } from 'lucide-react'

export default function TaskManager() {
    const { tasks, loading, error, addTask, updateStatus, deleteTask } = useTaskOperations()
    const { recommendation, isLoading: aiLoading, refresh: refreshAI } = useTaskAdvisor()
    const [isModalOpen, setIsModalOpen] = useState(false)

    const { activeTasks, pendingTasks, completedTasks } = useMemo(() => {
        return {
            activeTasks: tasks.filter(t => t.status === 'active'),
            pendingTasks: tasks.filter(t => t.status === 'pending'),
            completedTasks: tasks.filter(t => t.status === 'completed'),
        }
    }, [tasks])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64 text-red-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                System Error: {error instanceof Error ? error.message : String(error)}
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Tasks</h1>
                    <p className="text-white/50 text-sm mt-1">Manage your objectives and priorities</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Task
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Active', count: activeTasks.length, icon: Clock, color: 'from-yellow-500 to-orange-500' },
                    { label: 'Pending', count: pendingTasks.length, icon: AlertCircle, color: 'from-blue-500 to-cyan-500' },
                    { label: 'Completed', count: completedTasks.length, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                <stat.icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stat.count}</p>
                                <p className="text-xs text-white/50">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Recommendations */}
            {recommendation && (
                <MacWindow title="AI Suggestions" icon={<Sparkles className="w-4 h-4" />}>
                    <div className="p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-white/90 text-sm">{typeof recommendation === 'string' ? recommendation : recommendation?.recommendation}</p>
                            {typeof recommendation !== 'string' && recommendation?.reason && (
                                <p className="text-xs text-white/50 mt-1">{recommendation.reason}</p>
                            )}
                        </div>
                        <button onClick={refreshAI} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <RefreshCw className={`w-4 h-4 text-white/60 ${aiLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </MacWindow>
            )
            }

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Tasks */}
                <MacWindow title="Active" icon={<Clock className="w-4 h-4" />}>
                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {activeTasks.length === 0 ? (
                            <div className="text-center py-8 text-white/40">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No active tasks</p>
                            </div>
                        ) : (
                            activeTasks.map(task => (
                                <TaskCard key={task.id} task={task} onStatusChange={updateStatus} onDelete={deleteTask} />
                            ))
                        )}
                    </div>
                </MacWindow>

                {/* Pending Tasks */}
                <MacWindow title="Pending" icon={<AlertCircle className="w-4 h-4" />}>
                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {pendingTasks.length === 0 ? (
                            <div className="text-center py-8 text-white/40">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No pending tasks</p>
                                <button onClick={() => setIsModalOpen(true)} className="text-blue-400 text-sm mt-2 hover:underline">
                                    Create one
                                </button>
                            </div>
                        ) : (
                            pendingTasks.map(task => (
                                <TaskCard key={task.id} task={task} onStatusChange={updateStatus} onDelete={deleteTask} />
                            ))
                        )}
                    </div>
                </MacWindow>
            </div>

            {/* Completed Tasks */}
            <MacWindow title="Completed" icon={<CheckCircle className="w-4 h-4" />}>
                <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {completedTasks.length === 0 ? (
                        <div className="text-center py-6 text-white/40">
                            <CheckCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Complete some tasks to see them here</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {completedTasks.slice(0, 9).map(task => (
                                <div key={task.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg text-white/60 text-sm">
                                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                    <span className="truncate">{task.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </MacWindow>

            {/* Add Task Modal */}
            <AddTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={addTask} />
        </div >
    )
}
