import SystemMonitor from './SystemMonitor'
import { useAuth } from '@/features/auth/AuthContext'

export default function Dashboard() {
    const { user } = useAuth()

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header Section */}
            <div className="flex-between items-end mb-4">
                <div>
                    <h1 className="font-2xl font-bold text-gradient mb-2">Command Center</h1>
                    <p className="text-muted">Welcome back, Agent {user?.email?.split('@')[0]}</p>
                </div>
                <div className="glass-panel px-4 py-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[--color-success] animate-pulse"></span>
                    <span className="text-xs font-mono text-[--color-success]">SYSTEM ONLINE</span>
                </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="bento-grid">
                {/* Main System Monitor (Spans 2 columns) */}
                <div className="bento-span-2">
                    <SystemMonitor />
                </div>

                {/* Quick Stats / Info Cards */}
                <div className="glass-card flex flex-col justify-between">
                    <div>
                        <div className="flex-between mb-4">
                            <span className="text-2xl">⚡</span>
                            <span className="text-xs text-muted font-mono">ENERGY</span>
                        </div>
                        <h3 className="text-3xl font-bold text-[--color-primary]">92%</h3>
                        <div className="w-full bg-[--glass-bg-intense] h-1 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-[--color-primary] w-[92%] shadow-[0_0_10px_var(--color-primary)]"></div>
                        </div>
                    </div>
                    <p className="text-xs text-muted mt-4">Optimal performance levels detected.</p>
                </div>

                <div className="glass-card flex flex-col justify-between">
                    <div>
                        <div className="flex-between mb-4">
                            <span className="text-2xl">🎯</span>
                            <span className="text-xs text-muted font-mono">FOCUS</span>
                        </div>
                        <h3 className="text-3xl font-bold text-[--color-secondary]">4.5h</h3>
                    </div>
                    <p className="text-xs text-muted mt-4">Deep work session active.</p>
                </div>

                {/* Task Summary */}
                <div className="glass-card bento-span-2 md:col-span-1">
                    <div className="flex-between mb-6">
                        <h3 className="font-bold">Active Missions</h3>
                        <button className="glass-button text-xs">View All</button>
                    </div>
                    <div className="space-y-4">
                        {[
                            { title: 'Update Neural Interface', status: 'In Progress', color: 'text-warning' },
                            { title: 'Calibrate Sensors', status: 'Pending', color: 'text-muted' },
                            { title: 'Sync Data Logs', status: 'Completed', color: 'text-success' },
                        ].map((task, i) => (
                            <div key={i} className="flex-between p-2 hover:bg-[--glass-bg-subtle] rounded-lg transition-colors">
                                <span className="text-sm">{task.title}</span>
                                <span className={`text-xs font-mono ${task.color}`}>{task.status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card w-full flex-center flex-col gap-4 text-center">
                    <div className="w-12 h-12 rounded-full border border-[--color-primary] flex-center text-xl animate-bounce delay-100">
                        ✨
                    </div>
                    <div>
                        <h3 className="font-bold mb-1">Hackathon Mode</h3>
                        <p className="text-xs text-muted">20h 45m remaining</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
