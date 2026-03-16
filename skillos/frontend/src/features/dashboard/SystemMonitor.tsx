import { useLayoutEffect, useRef, useMemo } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useRealtimeStats } from './useRealtimeStats'
import { format } from 'date-fns'

/**
 * System Monitor - Professional Diagnostic Tool
 * 
 * Style:
 * - Dark background
 * - Thin, elegant charts
 * - Muted colors
 * - Neutral grey for baseline
 * - Muted yellow only for critical states
 * 
 * Looks like something Apple engineers would use internally.
 */

export default function SystemMonitor() {
    const { data, status, latest, refresh } = useRealtimeStats()
    const chartRef = useRef<HTMLDivElement>(null)
    const uplotInst = useRef<uPlot | null>(null)

    // Prepare data for uPlot
    const plotData = useMemo(() => {
        const times: number[] = []
        const loads: number[] = []
        const energies: number[] = []

        data.forEach(d => {
            times.push(d.time)
            loads.push(d.cognitive_load)
            energies.push(d.energy_level)
        })

        return [times, loads, energies] as [number[], number[], number[]]
    }, [data])

    // Initialize or Update Chart
    useLayoutEffect(() => {
        if (!chartRef.current) return

        if (!uplotInst.current) {
            const opts: uPlot.Options = {
                width: chartRef.current.clientWidth,
                height: 220,
                padding: [16, 12, 0, 0],
                cursor: {
                    show: true,
                    points: {
                        show: true,
                        size: 6,
                        stroke: '#6B6966',
                        fill: '#1A1D20'
                    }
                },
                series: [
                    {},
                    {
                        label: "Cognitive Load",
                        stroke: "#6B6966",  // Neutral grey baseline
                        width: 1.5,
                        fill: "rgba(107, 105, 102, 0.04)",
                    },
                    {
                        label: "Energy",
                        stroke: "#5A9A5A",  // Muted green
                        width: 1.5,
                        fill: "rgba(90, 154, 90, 0.04)",
                    }
                ],
                axes: [
                    {
                        stroke: "#4A4845",
                        font: "11px Inter, sans-serif",
                        grid: {
                            stroke: "rgba(255,255,255,0.03)",
                            width: 1
                        },
                        ticks: {
                            stroke: "rgba(255,255,255,0.06)",
                            width: 1,
                            size: 4
                        }
                    },
                    {
                        stroke: "#4A4845",
                        font: "11px Inter, sans-serif",
                        grid: {
                            stroke: "rgba(255,255,255,0.03)",
                            width: 1
                        },
                        ticks: {
                            stroke: "rgba(255,255,255,0.06)",
                            width: 1,
                            size: 4
                        },
                        side: 1,
                    }
                ],
                scales: {
                    x: { time: true },
                    y: { auto: false, range: [0, 100] }
                },
                legend: { show: false }
            }

            uplotInst.current = new uPlot(opts, plotData, chartRef.current)
        } else {
            uplotInst.current.setData(plotData)
        }

        const resizeObserver = new ResizeObserver(entries => {
            if (!uplotInst.current) return
            for (let entry of entries) {
                uplotInst.current.setSize({
                    width: entry.contentRect.width,
                    height: 220
                })
            }
        })
        resizeObserver.observe(chartRef.current)

        return () => resizeObserver.disconnect()
    }, [plotData])

    // Status - uses muted yellow only for critical
    const getLoadStatus = (val: number) => {
        if (val > 90) return { text: 'CRITICAL', color: '#C49B3A', bg: 'rgba(196,155,58,0.08)' }
        if (val > 70) return { text: 'HIGH', color: '#9A9996', bg: 'rgba(255,255,255,0.04)' }
        return { text: 'NOMINAL', color: '#5A9A5A', bg: 'rgba(90,154,90,0.06)' }
    }

    const loadStatus = getLoadStatus(latest?.cognitive_load || 0)

    return (
        <div className="flex flex-col gap-5">
            {/* Header - Minimal, diagnostic style */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-[13px] font-medium text-[#E8E6E3]">System Diagnostics</h3>
                        <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-sm"
                            style={{
                                color: loadStatus.color,
                                background: loadStatus.bg,
                            }}
                        >
                            {loadStatus.text}
                        </span>
                    </div>
                    <p className="text-[11px] text-[#4A4845] mt-1 font-mono">
                        {latest ? format(new Date(latest.time * 1000), 'HH:mm:ss') : '--:--:--'} UTC
                    </p>
                </div>

                <button
                    onClick={refresh}
                    className="text-[#6B6966] hover:text-[#9A9996] p-1.5 rounded hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                    title="Refresh"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M23 4v6h-6M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                </button>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-4">
                {/* Cognitive Load */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#6B6966] uppercase tracking-wide">CPU Load</span>
                        <span
                            className="text-[15px] font-semibold tabular-nums"
                            style={{
                                color: (latest?.cognitive_load ?? 0) > 90 ? '#C49B3A' : '#9A9996'
                            }}
                        >
                            {latest?.cognitive_load ?? 0}%
                        </span>
                    </div>
                    <div className="h-[3px] bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                        <div
                            className="h-full transition-all duration-500 ease-out rounded-full"
                            style={{
                                width: `${latest?.cognitive_load ?? 0}%`,
                                background: (latest?.cognitive_load ?? 0) > 90 ? '#C49B3A' : '#6B6966'
                            }}
                        />
                    </div>
                </div>

                {/* Energy */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#6B6966] uppercase tracking-wide">Energy</span>
                        <span className="text-[15px] font-semibold text-[#9A9996] tabular-nums">
                            {latest?.energy_level ?? 0}%
                        </span>
                    </div>
                    <div className="h-[3px] bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#5A9A5A] transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${latest?.energy_level ?? 0}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Chart - Dark, thin, elegant */}
            <div className="relative rounded-lg overflow-hidden bg-[#0F1113] border border-[rgba(255,255,255,0.04)]">
                {status === 'disconnected' && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded bg-[rgba(184,84,80,0.1)] z-10">
                        <span className="w-1.5 h-1.5 bg-[#B85450] rounded-full" />
                        <span className="text-[10px] text-[#B85450]">Disconnected</span>
                    </div>
                )}
                <div ref={chartRef} className="system-monitor-chart" />
            </div>

            {/* Legend - Minimal */}
            <div className="flex items-center gap-6 text-[11px]">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-[2px] bg-[#6B6966] rounded-full" />
                    <span className="text-[#6B6966]">Cognitive Load</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-[2px] bg-[#5A9A5A] rounded-full" />
                    <span className="text-[#6B6966]">Energy Level</span>
                </div>
            </div>

            {/* uPlot dark theme styles */}
            <style>{`
                .system-monitor-chart .u-legend { display: none; }
                .system-monitor-chart .u-title { display: none; }
                .system-monitor-chart .u-wrap { background: transparent; }
                .system-monitor-chart .u-select { background: rgba(196, 155, 58, 0.08); }
                .system-monitor-chart .u-cursor-x,
                .system-monitor-chart .u-cursor-y {
                    border-color: rgba(255,255,255,0.08) !important;
                }
            `}</style>
        </div>
    )
}
