import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, TaskStatus } from '@/types/task'
import confetti from 'canvas-confetti'

export function useTaskOperations() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const fetchTasks = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            if (error) throw error
            setTasks(data || [])
        } catch (err: any) {
            setError(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchTasks()

        const channel = supabase
            .channel('public:tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setTasks(prev => [payload.new as Task, ...prev])
                } else if (payload.eventType === 'UPDATE') {
                    setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t).filter(t => !t.deleted_at)) // Remove if soft-deleted via update
                } else if (payload.eventType === 'DELETE') {
                    setTasks(prev => prev.filter(t => t.id !== payload.old.id))
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchTasks])

    const addTask = async (title: string, description: string, difficulty: number) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        // Optimistic update
        const tempId = crypto.randomUUID()
        const newTask: Task = {
            id: tempId,
            user_id: user.id,
            title,
            description,
            difficulty,
            status: 'pending',
            created_at: new Date().toISOString(),
            completed_at: null,
            deleted_at: null
        } as unknown as Task // Cast because deleted_at might not be in generated types yet

        setTasks(prev => [newTask, ...prev])

        const { error } = await supabase.from('tasks').insert({
            user_id: user.id,
            title,
            description,
            difficulty,
            status: 'pending'
        })

        if (error) {
            // Rollback
            setTasks(prev => prev.filter(t => t.id !== tempId))
            throw error
        }
    }

    const updateStatus = async (id: string, status: TaskStatus) => {
        // Optimistic
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))

        if (status === 'completed') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })
        }

        const { error } = await supabase.from('tasks').update({
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : null
        }).eq('id', id)

        if (error) throw error // Should trigger refetch or rollback in real app
    }

    const deleteTask = async (id: string) => {
        // Optimistic
        setTasks(prev => prev.filter(t => t.id !== id))

        const { error } = await supabase.from('tasks').update({
            deleted_at: new Date().toISOString()
        } as any).eq('id', id)

        if (error) throw error
    }

    return { tasks, loading, error, addTask, updateStatus, deleteTask }
}
