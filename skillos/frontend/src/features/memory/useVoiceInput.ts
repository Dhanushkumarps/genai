import { useState, useEffect, useRef, useCallback } from 'react'

declare global {
    interface Window {
        SpeechRecognition: any
        webkitSpeechRecognition: any
    }
}

export function useVoiceInput() {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isSupported, setIsSupported] = useState(false)

    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            setIsSupported(true)
        }
    }, [])

    const startListening = useCallback(() => {
        if (!isSupported) {
            setError('Speech recognition not supported')
            return
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            const recognition = new SpeechRecognition()
            recognitionRef.current = recognition

            recognition.continuous = true
            recognition.interimResults = true
            recognition.lang = 'en-US'

            recognition.onstart = () => setIsListening(true)

            recognition.onresult = (event: any) => {
                let interimTranscript = ''
                let finalTranscript = ''

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript
                    } else {
                        interimTranscript += event.results[i][0].transcript
                    }
                }

                if (finalTranscript) {
                    setTranscript(prev => {
                        const newText = prev + (prev.endsWith(' ') ? '' : ' ') + finalTranscript
                        return newText.trim()
                    })
                }
            }

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error)
                setError(event.error)
                setIsListening(false)
            }

            recognition.onend = () => {
                setIsListening(false)
            }

            recognition.start()
        } catch (err) {
            console.error('Failed to start recognition:', err)
            setError('Failed to start recording')
        }
    }, [isSupported])

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            setIsListening(false)
        }
    }, [])

    const resetTranscript = useCallback(() => {
        setTranscript('')
    }, [])

    return {
        isListening,
        transcript,
        error,
        isSupported,
        startListening,
        stopListening,
        resetTranscript
    }
}
