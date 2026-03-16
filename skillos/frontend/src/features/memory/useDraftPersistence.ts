import { useState, useEffect } from 'react'

export function useDraftPersistence(key: string, value: string) {
    const [lastSaved, setLastSaved] = useState<Date | null>(null)

    // Load initial
    useEffect(() => {
        const saved = localStorage.getItem(key)
        if (saved && !value) {
            // This hook assumes 'value' is controlled by parent. 
            // We usually return the initial value here, but hooks can't conditional return.
            // So we'll expose a 'loadDraft' function or just rely on parent checking localStorage on mount.
        }
    }, [])

    // Auto-save debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            if (value) {
                localStorage.setItem(key, value)
                setLastSaved(new Date())
            }
        }, 3000) // 3s debounce

        return () => clearTimeout(handler)
    }, [key, value])

    const clearDraft = () => {
        localStorage.removeItem(key)
        setLastSaved(null)
    }

    return { lastSaved, clearDraft }
}

export function getDraft(key: string): string {
    return localStorage.getItem(key) || ''
}
