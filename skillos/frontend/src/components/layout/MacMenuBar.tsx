import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Wifi, Battery, Volume2, Search, BellRing, Music,
    FileText, FolderPlus, Save, Printer, Settings, LogOut,
    Undo, Redo, Copy, Clipboard, Scissors, BoxSelect,
    ZoomIn, ZoomOut, Maximize, Minimize2, Layout,
    Home, ArrowLeft, ArrowRight, FolderOpen,
    Columns, LayoutGrid, HelpCircle, Info, MessageCircle,
    X, Play, Pause, SkipForward, SkipBack, Volume1,
    Sun, Moon, Bluetooth, Mic, Command
} from 'lucide-react'

// ... (MenuDropdown and SpotifyPlayer provided previously, will keep them)

interface MenuDropdownProps {
    isOpen: boolean
    onClose: () => void
    items: { label: string; icon?: any; shortcut?: string; onClick?: () => void; divider?: boolean }[]
}

function MenuDropdown({ isOpen, onClose, items }: MenuDropdownProps) {
    if (!isOpen) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute top-full left-0 mt-1 min-w-[220px] bg-[#1A1D20] border border-[rgba(255,255,255,0.07)] rounded-lg shadow-2xl py-1 z-[300]"
            onMouseLeave={onClose}
        >
            {items.map((item, i) =>
                item.divider ? (
                    <div key={i} className="h-px bg-white/10 my-1" />
                ) : (
                    <button
                        key={i}
                        onClick={() => { item.onClick?.(); onClose() }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#23262A] transition-colors text-left"
                    >
                        <span className="flex items-center gap-2 text-[13px] text-white">
                            {item.icon && <item.icon className="w-4 h-4 text-white/60" />}
                            {item.label}
                        </span>
                        {item.shortcut && (
                            <span className="text-[11px] text-white/40 ml-4">{item.shortcut}</span>
                        )}
                    </button>
                )
            )}
        </motion.div>
    )
}

function SpotifyPlayer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const playlists = [
        { name: 'Lo-Fi Beats', id: '0vvXsWCC9xrXsKd4FyS8kM' },
        { name: 'Deep Focus', id: '37i9dQZF1DWZeKCadgRdKQ' },
        { name: 'Coding Mode', id: '37i9dQZF1DX5trt9i14X7j' },
    ]
    const [currentPlaylist, setCurrentPlaylist] = useState(playlists[0])

    if (!isOpen) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full right-0 mt-2 w-[300px] bg-[#1A1D20] border border-[rgba(255,255,255,0.07)] rounded-xl shadow-2xl p-4 z-[300]"
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-green-400 flex items-center gap-2">
                    <Music className="w-3 h-3" /> Spotify
                </span>
                <button onClick={onClose}><X className="w-3 h-3 text-white/50 hover:text-white" /></button>
            </div>
            <div className="space-y-2 mb-3">
                {playlists.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setCurrentPlaylist(p)}
                        className={`block w-full text-left text-xs px-2 py-1.5 rounded ${currentPlaylist.id === p.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}
                    >
                        {p.name}
                    </button>
                ))}
            </div>
            <iframe
                src={`https://open.spotify.com/embed/playlist/${currentPlaylist.id}?utm_source=generator&theme=0`}
                width="100%"
                height="80"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-lg"
            />
        </motion.div>
    )
}

function VolumePopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [volume, setVolume] = useState(75)

    if (!isOpen) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full right-0 mt-2 w-64 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 z-[300]"
            onMouseLeave={onClose}
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Sound</span>
                    <span>{volume}%</span>
                </div>
                <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-white transition-all" style={{ width: `${volume}%` }} />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    />
                </div>

                <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                        <span>Output</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-white p-1.5 bg-white/10 rounded">
                            <Volume2 className="w-3 h-3" />
                            <span>MacBook Pro Speakers</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/50 p-1.5 hover:bg-white/5 rounded transition-colors cursor-pointer">
                            <Bluetooth className="w-3 h-3" />
                            <span>AirPods Pro</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function BatteryPopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full right-0 mt-2 w-56 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 z-[300]"
            onMouseLeave={onClose}
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Battery className="w-5 h-5 text-green-500" />
                </div>
                <div>
                    <p className="text-sm font-medium text-white">100% Charged</p>
                    <p className="text-xs text-white/50">Power Source: Power Adapter</p>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[10px] uppercase font-semibold text-white/40">Significant Energy Usage</p>
                <div className="flex items-center gap-2 p-1.5 rounded bg-white/5 border border-white/5">
                    <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center text-xs">C</div>
                    <span className="text-xs text-white/80">Chrome</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer">
                    <Settings className="w-3 h-3 text-white/60" />
                    <span className="text-xs text-white/60">Battery Preferences...</span>
                </div>
            </div>
        </motion.div>
    )
}

function SpotlightSearch({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="w-full max-w-2xl bg-gray-900/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative"
            >
                <div className="flex items-center gap-4 px-4 py-3 border-b border-white/10">
                    <Search className="w-5 h-5 text-white/50" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Spotlight Search"
                        className="flex-1 bg-transparent text-xl text-white placeholder:text-white/30 outline-none"
                    />
                    <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 bg-white/5 text-xs text-white/50 font-mono">
                        <span className="text-xs">ESC</span>
                    </kbd>
                </div>

                <div className="p-2">
                    <div className="p-2 rounded-lg hover:bg-white/5 cursor-pointer flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                            <LayoutGrid className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-white">Dashboard</p>
                            <p className="text-[10px] text-white/40">Application / Pages</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default function MacMenuBar() {
    const [time, setTime] = useState(new Date())
    const [activeMenu, setActiveMenu] = useState<string | null>(null)
    const [showSpotify, setShowSpotify] = useState(false)
    const [showVolume, setShowVolume] = useState(false)
    const [showBattery, setShowBattery] = useState(false)
    const [showSpotlight, setShowSpotlight] = useState(false)

    const [zoomLevel, setZoomLevel] = useState(100)
    const navigate = useNavigate()

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey && e.key === 'k') {
                e.preventDefault()
                setShowSpotlight(prev => !prev)
            }
            if (e.key === 'Escape') {
                setShowSpotlight(false)
                setActiveMenu(null)
                setShowSpotify(false)
                setShowVolume(false)
                setShowBattery(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const menus: { id: string; label: string; items: any[] }[] = [
        {
            id: 'file',
            label: 'File',
            items: [
                { label: 'New Task', icon: FileText, shortcut: '⌘N', onClick: () => window.dispatchEvent(new CustomEvent('open-add-task')) },
                { label: 'New Folder', icon: FolderPlus, shortcut: '⇧⌘N', onClick: () => alert('Folders coming soon!') },
                { divider: true },
                { label: 'Save', icon: Save, shortcut: '⌘S', onClick: () => alert('All changes auto-saved!') },
                { label: 'Print', icon: Printer, shortcut: '⌘P', onClick: () => window.print() },
            ]
        },
        {
            id: 'edit',
            label: 'Edit',
            items: [
                { label: 'Undo', icon: Undo, shortcut: '⌘Z', onClick: () => document.execCommand('undo') },
                { label: 'Redo', icon: Redo, shortcut: '⇧⌘Z', onClick: () => document.execCommand('redo') },
                { divider: true },
                { label: 'Cut', icon: Scissors, shortcut: '⌘X', onClick: () => document.execCommand('cut') },
                { label: 'Copy', icon: Copy, shortcut: '⌘C', onClick: () => document.execCommand('copy') },
                { label: 'Paste', icon: Clipboard, shortcut: '⌘V', onClick: () => document.execCommand('paste') },
                { label: 'Select All', icon: BoxSelect, shortcut: '⌘A', onClick: () => document.execCommand('selectAll') },
            ]
        },
        {
            id: 'view',
            label: 'View',
            items: [
                {
                    label: `Zoom In`, icon: ZoomIn, shortcut: '⌘+', onClick: () => {
                        setZoomLevel(prev => Math.min(prev + 10, 150))
                        document.body.style.zoom = `${Math.min(zoomLevel + 10, 150)}%`
                    }
                },
                {
                    label: `Zoom Out`, icon: ZoomOut, shortcut: '⌘-', onClick: () => {
                        setZoomLevel(prev => Math.max(prev - 10, 50))
                        document.body.style.zoom = `${Math.max(zoomLevel - 10, 50)}%`
                    }
                },
                { label: 'Reset Zoom', onClick: () => { setZoomLevel(100); document.body.style.zoom = '100%' } },
                { divider: true },
                { label: 'Enter Fullscreen', icon: Maximize, shortcut: '⌃⌘F', onClick: () => document.documentElement.requestFullscreen?.() },
                { label: 'Exit Fullscreen', icon: Minimize2, onClick: () => document.exitFullscreen?.() },
            ]
        },
        { id: 'go', label: 'Go', items: [{ label: 'Back', icon: ArrowLeft, onClick: () => window.history.back() }, { label: 'Forward', icon: ArrowRight, onClick: () => window.history.forward() }] },
        { id: 'help', label: 'Help', items: [{ label: 'About', icon: Info, onClick: () => alert('SkillOS v1.0') }] }
    ]

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-[200] h-7 bg-[#1A1D20] border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between px-4 text-[#9A9996] text-[13px] font-medium">
                {/* Left Side */}
                <div className="flex items-center gap-4">
                    <button className="flex items-center justify-center hover:bg-white/10 rounded px-1.5 -ml-1.5" onClick={() => navigate('/')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                    </button>
                    <span className="font-semibold">SkillOS</span>
                    <div className="flex items-center gap-0 ml-2">
                        {menus.map(menu => (
                            <div key={menu.id} className="relative">
                                <button
                                    className={`px-2.5 py-0.5 rounded transition-colors ${activeMenu === menu.id ? 'bg-[#C49B3A] text-[#0F1113]' : 'hover:bg-[#23262A]'}`}
                                    onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
                                    onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
                                >
                                    {menu.label}
                                </button>
                                <AnimatePresence>
                                    <MenuDropdown isOpen={activeMenu === menu.id} onClose={() => setActiveMenu(null)} items={menu.items} />
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-2 relative">
                    {/* Spotify */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowSpotify(!showSpotify); setShowVolume(false); setShowBattery(false); }}
                            className={`hover:bg-white/10 rounded p-1 ${showSpotify ? 'bg-white/10' : ''}`}
                        >
                            <Music className="w-3.5 h-3.5" />
                        </button>
                        <AnimatePresence>
                            <SpotifyPlayer isOpen={showSpotify} onClose={() => setShowSpotify(false)} />
                        </AnimatePresence>
                    </div>

                    {/* Volume */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowVolume(!showVolume); setShowSpotify(false); setShowBattery(false); }}
                            className={`hover:bg-white/10 rounded p-1 ${showVolume ? 'bg-white/10' : ''}`}
                        >
                            <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <AnimatePresence>
                            <VolumePopup isOpen={showVolume} onClose={() => setShowVolume(false)} />
                        </AnimatePresence>
                    </div>

                    {/* Battery */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowBattery(!showBattery); setShowVolume(false); setShowSpotify(false); }}
                            className={`flex items-center gap-1 hover:bg-white/10 rounded p-1 ${showBattery ? 'bg-white/10' : ''}`}
                        >
                            <Battery className="w-4 h-4" />
                            <span className="text-xs">100%</span>
                        </button>
                        <AnimatePresence>
                            <BatteryPopup isOpen={showBattery} onClose={() => setShowBattery(false)} />
                        </AnimatePresence>
                    </div>

                    {/* WiFi (Static for now) */}
                    <button className="hover:bg-white/10 rounded p-1">
                        <Wifi className="w-3.5 h-3.5" />
                    </button>

                    {/* Spotlight Search */}
                    <button
                        onClick={() => setShowSpotlight(true)}
                        className="hover:bg-white/10 rounded p-1"
                    >
                        <Search className="w-3.5 h-3.5" />
                    </button>

                    {/* DateTime */}
                    <div className="flex items-center gap-2 text-xs ml-2 cursor-default">
                        <span className="opacity-90">{time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span className="opacity-90">{time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                </div>

                {/* Click outside overlay */}
                {(activeMenu || showSpotify || showVolume || showBattery) && (
                    <div className="fixed inset-0 z-[190]" onClick={() => {
                        setActiveMenu(null)
                        setShowSpotify(false)
                        setShowVolume(false)
                        setShowBattery(false)
                    }} />
                )}
            </div>

            {/* Global Spotlight Search Overlay */}
            <AnimatePresence>
                {showSpotlight && <SpotlightSearch isOpen={showSpotlight} onClose={() => setShowSpotlight(false)} />}
            </AnimatePresence>
        </>
    )
}
