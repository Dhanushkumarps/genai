import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart3, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import MacWindow from '@/components/ui/MacWindow'
import { useMarketTrends, type MarketTrend } from './useMarketTrends'

const SKILL_CATEGORIES: Record<string, string[]> = {
    'Languages': ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C++', 'R', 'MATLAB', 'Swift', 'Kotlin'],
    'Frontend': ['React', 'Vue', 'Angular', 'Next.js', 'Tailwind', 'Figma', 'Flutter', 'React Native'],
    'Backend': ['Node.js', 'FastAPI', 'Django', 'Spring Boot', 'REST API', 'GraphQL', 'Microservices'],
    'Data & AI': ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'LLM', 'OpenAI', 'LangChain', 'Vector DB', 'Spark', 'Kafka', 'Airflow'],
    'Cloud & DevOps': ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'CI/CD', 'Linux'],
    'Databases': ['SQL', 'PostgreSQL', 'MongoDB', 'Redis'],
    'Tools & Analytics': ['Git', 'Tableau', 'Power BI', 'Excel', 'Selenium', 'Pytest', 'Jest', 'Cypress'],
    'Methodologies': ['Agile', 'Scrum', 'Data Structures', 'System Design'],
}

function LiveDataBadge({ isLive }: { isLive: boolean }) {
    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide ${isLive
                ? 'bg-[rgba(48,232,189,0.1)] text-[#30e8bd] border border-[rgba(48,232,189,0.2)]'
                : 'bg-[rgba(107,105,102,0.1)] text-[#6B6966] border border-[rgba(107,105,102,0.2)]'
            }`}>
            {isLive ? (
                <>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30e8bd] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#30e8bd]" />
                    </span>
                    LIVE DATA
                </>
            ) : (
                <>
                    <WifiOff className="w-3 h-3" />
                    SAMPLE DATA
                </>
            )}
        </div>
    )
}

function HeatCell({ skill, score, maxScore }: { skill: string; score: number; maxScore: number }) {
    const intensity = maxScore > 0 ? score / maxScore : 0
    const bg = intensity > 0.7
        ? 'bg-[#30e8bd]'
        : intensity > 0.4
            ? 'bg-[#30e8bd]/60'
            : intensity > 0.15
                ? 'bg-[#30e8bd]/30'
                : intensity > 0
                    ? 'bg-[#30e8bd]/15'
                    : 'bg-[#1A1D20]'

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.08, zIndex: 10 }}
            className={`relative group rounded-lg p-2.5 cursor-pointer border border-[rgba(255,255,255,0.04)] transition-colors ${bg}`}
        >
            <span className={`text-[11px] font-medium leading-tight block truncate ${intensity > 0.4 ? 'text-[#0a0a1a]' : 'text-[#9A9996]'
                }`}>
                {skill}
            </span>
            {score > 0 && (
                <span className={`text-[9px] mt-0.5 block ${intensity > 0.4 ? 'text-[#0a0a1a]/70' : 'text-[#6B6966]'
                    }`}>
                    {score}%
                </span>
            )}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#1A1D20] border border-[rgba(255,255,255,0.1)] rounded-lg text-[11px] text-[#E8E6E3] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                <span className="font-medium">{skill}</span>
                <span className="text-[#6B6966] ml-1.5">
                    {score > 0 ? `${score}% demand` : 'No data'}
                </span>
            </div>
        </motion.div>
    )
}

// Sample data when no live trends are available
const SAMPLE_SCORES: Record<string, number> = {
    'Python': 82, 'JavaScript': 75, 'React': 68, 'Node.js': 55, 'SQL': 60,
    'AWS': 52, 'Docker': 48, 'TypeScript': 65, 'Machine Learning': 40,
    'Git': 70, 'REST API': 45, 'PostgreSQL': 38, 'Kubernetes': 35,
    'CI/CD': 42, 'Linux': 50, 'Agile': 30, 'Next.js': 28,
}

export default function SkillHeatmap() {
    const { trends, loading, isLive } = useMarketTrends()
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    const trendMap = useMemo(() => {
        const map: Record<string, number> = {}
        if (isLive) {
            for (const t of trends) {
                map[t.skill] = t.demand_score
            }
        } else {
            Object.assign(map, SAMPLE_SCORES)
        }
        return map
    }, [trends, isLive])

    const categories = selectedCategory
        ? { [selectedCategory]: SKILL_CATEGORIES[selectedCategory] }
        : SKILL_CATEGORIES

    const maxScore = Math.max(...Object.values(trendMap), 1)

    const topSkills = useMemo(() => {
        return Object.entries(trendMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
    }, [trendMap])

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(48,232,189,0.1)] flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-[#30e8bd]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#E8E6E3]">Skill Demand Heatmap</h1>
                        <p className="text-[13px] text-[#6B6966]">Real-time market intelligence from job scraping</p>
                    </div>
                </div>
                <LiveDataBadge isLive={isLive} />
            </div>

            {/* Top Skills Bar */}
            <MacWindow title="top-demand.chart" className="bg-[#1A1D20]">
                <div className="p-4 space-y-2.5">
                    {topSkills.map(([skill, score], i) => (
                        <div key={skill} className="flex items-center gap-3">
                            <span className="text-[11px] text-[#6B6966] w-4 text-right">{i + 1}</span>
                            <span className="text-[13px] text-[#E8E6E3] w-28 truncate font-medium">{skill}</span>
                            <div className="flex-1 h-5 bg-[#0a2e5c] rounded overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(4, (score / maxScore) * 100)}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.05 }}
                                    className="h-full bg-gradient-to-r from-[#30e8bd] to-[#20c09a] rounded"
                                />
                            </div>
                            <span className="text-[12px] text-[#9A9996] w-10 text-right font-mono">{score}%</span>
                        </div>
                    ))}
                </div>
            </MacWindow>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${!selectedCategory
                            ? 'bg-[rgba(48,232,189,0.15)] text-[#30e8bd] border border-[rgba(48,232,189,0.3)]'
                            : 'bg-[#23262A] text-[#6B6966] border border-[rgba(255,255,255,0.04)] hover:text-[#9A9996]'
                        }`}
                >
                    All
                </button>
                {Object.keys(SKILL_CATEGORIES).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${selectedCategory === cat
                                ? 'bg-[rgba(48,232,189,0.15)] text-[#30e8bd] border border-[rgba(48,232,189,0.3)]'
                                : 'bg-[#23262A] text-[#6B6966] border border-[rgba(255,255,255,0.04)] hover:text-[#9A9996]'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Heatmap Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-[#6B6966]">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    Loading market data…
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(categories).map(([cat, skills]) => (
                        <div key={cat}>
                            <h3 className="text-[12px] font-medium text-[#6B6966] uppercase tracking-wider mb-3 flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5" />
                                {cat}
                            </h3>
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                {skills.map((skill) => (
                                    <HeatCell
                                        key={skill}
                                        skill={skill}
                                        score={trendMap[skill] || 0}
                                        maxScore={maxScore}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
