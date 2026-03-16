import { useState, useEffect, useCallback } from 'react'
import {
    Package, TrendingUp, AlertTriangle, Download, ArrowUp,
    Clock, GitBranch, ChevronRight, Star, Zap, CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import MacWindow from '@/components/ui/MacWindow'

const callSkillManager = async (action: string, data: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/skill-package-manager`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action, user_id: user?.id, data })
    })
    return response.json()
}

interface Skill {
    id: string
    skill_name: string
    skill_category: string
    version: number
    effective_version: number
    days_since_practice: number
    status: 'fresh' | 'stale' | 'decaying'
}

export default function SkillPackageManager() {
    const { user } = useAuth()
    const [skills, setSkills] = useState<Skill[]>([])
    const [registry, setRegistry] = useState<any[]>([])
    const [totalSkills, setTotalSkills] = useState(0)
    const [avgProficiency, setAvgProficiency] = useState(0)
    const [decayingCount, setDecayingCount] = useState(0)
    const [newSkill, setNewSkill] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [upgradePath, setUpgradePath] = useState<any>(null)
    const [selectedSkill, setSelectedSkill] = useState<string | null>(null)

    const loadSkills = useCallback(async () => {
        const result = await callSkillManager('get_my_skills')
        if (result.success) {
            setSkills(result.skills || [])
            setTotalSkills(result.total_skills)
            setAvgProficiency(result.avg_proficiency)
            setDecayingCount(result.decaying_count)
        }
    }, [])

    const loadRegistry = useCallback(async () => {
        const result = await callSkillManager('get_skill_registry')
        if (result.success) setRegistry(result.skills || [])
    }, [])

    useEffect(() => {
        loadSkills()
        loadRegistry()
    }, [loadSkills, loadRegistry])

    const installSkill = async () => {
        if (!newSkill.trim()) return
        setIsLoading(true)
        const result = await callSkillManager('install_skill', { skill_name: newSkill, initial_version: 10 })
        if (result.success) {
            await loadSkills()
            setNewSkill('')
        } else if (result.missing_prerequisites) {
            alert(result.message)
        }
        setIsLoading(false)
    }

    const upgradeSkill = async (skillName: string) => {
        await callSkillManager('upgrade_skill', { skill_name: skillName, points: 5, activity: 'practice' })
        await loadSkills()
    }

    const calculateUpgradePath = async (skillName: string) => {
        setIsLoading(true)
        const result = await callSkillManager('calculate_upgrade_path', { target_skill: skillName, target_version: 80 })
        if (result.success) {
            setUpgradePath(result)
            setSelectedSkill(skillName)
        }
        setIsLoading(false)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'fresh': return 'text-green-400'
            case 'stale': return 'text-yellow-400'
            case 'decaying': return 'text-red-400'
            default: return 'text-white/60'
        }
    }

    const getVersionColor = (version: number) => {
        if (version >= 80) return 'from-green-500 to-emerald-500'
        if (version >= 60) return 'from-blue-500 to-cyan-500'
        if (version >= 40) return 'from-yellow-500 to-orange-500'
        return 'from-red-500 to-pink-500'
    }

    return (
        <div className="p-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        Skill Package Manager
                    </h1>
                    <p className="text-white/50 mt-1">npm install your-brain</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-green-400" />
                        <span className="text-white/60 text-sm">Installed Skills</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{totalSkills}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <span className="text-white/60 text-sm">Avg Proficiency</span>
                    </div>
                    <p className="text-2xl font-bold text-white">v{avgProficiency}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        <span className="text-white/60 text-sm">Decaying</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-400">{decayingCount}</p>
                </div>
            </div>

            {/* Install New Skill */}
            <div className="flex gap-2 mb-6">
                <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="npm install <skill-name>"
                    className="flex-1 font-mono"
                    onKeyPress={(e) => e.key === 'Enter' && installSkill()}
                />
                <Button onClick={installSkill} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Install
                </Button>
            </div>

            {/* Installed Skills */}
            <MacWindow title="Installed Packages" icon={<Package className="w-4 h-4" />}>
                <div className="divide-y divide-white/5">
                    {skills.length === 0 ? (
                        <div className="p-8 text-center">
                            <Package className="w-12 h-12 text-white/20 mx-auto mb-3" />
                            <p className="text-white/40">No skills installed yet</p>
                        </div>
                    ) : (
                        skills.map(skill => (
                            <div key={skill.id} className="p-4 hover:bg-white/5 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium">{skill.skill_name}</span>
                                            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/50 font-mono">
                                                v{skill.effective_version.toFixed(1)}
                                            </span>
                                            <span className={`text-xs ${getStatusColor(skill.status)}`}>
                                                {skill.status === 'decaying' && '⚠️ '}
                                                {skill.days_since_practice}d ago
                                            </span>
                                        </div>
                                        <span className="text-xs text-white/40">{skill.skill_category}</span>
                                    </div>

                                    {/* Version Bar */}
                                    <div className="w-32">
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full bg-gradient-to-r ${getVersionColor(skill.effective_version)}`}
                                                style={{ width: `${skill.effective_version}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" variant="ghost" onClick={() => upgradeSkill(skill.skill_name)}>
                                            <ArrowUp className="w-4 h-4 text-green-400" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => calculateUpgradePath(skill.skill_name)}>
                                            <GitBranch className="w-4 h-4 text-blue-400" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </MacWindow>

            {/* Available Skills */}
            <div className="mt-6">
                <h3 className="text-white/60 text-sm mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" /> Available in Registry
                </h3>
                <div className="flex flex-wrap gap-2">
                    {registry.slice(0, 10).map(skill => (
                        <button
                            key={skill.id}
                            onClick={() => setNewSkill(skill.skill_name)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-colors"
                        >
                            {skill.skill_name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Upgrade Path Modal */}
            {upgradePath && selectedSkill && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
                    <div className="bg-gray-900 rounded-2xl border border-white/10 max-w-lg w-full">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-white font-medium">Upgrade Path to {selectedSkill}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setUpgradePath(null)}>✕</Button>
                        </div>
                        <div className="p-4 space-y-3">
                            {upgradePath.path?.map((step: any, i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-400">
                                        {step.step}
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-white">{step.skill}</span>
                                        <span className="text-white/40 text-sm ml-2">
                                            v{step.current_version} → v{step.target_version}
                                        </span>
                                    </div>
                                    <span className="text-white/40 text-sm">{step.estimated_hours}h</span>
                                </div>
                            ))}
                            <div className="pt-3 border-t border-white/10">
                                <p className="text-white/60 text-sm">
                                    Total: <span className="text-white">{upgradePath.total_hours}h</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
