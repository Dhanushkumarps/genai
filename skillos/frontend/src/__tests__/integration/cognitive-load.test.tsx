import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { useBurnoutDetection } from '@/features/safety/useBurnoutDetection'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: { cognitive_load: 95, energy_level: 10, session_started_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() } // Critical state
            }),
            gt: vi.fn().mockResolvedValue({ count: 5 }), // High stress dumps
        })),
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: '123' } } }) },
        rpc: vi.fn(),
    },
}))

function TestComponent() {
    const { burnoutState } = useBurnoutDetection()
    return (
        <div>
            <span data-testid="level">{burnoutState.level}</span>
            <span data-testid="score">{burnoutState.score}</span>
        </div>
    )
}

describe('Cognitive Load System', () => {
    it('detects panic state correctly', async () => {
        // We don't need fake timers for the initial check as it runs on mount
        render(<TestComponent />)

        // Wait for the async Supabase call to settle and state to update
        await waitFor(() => {
            expect(screen.getByTestId('level')).toHaveTextContent('panic')
        })
    })
})
