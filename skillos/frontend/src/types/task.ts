import type { Database } from './supabase'

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type TaskStatus = 'pending' | 'active' | 'completed'

export interface TaskGroup {
    status: TaskStatus
    tasks: Task[]
    totalDifficulty: number
}

export interface DragItem {
    id: string
    type: string
    index: number
}
