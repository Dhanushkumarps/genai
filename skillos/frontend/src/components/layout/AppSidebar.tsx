import { useState } from 'react'
import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, ListTodo, LogOut, Settings,
    Clock, HardDrive, Cloud, Network, User,
    ChevronRight, Search, Folder, Briefcase,
    Cpu, Sparkles, Zap, Package, Shield, Globe, FileText, BarChart3, FileScan, BookOpen, Code2, MessageSquare
} from "lucide-react"
import { useAuth } from "@/features/auth/AuthContext"
import { cn } from "@/lib/utils"
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'

export function AppSidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { signOut, user } = useAuth()
    const [recentTasks, setRecentTasks] = useState<any[]>([])
    const [showRecents, setShowRecents] = useState(false)

    useEffect(() => {
        const fetchRecents = async () => {
            if (!user) return
            const { data } = await supabase
                .from('tasks')
                .select('id, title, status')
                .order('created_at', { ascending: false })
                .limit(5)
            if (data) setRecentTasks(data)
        }
        fetchRecents()
    }, [user])

    const navigation = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/" },
        { icon: ListTodo, label: "Tasks", path: "/tasks" },
        { icon: Briefcase, label: "Placement", path: "/placement" },
    ]

    const features = [
        { icon: Cpu, label: "Processes", path: "/neural" },
        { icon: Sparkles, label: "Memory", path: "/dejavu" },
        { icon: Zap, label: "Flow", path: "/flow" },
        { icon: Package, label: "Skills", path: "/skills" },
        { icon: Shield, label: "Firewall", path: "/firewall" },
        { icon: Globe, label: "Browser", path: "/browser" },
        { icon: FileText, label: "Resources", path: "/resources" },
        { icon: Zap, label: "Skill Bridge", path: "/bridge" },
        { icon: BarChart3, label: "Heatmap", path: "/heatmap" },
        { icon: FileScan, label: "Resume", path: "/resume" },
        { icon: BookOpen, label: "Learning", path: "/learning" },
        { icon: Code2, label: "Coding", path: "/coding" },
        { icon: MessageSquare, label: "Interview", path: "/interview" },
        { icon: FileScan, label: "Exam Autopsy", path: "/exam-autopsy" },
    ]

    return (
        <aside className="fixed left-0 top-7 h-[calc(100vh-28px)] w-52 bg-[#1A1D20] border-r border-[rgba(255,255,255,0.04)] hidden md:flex flex-col z-40">
            {/* Traffic lights */}
            <div className="px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                    <button className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition" />
                    <button className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 transition" />
                    <button className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 transition" />
                </div>
            </div>

            {/* User */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-[rgba(255,255,255,0.04)]">
                <div className="w-8 h-8 rounded-full bg-[#23262A] flex items-center justify-center">
                    <User className="w-4 h-4 text-[#6B6966]" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#E8E6E3] truncate">
                        {user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-[11px] text-[#6B6966]">Active</p>
                </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#23262A] rounded-lg border border-[rgba(255,255,255,0.04)]">
                    <Search className="w-3.5 h-3.5 text-[#4A4845]" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent text-[13px] text-[#E8E6E3] placeholder:text-[#4A4845] outline-none w-full"
                    />
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 scrollbar-minimal py-2 px-2">
                <div className="mb-4">
                    <p className="px-3 mb-2 text-[11px] font-medium text-[#6B6966] uppercase tracking-wider">
                        Navigation
                    </p>
                    <nav className="space-y-0.5">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.path
                            return (
                                <Link key={item.path} to={item.path}>
                                    <div className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[13px]",
                                        isActive
                                            ? "bg-[rgba(196,155,58,0.08)] text-[#C49B3A]"
                                            : "text-[#9A9996] hover:bg-[#2A2E33] hover:text-[#E8E6E3]"
                                    )}>
                                        <item.icon className="w-4 h-4" />
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Features */}
                <div className="mb-4">
                    <p className="px-3 mb-2 text-[11px] font-medium text-[#6B6966] uppercase tracking-wider">
                        Features
                    </p>
                    <nav className="space-y-0.5">
                        {features.map((item) => {
                            const isActive = location.pathname === item.path
                            return (
                                <Link key={item.path} to={item.path}>
                                    <div className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[13px]",
                                        isActive
                                            ? "bg-[rgba(196,155,58,0.08)] text-[#C49B3A]"
                                            : "text-[#9A9996] hover:bg-[#2A2E33] hover:text-[#E8E6E3]"
                                    )}>
                                        <item.icon className="w-4 h-4" />
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Recents */}
                <div>
                    <button
                        onClick={() => setShowRecents(!showRecents)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#9A9996] hover:text-[#E8E6E3] transition"
                    >
                        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showRecents && "rotate-90")} />
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Recents</span>
                        <span className="ml-auto text-[11px] text-[#4A4845]">{recentTasks.length}</span>
                    </button>

                    <AnimatePresence>
                        {showRecents && recentTasks.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pl-6 space-y-0.5"
                            >
                                {recentTasks.map(task => (
                                    <Link key={task.id} to={`/tasks?highlight=${task.id}`}>
                                        <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#6B6966] hover:text-[#9A9996] hover:bg-[#23262A] rounded transition">
                                            <Folder className="w-3.5 h-3.5" />
                                            <span className="truncate">{task.title}</span>
                                        </div>
                                    </Link>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Bottom */}
            <div className="p-2 border-t border-[rgba(255,255,255,0.04)]">
                <button
                    onClick={() => navigate('/settings')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[#6B6966] hover:bg-[#23262A] hover:text-[#9A9996] transition"
                >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                </button>
                <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[#6B6966] hover:bg-[rgba(184,84,80,0.1)] hover:text-[#B85450] transition"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    )
}
