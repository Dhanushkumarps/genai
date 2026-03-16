import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, ArrowRight, Search, Briefcase } from 'lucide-react'

export default function SkillBridgePage() {
    const navigate = useNavigate()
    const [url, setUrl] = useState('')

    const handleAnalyze = (e: React.FormEvent) => {
        e.preventDefault()
        if (url.trim()) {
            // For now, redirect to browser with the URL. 
            // Ideally, we could add a query param to auto-trigger analysis, 
            // but simply opening the page is a good first step.
            // The browser will show the Zap button.
            navigate(`/browser?url=${encodeURIComponent(url)}&autoAnalyze=true`)
        }
    }

    return (
        <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
                <div className="w-20 h-20 rounded-3xl bg-[rgba(168,85,247,0.1)] flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-10 h-10 text-purple-400" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    Contextual Skill Bridge
                </h1>
                <p className="text-[#9A9996] text-lg max-w-xl">
                    Bridge the gap between your current skills and your dream role.
                    Paste a job posting or documentation URL to get an instant, personalized learning plan.
                </p>
            </motion.div>

            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onSubmit={handleAnalyze}
                className="w-full relative group"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-50" />
                <div className="relative flex items-center bg-[#1A1D20] border border-[rgba(255,255,255,0.1)] rounded-2xl p-2 pl-6 shadow-2xl">
                    <Search className="w-5 h-5 text-[#6B6966] mr-3" />
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste job URL, GitHub repo, or documentation link..."
                        className="flex-1 bg-transparent border-none outline-none text-[#E8E6E3] placeholder:text-[#6B6966] h-12"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!url.trim()}
                        className="h-12 px-8 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        Analyze <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </motion.form>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex gap-4 text-sm text-[#6B6966]"
            >
                <div className="flex items-center gap-2 px-4 py-2 bg-[#23262A] rounded-full border border-white/5">
                    <Briefcase className="w-3.5 h-3.5" /> Job Posts
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#23262A] rounded-full border border-white/5">
                    <div className="w-3.5 h-3.5 rounded-full border border-current" /> GitHub Repos
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#23262A] rounded-full border border-white/5">
                    <div className="w-3.5 h-3.5 bg-current rounded-[1px]" /> Documentation
                </div>
            </motion.div>
        </div>
    )
}
