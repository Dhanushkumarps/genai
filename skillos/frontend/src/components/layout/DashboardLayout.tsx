import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import MacMenuBar from './MacMenuBar'
import { AppSidebar } from './AppSidebar'
import OSDock from './OSDock'
import LearningLog from '@/features/memory/LearningLog'
import BrainDump from '@/features/memory/BrainDump'
import KernelPanicProtocol from '@/features/safety/KernelPanicProtocol'
import UptimeMonitor from '@/features/safety/UptimeMonitor'
import NeuralChat from '@/features/ai/NeuralChat'
import AIAgent from '@/features/ai/AIAgent'
import PlacementAgent from '@/features/placement/PlacementAgent'
import { useActivityTracker } from '@/features/dashboard/useActivityTracker'

export default function DashboardLayout() {
    useActivityTracker()

    const [openApps, setOpenApps] = useState<string[]>(['home'])

    const [showNeuralChat, setShowNeuralChat] = useState(false)
    const [showARIA, setShowARIA] = useState(false)
    const [showPlacement, setShowPlacement] = useState(false)
    const [showUptime, setShowUptime] = useState(false)
    const [showKernelPanic, setShowKernelPanic] = useState(false)

    const toggleApp = useCallback((appId: string) => {
        const updateOpenApps = (isOpen: boolean, id: string) => {
            setOpenApps(prev => isOpen ? prev.filter(a => a !== id) : [...prev, id])
        }

        switch (appId) {
            case 'neural-chat':
                setShowNeuralChat(prev => { updateOpenApps(prev, appId); return !prev })
                break
            case 'aria':
                setShowARIA(prev => { updateOpenApps(prev, appId); return !prev })
                break
            case 'placement':
                setShowPlacement(prev => { updateOpenApps(prev, appId); return !prev })
                break
            case 'uptime':
                setShowUptime(prev => { updateOpenApps(prev, appId); return !prev })
                break
            case 'kernel-panic':
                setShowKernelPanic(prev => { updateOpenApps(prev, appId); return !prev })
                break
            default:
                break
        }
    }, [])

    return (
        <div className="min-h-screen bg-[#0F1113] text-[#E8E6E3] font-sans selection:bg-[rgba(196,155,58,0.12)]">
            {/* macOS Menu Bar */}
            <MacMenuBar />

            {/* Finder-style Sidebar */}
            <AppSidebar />

            {/* Main Content Area - adjusted for menu bar and sidebar */}
            <main className="md:pl-52 pt-7 min-h-screen flex flex-col transition-all duration-300 pb-20">
                <div className="flex-1 p-6 animate-fade-in relative">
                    <Outlet />
                </div>
            </main>

            {/* Dialog-based components */}
            <LearningLog />
            <BrainDump />

            {/* OS-Style Window Apps */}
            <AnimatePresence>
                {showNeuralChat && <NeuralChat onClose={() => toggleApp('neural-chat')} />}
                {showARIA && <AIAgent onClose={() => toggleApp('aria')} />}
                {showPlacement && <PlacementAgent onClose={() => toggleApp('placement')} />}
                {showUptime && <UptimeMonitor onClose={() => toggleApp('uptime')} />}
                {showKernelPanic && <KernelPanicProtocol onClose={() => toggleApp('kernel-panic')} />}
            </AnimatePresence>

            {/* macOS-style Dock */}
            <OSDock openApps={openApps} onToggleApp={toggleApp} />
        </div>
    )
}
