import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

interface CommandResult {
    success: boolean
    message: string
    data?: any
}

/**
 * ARIA OS-level commands - Full system access with AI enhancement
 */
export function useARIACommands() {
    const { user } = useAuth()
    const [isExecuting, setIsExecuting] = useState(false)

    // Try AI Edge Function for enhanced responses
    const callAI = async (prompt: string): Promise<string | null> => {
        try {
            const { data, error } = await supabase.functions.invoke('ai-complete', {
                body: {
                    mode: 'chat',
                    messages: [
                        { role: 'system', content: 'You are ARIA, an AI assistant for SkillOS. Provide concise, helpful responses.' },
                        { role: 'user', content: prompt }
                    ]
                }
            })

            if (error || !data?.content) return null
            return data.content
        } catch {
            return null
        }
    }

    // ===== TASK COMMANDS =====
    const createTask = useCallback(async (title: string, description?: string, priority: string = 'medium'): Promise<CommandResult> => {
        if (!user?.id) return { success: false, message: 'Not authenticated' }

        const { data, error } = await supabase.from('tasks').insert({
            user_id: user.id,
            title,
            description,
            priority,
            status: 'pending'
        }).select().single()

        if (error) return { success: false, message: error.message }
        return { success: true, message: `✅ Task "${title}" created!`, data }
    }, [user?.id])

    const completeTask = useCallback(async (taskId: string): Promise<CommandResult> => {
        const { error } = await supabase.from('tasks')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', taskId)

        if (error) return { success: false, message: error.message }
        return { success: true, message: '✅ Task marked complete!' }
    }, [])

    const deleteTask = useCallback(async (taskId: string): Promise<CommandResult> => {
        const { error } = await supabase.from('tasks')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', taskId)

        if (error) return { success: false, message: error.message }
        return { success: true, message: '🗑️ Task deleted' }
    }, [])

    const listTasks = useCallback(async (status?: string): Promise<CommandResult> => {
        let query = supabase.from('tasks').select('*').is('deleted_at', null)
        if (status) query = query.eq('status', status as any)

        const { data, error } = await query.order('created_at', { ascending: false }).limit(10)
        if (error) return { success: false, message: error.message }
        return { success: true, message: `📋 Found ${data?.length || 0} tasks`, data }
    }, [])

    // ===== LEARNING LOG COMMANDS =====
    const addLearningLog = useCallback(async (content: string, tags: string[] = []): Promise<CommandResult> => {
        if (!user?.id) return { success: false, message: 'Not authenticated' }

        const { data, error } = await supabase.from('learning_logs').insert({
            user_id: user.id,
            content,
            tags
        }).select().single()

        if (error) return { success: false, message: error.message }
        return { success: true, message: '📝 Learning log saved!', data }
    }, [user?.id])

    const searchLogs = useCallback(async (query: string): Promise<CommandResult> => {
        const { data, error } = await supabase.from('learning_logs')
            .select('*')
            .ilike('content', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(5)

        if (error) return { success: false, message: error.message }
        return { success: true, message: `🔍 Found ${data?.length || 0} logs`, data }
    }, [])

    // ===== BRAIN DUMP COMMANDS =====
    const addBrainDump = useCallback(async (content: string): Promise<CommandResult> => {
        if (!user?.id) return { success: false, message: 'Not authenticated' }

        const { data, error } = await supabase.from('brain_dumps').insert({
            user_id: user.id,
            content
        }).select().single()

        if (error) return { success: false, message: error.message }
        return { success: true, message: '🧠 Brain dump saved!', data }
    }, [user?.id])

    // ===== SYSTEM COMMANDS =====
    const getSystemStats = useCallback(async (): Promise<CommandResult> => {
        const { data, error } = await supabase.from('system_stats')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) return { success: false, message: error.message }
        return {
            success: true,
            message: data ? `⚡ Energy: ${data.energy_level}% | 🧠 Load: ${data.cognitive_load}%` : 'No stats yet',
            data
        }
    }, [])

    const updateSystemStats = useCallback(async (cognitiveLoad: number, energyLevel: number): Promise<CommandResult> => {
        if (!user?.id) return { success: false, message: 'Not authenticated' }

        const { error } = await supabase.from('system_stats').insert({
            user_id: user.id,
            cognitive_load: cognitiveLoad,
            energy_level: energyLevel
        })

        if (error) return { success: false, message: error.message }
        return { success: true, message: '📊 System stats updated' }
    }, [user?.id])

    // ===== ANALYTICS =====
    const getDashboardStats = useCallback(async (): Promise<CommandResult> => {
        if (!user?.id) return { success: false, message: 'Not authenticated' }

        const [tasksRes, logsRes, dumpsRes, statsRes] = await Promise.all([
            supabase.from('tasks').select('status').eq('user_id', user.id).is('deleted_at', null),
            supabase.from('learning_logs').select('id').eq('user_id', user.id),
            supabase.from('brain_dumps').select('id').eq('user_id', user.id),
            supabase.from('system_stats').select('energy_level, cognitive_load').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        ])

        const tasks = tasksRes.data || []
        const pendingTasks = tasks.filter(t => t.status === 'pending').length
        const completedTasks = tasks.filter(t => t.status === 'completed').length
        const totalLogs = logsRes.data?.length || 0
        const totalDumps = dumpsRes.data?.length || 0
        const stats = statsRes.data

        return {
            success: true,
            message: 'Dashboard stats retrieved',
            data: {
                pendingTasks,
                completedTasks,
                totalLogs,
                totalDumps,
                energy: stats?.energy_level || 50,
                cognitiveLoad: stats?.cognitive_load || 50
            }
        }
    }, [user?.id])

    // ===== AI-POWERED EXECUTION =====
    const executeCommand = useCallback(async (command: string): Promise<CommandResult> => {
        setIsExecuting(true)
        try {
            const cmd = command.toLowerCase().trim()

            // Task commands
            if (cmd.startsWith('create task ') || cmd.startsWith('add task ')) {
                const title = command.replace(/^(create|add) task /i, '').trim()
                return await createTask(title)
            }
            if (cmd.startsWith('complete task ') || cmd.startsWith('done ')) {
                const taskId = command.replace(/^(complete task|done) /i, '').trim()
                return await completeTask(taskId)
            }
            if (cmd === 'list tasks' || cmd === 'show tasks' || cmd === 'tasks') {
                return await listTasks()
            }
            if (cmd === 'pending tasks' || cmd === 'pending') {
                return await listTasks('pending')
            }

            // Log commands
            if (cmd.startsWith('log ') || cmd.startsWith('learn ')) {
                const content = command.replace(/^(log|learn) /i, '').trim()
                return await addLearningLog(content)
            }
            if (cmd.startsWith('search ') || cmd.startsWith('find ')) {
                const query = command.replace(/^(search|find) /i, '').trim()
                return await searchLogs(query)
            }

            // Brain dump
            if (cmd.startsWith('dump ') || cmd.startsWith('note ')) {
                const content = command.replace(/^(dump|note) /i, '').trim()
                return await addBrainDump(content)
            }

            // Stats
            if (cmd === 'stats' || cmd === 'status' || cmd === 'dashboard') {
                return await getDashboardStats()
            }
            if (cmd === 'energy' || cmd === 'system') {
                return await getSystemStats()
            }

            // Help
            if (cmd === 'help' || cmd === '?') {
                return {
                    success: true,
                    message: `**🤖 ARIA Commands:**

📋 **Tasks:**
• \`create task [title]\` - Create new task
• \`list tasks\` - Show all tasks
• \`pending\` - Show pending only

📝 **Learning:**
• \`log [content]\` - Add learning log
• \`search [query]\` - Search logs

🧠 **Notes:**
• \`dump [content]\` - Brain dump

📊 **System:**
• \`stats\` - Dashboard overview
• \`energy\` - Current energy/load

💬 **Chat:**
Just type naturally for AI responses!`
                }
            }

            // Try AI for natural language
            const aiResponse = await callAI(`User command: "${command}"\n\nContext: The user is using SkillOS, a productivity OS. Provide a helpful response.`)

            if (aiResponse) {
                return { success: true, message: aiResponse }
            }

            // Offline fallback for unknown commands
            return {
                success: false,
                message: `Unknown command: "${command}"\n\nType \`help\` to see available commands.`
            }
        } finally {
            setIsExecuting(false)
        }
    }, [createTask, completeTask, listTasks, addLearningLog, searchLogs, addBrainDump, getDashboardStats, getSystemStats])

    return {
        isExecuting,
        createTask,
        completeTask,
        deleteTask,
        listTasks,
        addLearningLog,
        searchLogs,
        addBrainDump,
        getSystemStats,
        updateSystemStats,
        getDashboardStats,
        executeCommand
    }
}
