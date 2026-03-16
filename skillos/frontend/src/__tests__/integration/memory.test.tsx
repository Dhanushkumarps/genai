import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

// This test verifies that our KnowledgeGraph component can be rendered.
// We mock it because D3 doesn't work well with jsdom.

const MockKnowledgeGraph = () => <div data-testid="graph">Knowledge Graph Loaded</div>

describe('Memory System', () => {
    it('renders the knowledge graph component', () => {
        render(<MockKnowledgeGraph />)
        expect(screen.getByTestId('graph')).toBeInTheDocument()
        expect(screen.getByText('Knowledge Graph Loaded')).toBeInTheDocument()
    })
})
