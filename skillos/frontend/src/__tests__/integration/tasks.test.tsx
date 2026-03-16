import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

// Mock Supabase - must be before any component imports
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn().mockResolvedValue({ data: [{ id: '1', title: 'New Task', status: 'pending' }], error: null }),
            update: vi.fn().mockResolvedValue({ data: [{ id: '1', status: 'completed' }], error: null }),
            delete: vi.fn().mockResolvedValue({ error: null }),
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
            unsubscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: '123' } } }) },
    },
}))

import TasksPage from '@/pages/TasksPage'

describe('Task Management', () => {
    it('renders task list without crashing', async () => {
        render(<TasksPage />)

        // Wait for loading to finish
        await waitFor(() => {
            // After loading, either the task input or empty state should be visible
            // The component shows a loading spinner first, then the actual UI
            expect(screen.queryByText('⟳')).not.toBeInTheDocument()
        })
    })
})
