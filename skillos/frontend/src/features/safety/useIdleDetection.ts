import { useState, useEffect } from 'react'

export function useIdleDetection(timeoutMinutes = 2) {
    const [isIdle, setIsIdle] = useState(false)

    useEffect(() => {
        let timeoutId: NodeJS.Timeout

        const handleActivity = () => {
            if (isIdle) setIsIdle(false)

            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => {
                setIsIdle(true)
            }, timeoutMinutes * 60 * 1000)
        }

        // Listen for user activity
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
        events.forEach(event => document.addEventListener(event, handleActivity))

        // Initial timer
        timeoutId = setTimeout(() => {
            setIsIdle(true)
        }, timeoutMinutes * 60 * 1000)

        return () => {
            events.forEach(event => document.removeEventListener(event, handleActivity))
            clearTimeout(timeoutId)
        }
    }, [timeoutMinutes, isIdle])

    return isIdle
}
