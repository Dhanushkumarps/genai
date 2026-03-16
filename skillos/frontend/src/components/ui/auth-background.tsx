'use client'

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { SplineScene } from '@/components/ui/splite'
import { Spotlight } from '@/components/ui/spotlight'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'

interface AuthBackgroundProps {
    children: ReactNode
}

export function AuthBackground({ children }: AuthBackgroundProps) {
    const [isLoaded, setIsLoaded] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)

    // Spring-animated mouse position for smooth cursor following
    const mouseX = useSpring(0, { stiffness: 150, damping: 15, mass: 0.1 })
    const mouseY = useSpring(0, { stiffness: 150, damping: 15, mass: 0.1 })

    const glowSize = 300
    const glowLeft = useTransform(mouseX, (x) => `${x - glowSize / 2}px`)
    const glowTop = useTransform(mouseY, (y) => `${y - glowSize / 2}px`)

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!containerRef.current) return
            const { left, top } = containerRef.current.getBoundingClientRect()
            mouseX.set(event.clientX - left)
            mouseY.set(event.clientY - top)
        },
        [mouseX, mouseY]
    )

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        container.addEventListener('mousemove', handleMouseMove)
        container.addEventListener('mouseenter', () => setIsHovered(true))
        container.addEventListener('mouseleave', () => setIsHovered(false))

        return () => {
            container.removeEventListener('mousemove', handleMouseMove)
            container.removeEventListener('mouseenter', () => setIsHovered(true))
            container.removeEventListener('mouseleave', () => setIsHovered(false))
        }
    }, [handleMouseMove])

    return (
        <div
            ref={containerRef}
            className="min-h-screen w-full flex items-center justify-center overflow-hidden relative"
            style={{
                background: 'linear-gradient(135deg, #0a0a0a 0%, #0d0d12 25%, #0a0f15 50%, #080a0d 75%, #050505 100%)'
            }}
        >
            {/* Cursor-following glow effect */}
            <motion.div
                className="pointer-events-none absolute rounded-full blur-3xl transition-opacity duration-300 z-20"
                style={{
                    width: glowSize,
                    height: glowSize,
                    left: glowLeft,
                    top: glowTop,
                    background: 'radial-gradient(circle at center, rgba(196, 155, 58, 0.2), rgba(196, 155, 58, 0.08) 40%, transparent 70%)',
                    opacity: isHovered ? 1 : 0,
                }}
            />

            {/* Static spotlight effect - more subtle */}
            <Spotlight
                className="-top-40 left-0 md:left-60 md:-top-20"
                fill="#C49B3A"
            />

            {/* Main content container */}
            <div className="flex w-full max-w-6xl mx-auto h-screen md:h-auto items-center px-4 md:px-8 relative z-10">
                {/* Left side - Auth form */}
                <div className="flex-1 relative z-10 flex items-center justify-center py-8">
                    {children}
                </div>

                {/* Right side - 3D Robot (hidden on mobile) - blended into background */}
                <div className="hidden lg:flex flex-1 relative h-[600px] items-center justify-center">
                    <div className="w-full h-full relative">
                        {/* Loading placeholder */}
                        <AnimatePresence>
                            {!isLoaded && (
                                <motion.div
                                    className="absolute inset-0 flex items-center justify-center"
                                    initial={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="text-center">
                                        <span className="loader"></span>
                                        <p className="mt-4 text-[#6B6966] text-sm">Loading 3D Robot...</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Spline 3D Scene */}
                        <SplineScene
                            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                            className="w-full h-full"
                            onLoad={() => setIsLoaded(true)}
                        />
                    </div>
                </div>
            </div>

            {/* Heavy gradient overlays to blend the robot into black background */}
            {/* Left fade - heavy to blend into form area */}
            <div
                className="absolute inset-0 pointer-events-none z-[5]"
                style={{
                    background: 'linear-gradient(to right, black 0%, black 25%, transparent 55%)'
                }}
            />

            {/* Right fade - subtle */}
            <div
                className="absolute inset-0 pointer-events-none z-[5]"
                style={{
                    background: 'linear-gradient(to left, rgba(0,0,0,0.7) 0%, transparent 30%)'
                }}
            />

            {/* Top fade */}
            <div
                className="absolute inset-0 pointer-events-none z-[5]"
                style={{
                    background: 'linear-gradient(to bottom, black 0%, transparent 25%)'
                }}
            />

            {/* Bottom fade - heavy to hide feet and create seamless blend */}
            <div
                className="absolute inset-0 pointer-events-none z-[5]"
                style={{
                    background: 'linear-gradient(to top, black 0%, black 8%, transparent 35%)'
                }}
            />

            {/* Vignette effect for overall blending */}
            <div
                className="absolute inset-0 pointer-events-none z-[4]"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 80%, black 100%)'
                }}
            />
        </div>
    )
}
