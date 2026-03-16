import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    MessageCircle, BookOpen, Brain, Shield, Clock,
    Terminal, GraduationCap, Settings, Home, BarChart3
} from 'lucide-react'

interface DockApp {
    id: string
    name: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    isOpen: boolean
}

interface OSDockProps {
    openApps: string[]
    onToggleApp: (appId: string) => void
}

export default function OSDock({ openApps, onToggleApp }: OSDockProps) {
    const [hoveredApp, setHoveredApp] = useState<string | null>(null)
    const [isDockVisible, setIsDockVisible] = useState(false)

    const apps: DockApp[] = [
        { id: 'home', name: 'Mission Control', icon: Home, color: 'from-blue-500 to-blue-600', isOpen: true },
        { id: 'neural-chat', name: 'Neural Chat', icon: MessageCircle, color: 'from-purple-500 to-violet-600', isOpen: openApps.includes('neural-chat') },
        { id: 'aria', name: 'ARIA Terminal', icon: Terminal, color: 'from-purple-600 to-indigo-700', isOpen: openApps.includes('aria') },
        { id: 'placement', name: 'Placement Prep', icon: GraduationCap, color: 'from-green-500 to-emerald-600', isOpen: openApps.includes('placement') },
        { id: 'learning-log', name: 'Learning Log', icon: BookOpen, color: 'from-cyan-500 to-teal-600', isOpen: openApps.includes('learning-log') },
        { id: 'brain-dump', name: 'Brain Dump', icon: Brain, color: 'from-pink-500 to-rose-600', isOpen: openApps.includes('brain-dump') },
        { id: 'uptime', name: 'System Monitor', icon: BarChart3, color: 'from-orange-500 to-amber-600', isOpen: openApps.includes('uptime') },
        { id: 'kernel-panic', name: 'Kernel Panic', icon: Shield, color: 'from-red-500 to-red-600', isOpen: openApps.includes('kernel-panic') },
    ]

    return (
        <>
            {/* Invisible hover trigger zone at bottom of screen */}
            <div
                className="fixed bottom-0 left-0 right-0 h-4 z-[99]"
                onMouseEnter={() => setIsDockVisible(true)}
            />

            {/* Dock - auto-hide like macOS */}
            <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{
                    y: isDockVisible ? 0 : 80,
                    opacity: isDockVisible ? 1 : 0
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onMouseEnter={() => setIsDockVisible(true)}
                onMouseLeave={() => setIsDockVisible(false)}
                className="fixed bottom-3 left-0 right-0 z-[100] flex justify-center"
            >
                {/* Dock Container - macOS style glass */}
                <div className="flex items-end gap-1 px-3 py-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    {apps.map((app, index) => (
                        <div key={app.id} className="relative">
                            {/* Tooltip */}
                            <AnimatePresence>
                                {hoveredApp === app.id && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/90 backdrop-blur-sm rounded-lg text-white text-xs font-medium whitespace-nowrap border border-white/10 z-10"
                                    >
                                        {app.name}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 rotate-45 border-r border-b border-white/10" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* App Icon with magnify effect */}
                            <motion.button
                                onClick={() => onToggleApp(app.id)}
                                onMouseEnter={() => setHoveredApp(app.id)}
                                onMouseLeave={() => setHoveredApp(null)}
                                whileHover={{ scale: 1.5, y: -15 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg hover:shadow-2xl`}
                                style={{
                                    boxShadow: app.isOpen ? `0 0 20px rgba(255,255,255,0.3)` : undefined
                                }}
                            >
                                <app.icon className="w-5 h-5 text-white drop-shadow-md" />

                                {/* Running indicator dot */}
                                {app.isOpen && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-lg"
                                    />
                                )}
                            </motion.button>

                            {/* Separator after first app (Home) */}
                            {index === 0 && (
                                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-px h-8 bg-white/20" />
                            )}
                        </div>
                    ))}

                    {/* Separator before settings */}
                    <div className="w-px h-8 bg-white/20 mx-1" />

                    {/* Settings */}
                    <motion.button
                        whileHover={{ scale: 1.5, y: -15, rotate: 90 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        onMouseEnter={() => setHoveredApp('settings')}
                        onMouseLeave={() => setHoveredApp(null)}
                        className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-lg"
                    >
                        <Settings className="w-5 h-5 text-white" />
                        <AnimatePresence>
                            {hoveredApp === 'settings' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/90 rounded-lg text-white text-xs font-medium whitespace-nowrap z-10"
                                >
                                    Settings
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </motion.div>
        </>
    )
}
