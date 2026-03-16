import { motion } from 'framer-motion'
import { Shield, AlertTriangle, Heart, Coffee, Wind } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface KernelPanicProtocolProps {
    onClose?: () => void
}

export default function KernelPanicProtocol({ onClose }: KernelPanicProtocolProps) {
    const stressReliefActions = [
        { icon: Heart, label: 'Deep Breathing', color: 'text-red-400', action: '4-7-8 breathing technique' },
        { icon: Coffee, label: 'Take a Break', color: 'text-amber-400', action: '5 minute pause' },
        { icon: Wind, label: 'Quick Stretch', color: 'text-cyan-400', action: 'Desk exercises' },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[350px] bg-black/95 backdrop-blur-xl border border-red-500/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(239,68,68,0.2)]"
        >
            {/* Window Title Bar */}
            <div className="p-3 bg-gradient-to-r from-red-900/50 to-orange-900/50 border-b border-red-500/20">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
                        <button onClick={onClose} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400" />
                        <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-400" />
                        <span className="font-medium text-white text-sm">Kernel Panic Protocol</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                <div className="text-center py-4">
                    <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3 animate-pulse" />
                    <h3 className="text-lg font-bold text-white mb-1">Stress Detected</h3>
                    <p className="text-sm text-white/60">Take a moment to recover</p>
                </div>

                <div className="space-y-2">
                    {stressReliefActions.map((action) => (
                        <button
                            key={action.label}
                            className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left"
                        >
                            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${action.color}`}>
                                <action.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-white text-sm">{action.label}</p>
                                <p className="text-xs text-white/50">{action.action}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <Button onClick={onClose} className="w-full bg-red-600 hover:bg-red-700">
                    I'm Okay Now
                </Button>
            </div>
        </motion.div>
    )
}
