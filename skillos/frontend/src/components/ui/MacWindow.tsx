import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PixelCanvas } from '@/components/ui/pixel-canvas'

interface MacWindowProps {
    title: string
    icon?: ReactNode
    children: ReactNode
    className?: string
    headerClassName?: string
    onClose?: () => void
    onMinimize?: () => void
    onMaximize?: () => void
}

export default function MacWindow({
    title,
    icon,
    children,
    className,
    headerClassName,
    onClose,
    onMinimize,
    onMaximize
}: MacWindowProps) {
    return (
        <div className={cn(
            "relative bg-[#1A1D20] border border-[rgba(255,255,255,0.04)] rounded-xl overflow-hidden group",
            className
        )}>
            {/* Pixel Canvas hover effect */}
            <PixelCanvas
                gap={6}
                speed={20}
                colors={["#1f2428", "#252a2f", "#2a3035"]}
                noFocus
            />

            {/* Title Bar */}
            <div className={cn(
                "relative z-10 flex items-center justify-between px-4 py-2.5 bg-[#161819] border-b border-[rgba(255,255,255,0.04)]",
                headerClassName
            )}>
                <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition"
                        />
                        <button
                            onClick={onMinimize}
                            className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 transition"
                        />
                        <button
                            onClick={onMaximize}
                            className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 transition"
                        />
                    </div>
                </div>

                {/* Title */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                    {icon && <span className="text-[#4A4845]">{icon}</span>}
                    <span className="text-[13px] font-medium text-[#6B6966]">{title}</span>
                </div>

                <div className="w-14" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}
