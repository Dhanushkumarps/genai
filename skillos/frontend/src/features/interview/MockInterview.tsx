import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Mic, MicOff, SkipForward, Square, Play, Volume2,
    Clock, Loader2, MessageSquare, ChevronRight, ChevronDown,
    Sparkles, Send, ArrowRight, Download, Camera, CameraOff, Video
} from 'lucide-react'
import { openai } from '@/lib/openai'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import jsPDF from 'jspdf'

// ── Voice mapping per persona ──────────────────────────────────────────
const VOICE_MAP: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
    'Friendly & Encouraging': 'nova',
    'Strict & Challenging': 'onyx',
    'Fast-Paced Startup': 'alloy',
    'Corporate FAANG Style': 'echo',
}

const SPEED_MAP: Record<string, number> = {
    'Friendly & Encouraging': 1.0,
    'Strict & Challenging': 1.0,
    'Fast-Paced Startup': 1.2,
    'Corporate FAANG Style': 1.0,
}

// ── Constants ──────────────────────────────────────────────────────────
const INTERVIEW_TYPES = ['Technical', 'Behavioural', 'System Design', 'HR', 'Mixed'] as const
const EXPERIENCE_LEVELS = ['Fresher', 'Junior', 'Mid', 'Senior', 'Staff'] as const
const DURATIONS = [15, 30, 45, 60] as const
const PERSONAS = [
    'Friendly & Encouraging',
    'Strict & Challenging',
    'Fast-Paced Startup',
    'Corporate FAANG Style',
] as const
const ROLES = [
    'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'DevOps Engineer', 'Data Scientist', 'ML Engineer',
    'Mobile Developer', 'Cloud Architect', 'Cybersecurity Analyst',
    'Product Manager', 'QA Engineer', 'UI/UX Designer',
    'Blockchain Developer', 'Game Developer', 'Embedded Systems Engineer',
] as const

type InterviewType = typeof INTERVIEW_TYPES[number]
type ExperienceLevel = typeof EXPERIENCE_LEVELS[number]
type Persona = typeof PERSONAS[number]

interface SessionConfig {
    type: InterviewType
    role: string
    experience: ExperienceLevel
    duration: number
    persona: Persona
}

interface TranscriptEntry {
    role: 'ai' | 'user'
    text: string
    timestamp: number
}

type UIState = 'setup' | 'interview' | 'ended'
type InterviewStatus = 'ai_speaking' | 'your_turn' | 'processing'

interface QEval {
    question: string
    userAnswer: string
    rating: 'Excellent' | 'Good' | 'Average' | 'Needs Work'
    idealAnswer: string
    feedback: string
}

interface Evaluation {
    overallScore: number
    communicationScore: number
    technicalScore: number
    confidenceScore: number
    problemSolvingScore: number
    clarityScore: number
    nonVerbalScore: number
    strengthAreas: string[]
    improvementAreas: string[]
    bodyLanguageFeedback: string[]
    questionByQuestion: QEval[]
    hiringRecommendation: 'Strong Hire' | 'Hire' | 'No Hire' | 'Need More Info'
    nextSteps: string[]
}

// ── Main Component ─────────────────────────────────────────────────────
export default function MockInterview() {
    const { user } = useAuth()
    const [uiState, setUiState] = useState<UIState>('setup')
    const [config, setConfig] = useState<SessionConfig>({
        type: 'Technical',
        role: 'Frontend Developer',
        experience: 'Fresher',
        duration: 30,
        persona: 'Friendly & Encouraging',
    })

    const [questions, setQuestions] = useState<string[]>([])
    const [currentQIndex, setCurrentQIndex] = useState(0)
    const [status, setStatus] = useState<InterviewStatus>('processing')
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
    const [sessionStart, setSessionStart] = useState(0)
    const [timeLeft, setTimeLeft] = useState(0)
    const [userAnswer, setUserAnswer] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isAISpeaking, setIsAISpeaking] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [cameraEnabled, setCameraEnabled] = useState(false)
    const [ttsEnabled, setTtsEnabled] = useState(true)
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [expandedQ, setExpandedQ] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [visionFrames, setVisionFrames] = useState<string[]>([])

    const transcriptEndRef = useRef<HTMLDivElement>(null)
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)
    const audioCtxRef = useRef<AudioContext | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const frameIntervalRef = useRef<number | null>(null)
    const chunksRef = useRef<Blob[]>([])

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [transcript])

    // Countdown timer
    useEffect(() => {
        if (uiState !== 'interview') return
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - sessionStart) / 1000)
            const remaining = config.duration * 60 - elapsed
            if (remaining <= 0) {
                setTimeLeft(0)
                endInterview()
            } else {
                setTimeLeft(remaining)
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [uiState, sessionStart, config.duration])

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
        const sec = s % 60
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    }

    // ── Camera & Vision Capture ─────────────────────────────────────────
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            streamRef.current = stream
            setCameraEnabled(true)
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
            }
            // Auto capture a frame every 15 seconds for behavioral analysis
            frameIntervalRef.current = window.setInterval(captureFrame, 15000)
            return true
        } catch (err) {
            console.error('Camera access denied:', err)
            setError('Camera and microphone access is required for this interview style.')
            return false
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current)
            frameIntervalRef.current = null
        }
        setCameraEnabled(false)
    }

    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current || !streamRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx && canvas.width > 0 && canvas.height > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const base64Image = canvas.toDataURL('image/jpeg', 0.5) // compress quality
            setVisionFrames(prev => [...prev, base64Image])
        }
    }

    // Cleanup camera on unmount
    useEffect(() => {
        return () => stopCamera()
    }, [])

    // ── Speak Text (TTS) ────────────────────────────────────────────────
    const speakText = async (text: string): Promise<void> => {
        if (!ttsEnabled) return

        try {
            // Stop any currently playing audio
            if (audioSourceRef.current) {
                try { audioSourceRef.current.stop() } catch { /* already stopped */ }
            }

            setIsAISpeaking(true)
            setStatus('ai_speaking')

            const voice = VOICE_MAP[config.persona] || 'alloy'
            const speed = SPEED_MAP[config.persona] || 1.0

            const response = await openai.audio.speech.create({
                model: 'tts-1',
                voice,
                input: text.slice(0, 4096), // TTS limit
                speed,
            })

            const arrayBuffer = await response.arrayBuffer()

            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                audioCtxRef.current = new AudioContext()
            }
            const audioContext = audioCtxRef.current

            // Resume if suspended (browser autoplay policy)
            if (audioContext.state === 'suspended') {
                await audioContext.resume()
            }

            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
            const source = audioContext.createBufferSource()
            source.buffer = audioBuffer
            source.connect(audioContext.destination)
            audioSourceRef.current = source

            source.onended = () => {
                setIsAISpeaking(false)
                setStatus('your_turn')
                audioSourceRef.current = null
            }

            source.start()
        } catch {
            // TTS failed — silently fall back to text-only
            setIsAISpeaking(false)
            setStatus('your_turn')
        }
    }

    // ── Stop Speaking ───────────────────────────────────────────────────
    const stopSpeaking = () => {
        if (audioSourceRef.current) {
            try { audioSourceRef.current.stop() } catch { /* noop */ }
            audioSourceRef.current = null
        }
        setIsAISpeaking(false)
    }

    // ── Generate Next Question (context-aware) ─────────────────────────
    const generateNextQuestion = async (): Promise<string> => {
        const recentTranscript = transcript.slice(-10).map(t =>
            `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text}`
        ).join('\n')

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 512,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a ${config.persona} interviewer conducting a ${config.type} interview for a ${config.experience}-level ${config.role}. Generate a single follow-up interview question based on the conversation so far. Return JSON: { "question": "...", "questionType": "technical"|"behavioural"|"followup", "expectedTopics": ["..."] }`,
                },
                {
                    role: 'user',
                    content: `Conversation so far:\n${recentTranscript}\n\nGenerate the next question.`,
                },
            ],
        })

        const raw = completion.choices[0]?.message?.content ?? ''
        const cleaned = raw.replace(/```json\n?|```/g, '').trim()
        const result = JSON.parse(cleaned)
        const nextQ = result.question || 'Tell me more about your experience.'

        // Add to questions list
        setQuestions(prev => [...prev, nextQ])

        return nextQ
    }

    // ── Generate Questions ──────────────────────────────────────────────
    const generateQuestions = async (): Promise<string[]> => {
        const questionsCount = Math.max(3, Math.floor(config.duration / 5))

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 4096,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are an expert ${config.persona} interviewer conducting a ${config.type} interview for a ${config.experience}-level ${config.role}. Generate interview questions appropriate for this level. Always respond with valid JSON only.`,
                },
                {
                    role: 'user',
                    content: `Generate ${questionsCount} interview questions.

Interview type: ${config.type}
Role: ${config.role}
Experience: ${config.experience}
Style: ${config.persona}

Return JSON:
{
  "questions": [
    "Question 1 text...",
    "Question 2 text...",
    ...
  ]
}

For Technical: DSA, system design, language-specific, debugging scenarios.
For Behavioural: STAR method situations, leadership, teamwork.
For System Design: Architecture, scalability, trade-offs.
For HR: Motivation, salary expectations, culture fit.
For Mixed: Combination of all types.

Make questions progressively harder. Be specific, not generic.`,
                },
            ],
        })

        const raw = completion.choices[0]?.message?.content ?? ''
        const cleaned = raw.replace(/```json\n?|```/g, '').trim()
        const result = JSON.parse(cleaned)
        return result.questions || []
    }

    // ── Generate Follow-up ──────────────────────────────────────────────
    const generateFollowUp = async (question: string, answer: string): Promise<string> => {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.6,
            max_tokens: 512,
            messages: [
                {
                    role: 'system',
                    content: `You are a ${config.persona} interviewer. Acknowledge the candidate's answer briefly (1-2 sentences), then either ask a follow-up probe or transition to the next question naturally. Keep it concise and conversational.`,
                },
                {
                    role: 'user',
                    content: `Question asked: "${question}"\nCandidate's answer: "${answer}"\n\nRespond as the interviewer acknowledging their answer.`,
                },
            ],
        })
        return completion.choices[0]?.message?.content ?? "Interesting. Let's move on."
    }

    // ── Start Interview ─────────────────────────────────────────────────
    const startInterview = async () => {
        setIsLoading(true)
        setError(null)
        try {
            // Priority: Get camera access first
            const cameraReady = await startCamera()
            if (!cameraReady) {
                setIsLoading(false)
                return
            }

            const qs = await generateQuestions()
            setQuestions(qs)
            setCurrentQIndex(0)
            setSessionStart(Date.now())
            setTimeLeft(config.duration * 60)
            setTranscript([])
            setVisionFrames([])
            setUiState('interview')

            // Ask first question
            const greeting = getGreeting()
            const firstQ = qs[0] || 'Tell me about yourself.'
            const fullIntro = `${greeting}\n\n${firstQ}`

            setTranscript([{ role: 'ai', text: fullIntro, timestamp: Date.now() }])

            // Speak the greeting + first question
            await speakText(fullIntro)
            // If TTS was disabled or failed, still set status
            if (!ttsEnabled) setStatus('your_turn')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start interview')
        } finally {
            setIsLoading(false)
        }
    }

    const getGreeting = () => {
        const greetings: Record<Persona, string> = {
            'Friendly & Encouraging': `Hey! Welcome to your mock interview. I'm excited to chat with you about the ${config.role} role. Don't worry, we'll keep this conversational. Let's start!`,
            'Strict & Challenging': `Good day. We'll be conducting a structured ${config.type.toLowerCase()} interview for the ${config.role} position. I'll expect precise, well-structured answers. Let's begin.`,
            'Fast-Paced Startup': `Hey! Let's jump right in — we move fast here. I want to see how you think on your feet. Ready? Let's go!`,
            'Corporate FAANG Style': `Welcome to your interview loop. This session will focus on ${config.type.toLowerCase()} assessment for ${config.role}. Please think through your answers carefully before responding.`,
        }
        return greetings[config.persona]
    }

    // ── Submit Answer ───────────────────────────────────────────────────
    const submitAnswer = async () => {
        if (!userAnswer.trim() || status !== 'your_turn') return
        const answer = userAnswer.trim()
        setUserAnswer('')

        setTranscript(prev => [...prev, { role: 'user', text: answer, timestamp: Date.now() }])
        setStatus('processing')

        try {
            // Get AI response
            const currentQ = questions[currentQIndex] || ''
            const followUp = await generateFollowUp(currentQ, answer)

            const nextIdx = currentQIndex + 1
            if (nextIdx < questions.length) {
                const nextQ = questions[nextIdx]
                const aiText = `${followUp}\n\nNext question:\n${nextQ}`
                setTranscript(prev => [...prev, { role: 'ai', text: aiText, timestamp: Date.now() }])
                setCurrentQIndex(nextIdx)
                await speakText(aiText)
                if (!ttsEnabled) setStatus('your_turn')
            } else {
                // Try generating a dynamic follow-up question
                try {
                    const dynamicQ = await generateNextQuestion()
                    const aiText = `${followUp}\n\nNext question:\n${dynamicQ}`
                    setTranscript(prev => [...prev, { role: 'ai', text: aiText, timestamp: Date.now() }])
                    setCurrentQIndex(questions.length - 1)
                    await speakText(aiText)
                    if (!ttsEnabled) setStatus('your_turn')
                } catch {
                    const endText = `${followUp}\n\nThat concludes our interview. Thank you for your time! I'll provide you with feedback shortly.`
                    setTranscript(prev => [...prev, { role: 'ai', text: endText, timestamp: Date.now() }])
                    await speakText(endText)
                    setTimeout(() => endInterview(), 2000)
                }
            }
        } catch {
            const fallbackText = "Let's move on to the next question."
            setTranscript(prev => [...prev, { role: 'ai', text: fallbackText, timestamp: Date.now() }])
            const nextIdx = currentQIndex + 1
            if (nextIdx < questions.length) {
                setCurrentQIndex(nextIdx)
                setStatus('your_turn')
            } else {
                endInterview()
            }
        }
    }

    // ── Skip Question ───────────────────────────────────────────────────
    const skipQuestion = async () => {
        stopSpeaking()
        const nextIdx = currentQIndex + 1
        if (nextIdx < questions.length) {
            const skipText = `No problem. Let's try this one:\n\n${questions[nextIdx]}`
            setTranscript(prev => [...prev,
            { role: 'user', text: '(Skipped)', timestamp: Date.now() },
            { role: 'ai', text: skipText, timestamp: Date.now() },
            ])
            setCurrentQIndex(nextIdx)
            await speakText(skipText)
            if (!ttsEnabled) setStatus('your_turn')
        } else {
            endInterview()
        }
    }

    // ── Start Recording (Whisper STT) ────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
            chunksRef.current = []
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
            mediaRecorder.start()
            mediaRecorderRef.current = mediaRecorder
            setIsRecording(true)
        } catch {
            setError('Microphone access denied')
        }
    }

    // ── Stop Recording → Whisper → Submit ───────────────────────────────
    const stopRecording = () => {
        const recorder = mediaRecorderRef.current
        if (!recorder || recorder.state === 'inactive') return
        setIsRecording(false)

        recorder.onstop = async () => {
            recorder.stream.getTracks().forEach(t => t.stop())
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
            const audioFile = new File([audioBlob], 'answer.webm', { type: 'audio/webm' })

            setStatus('processing')
            try {
                const transcription = await openai.audio.transcriptions.create({
                    file: audioFile,
                    model: 'whisper-1',
                    language: 'en',
                })
                const answer = transcription.text
                if (answer.trim()) {
                    setTranscript(prev => [...prev, { role: 'user', text: answer, timestamp: Date.now() }])
                    // Process like submitAnswer
                    const currentQ = questions[currentQIndex] || ''
                    const followUp = await generateFollowUp(currentQ, answer)
                    const nextIdx = currentQIndex + 1
                    if (nextIdx < questions.length) {
                        const aiText = `${followUp}\n\nNext question:\n${questions[nextIdx]}`
                        setTranscript(prev => [...prev, { role: 'ai', text: aiText, timestamp: Date.now() }])
                        setCurrentQIndex(nextIdx)
                        await speakText(aiText)
                        if (!ttsEnabled) setStatus('your_turn')
                    } else {
                        try {
                            const dynamicQ = await generateNextQuestion()
                            const aiText = `${followUp}\n\nNext question:\n${dynamicQ}`
                            setTranscript(prev => [...prev, { role: 'ai', text: aiText, timestamp: Date.now() }])
                            setCurrentQIndex(questions.length - 1)
                            await speakText(aiText)
                            if (!ttsEnabled) setStatus('your_turn')
                        } catch {
                            const endText = `${followUp}\n\nThat concludes our interview. Thank you!`
                            setTranscript(prev => [...prev, { role: 'ai', text: endText, timestamp: Date.now() }])
                            await speakText(endText)
                            setTimeout(() => endInterview(), 2000)
                        }
                    }
                } else {
                    setStatus('your_turn')
                }
            } catch {
                setError('Voice transcription failed')
                setStatus('your_turn')
            }
        }
        recorder.stop()
    }

    // ── Generate Evaluation ──────────────────────────────────────────────
    const generateEvaluation = async (): Promise<Evaluation | null> => {
        const fullTranscript = transcript.map(t =>
            `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text}`
        ).join('\n\n')

        // Sample up to 4 frames to save tokens
        const sampledFrames: string[] = []
        if (visionFrames.length > 0) {
            const step = Math.max(1, Math.floor(visionFrames.length / 4))
            for (let i = 0; i < visionFrames.length; i += step) {
                if (sampledFrames.length < 4) sampledFrames.push(visionFrames[i])
            }
        }

        try {
            const messages: any[] = [
                {
                    role: 'system',
                    content: 'You are an expert interview evaluator. Analyze the interview transcript and the provided video frames of the candidate to assess non-verbal communication and engagement. Respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Evaluate this ${config.type} interview for ${config.role} (${config.experience} level).\n\nTranscript:\n${fullTranscript}\n\nReturn JSON:\n{\n  "overallScore": 0-100,\n  "communicationScore": 0-100,\n  "technicalScore": 0-100,\n  "confidenceScore": 0-100,\n  "problemSolvingScore": 0-100,\n  "clarityScore": 0-100,\n  "nonVerbalScore": 0-100,\n  "strengthAreas": ["..."],\n  "improvementAreas": ["..."],\n  "bodyLanguageFeedback": ["..."],\n  "questionByQuestion": [{"question":"...","userAnswer":"...","rating":"Excellent|Good|Average|Needs Work","idealAnswer":"...","feedback":"..."}],\n  "hiringRecommendation": "Strong Hire|Hire|No Hire|Need More Info",\n  "nextSteps": ["..."]}`
                        },
                        ...sampledFrames.map(frame => ({
                            type: 'image_url',
                            image_url: { url: frame, detail: 'low' }
                        }))
                    ]
                }
            ]

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o', // Vision-capable model required
                temperature: 0.3,
                max_tokens: 4096,
                response_format: { type: 'json_object' },
                messages,
            })
            const raw = completion.choices[0]?.message?.content ?? ''
            return JSON.parse(raw.replace(/```json\n?|```/g, '').trim())
        } catch (err) { 
            console.error('Eval error:', err)
            return null 
        }
    }

    // ── Save to Supabase ─────────────────────────────────────────────────
    const saveSession = async (eval_data: Evaluation | null) => {
        if (!user) return
        try {
            await supabase.from('interview_sessions').insert({
                user_id: user.id,
                session_config: config as any,
                transcript: transcript as any,
                evaluation: (eval_data || {}) as any,
            })
        } catch { /* silent */ }
    }

    // ── Export PDF Report ────────────────────────────────────────────────
    const exportReportPdf = () => {
        if (!evaluation) return
        const pdf = new jsPDF()
        let y = 20
        const lm = 15
        const pw = 180

        pdf.setFontSize(20)
        pdf.setTextColor(48, 232, 189)
        pdf.text('Interview Report — SkillOS', lm, y); y += 12
        pdf.setFontSize(11)
        pdf.setTextColor(150)
        pdf.text(`${config.type} | ${config.role} | ${config.experience}`, lm, y); y += 6
        pdf.text(`Date: ${new Date().toLocaleDateString()}`, lm, y); y += 10

        pdf.setFontSize(14)
        pdf.setTextColor(30)
        pdf.text(`Overall Score: ${evaluation.overallScore}/100`, lm, y); y += 8
        pdf.text(`Recommendation: ${evaluation.hiringRecommendation}`, lm, y); y += 12

        pdf.setFontSize(12)
        pdf.text('Scores', lm, y); y += 7
        pdf.setFontSize(10)
        const scores = [
            ['Communication', evaluation.communicationScore],
            ['Technical', evaluation.technicalScore],
            ['Confidence', evaluation.confidenceScore],
            ['Problem Solving', evaluation.problemSolvingScore],
            ['Clarity', evaluation.clarityScore],
            ['Non-Verbal', evaluation.nonVerbalScore || 0],
        ] as const
        scores.forEach(([label, val]) => { pdf.text(`${label}: ${val}/100`, lm, y); y += 6 })
        y += 4

        pdf.setFontSize(12)
        pdf.text('Strengths', lm, y); y += 7
        pdf.setFontSize(10)
        evaluation.strengthAreas.forEach(s => {
            const lines = pdf.splitTextToSize(`• ${s}`, pw)
            if (y + lines.length * 5 > 280) { pdf.addPage(); y = 20 }
            pdf.text(lines, lm, y); y += lines.length * 5 + 2
        })
        y += 4

        pdf.setFontSize(12)
        pdf.text('Improvements', lm, y); y += 7
        pdf.setFontSize(10)
        evaluation.improvementAreas.forEach(s => {
            const lines = pdf.splitTextToSize(`• ${s}`, pw)
            if (y + lines.length * 5 > 280) { pdf.addPage(); y = 20 }
            pdf.text(lines, lm, y); y += lines.length * 5 + 2
        })
        y += 4

        if (evaluation.bodyLanguageFeedback && evaluation.bodyLanguageFeedback.length > 0) {
            if (y > 270) { pdf.addPage(); y = 20 }
            pdf.setFontSize(12)
            pdf.text('Body Language', lm, y); y += 7
            pdf.setFontSize(10)
            evaluation.bodyLanguageFeedback.forEach(s => {
                const lines = pdf.splitTextToSize(`• ${s}`, pw)
                if (y + lines.length * 5 > 280) { pdf.addPage(); y = 20 }
                pdf.text(lines, lm, y); y += lines.length * 5 + 2
            })
            y += 4
        }

        pdf.addPage(); y = 20
        pdf.setFontSize(12)
        pdf.text('Question-by-Question', lm, y); y += 8
        evaluation.questionByQuestion.forEach((q, i) => {
            if (y > 260) { pdf.addPage(); y = 20 }
            pdf.setFontSize(10)
            pdf.setTextColor(30)
            const qLines = pdf.splitTextToSize(`Q${i + 1}: ${q.question}`, pw)
            pdf.text(qLines, lm, y); y += qLines.length * 5 + 2
            pdf.setTextColor(100)
            pdf.text(`Rating: ${q.rating}`, lm, y); y += 5
            const fLines = pdf.splitTextToSize(q.feedback, pw)
            pdf.text(fLines, lm, y); y += fLines.length * 5 + 6
        })

        pdf.save('interview-report-skillos.pdf')
    }

    // ── End Interview ───────────────────────────────────────────────────
    const endInterview = async () => {
        stopSpeaking()
        stopCamera()
        if (isRecording) stopRecording()
        setUiState('ended')
        setStatus('your_turn')
        setIsEvaluating(true)
        const evalResult = await generateEvaluation()
        setEvaluation(evalResult)
        setIsEvaluating(false)
        await saveSession(evalResult)
    }

    const resetInterview = () => {
        stopSpeaking()
        stopCamera()
        setUiState('setup')
        setQuestions([])
        setCurrentQIndex(0)
        setTranscript([])
        setVisionFrames([])
        setStatus('processing')
        setError(null)
        setEvaluation(null)
        setExpandedQ(null)
    }

    // ── SETUP SCREEN ────────────────────────────────────────────────────
    if (uiState === 'setup') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#30e8bd]/10 flex items-center justify-center">
                        <MessageSquare className="w-7 h-7 text-[#30e8bd]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#E8E6E3]">Mock Interview Simulator</h1>
                    <p className="text-[#6B6966] text-sm mt-1">AI-powered interview practice with real-time feedback</p>
                </div>

                <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 space-y-5">
                    {/* Interview Type */}
                    <div>
                        <label className="text-sm font-medium text-[#9A9996] mb-2 block">Interview Type</label>
                        <div className="flex gap-2 flex-wrap">
                            {INTERVIEW_TYPES.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setConfig(c => ({ ...c, type: t }))}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                                        ${config.type === t
                                            ? 'bg-[#30e8bd] text-black shadow-[0_0_15px_rgba(48,232,189,0.2)]'
                                            : 'border border-[#30e8bd]/30 text-[#30e8bd] bg-transparent hover:bg-[#30e8bd]/5'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="text-sm font-medium text-[#9A9996] mb-1.5 block">Target Role</label>
                        <select
                            value={config.role}
                            onChange={e => setConfig(c => ({ ...c, role: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-[#22262A] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#E8E6E3] text-sm focus:outline-none focus:border-[#30e8bd] transition"
                        >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    {/* Experience */}
                    <div>
                        <label className="text-sm font-medium text-[#9A9996] mb-2 block">Experience Level</label>
                        <div className="flex gap-2">
                            {EXPERIENCE_LEVELS.map(e => (
                                <button
                                    key={e}
                                    onClick={() => setConfig(c => ({ ...c, experience: e }))}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                                        ${config.experience === e
                                            ? 'bg-[#30e8bd] text-black'
                                            : 'border border-[#30e8bd]/30 text-[#30e8bd] bg-transparent'
                                        }`}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="text-sm font-medium text-[#9A9996] mb-2 block">Duration</label>
                        <div className="flex gap-2">
                            {DURATIONS.map(d => (
                                <button
                                    key={d}
                                    onClick={() => setConfig(c => ({ ...c, duration: d }))}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                                        ${config.duration === d
                                            ? 'bg-[#30e8bd] text-black'
                                            : 'border border-[#30e8bd]/30 text-[#30e8bd] bg-transparent'
                                        }`}
                                >
                                    {d} min
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Persona */}
                    <div>
                        <label className="text-sm font-medium text-[#9A9996] mb-2 block">AI Interviewer Style</label>
                        <div className="grid grid-cols-2 gap-2">
                            {PERSONAS.map(p => (
                                <button
                                    key={p}
                                    onClick={() => setConfig(c => ({ ...c, persona: p }))}
                                    className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all text-left
                                        ${config.persona === p
                                            ? 'bg-[#30e8bd]/15 text-[#30e8bd] border border-[#30e8bd]/40'
                                            : 'bg-[#22262A] text-[#6B6966] border border-transparent hover:border-[rgba(255,255,255,0.08)]'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={startInterview}
                        disabled={isLoading}
                        className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ backgroundColor: '#30e8bd', color: '#000', boxShadow: '0 0 25px rgba(48,232,189,0.3)' }}
                    >
                        {isLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Preparing Interview...</>
                        ) : (
                            <>Begin Interview <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>

                    {error && (
                        <p className="text-sm text-red-400 text-center">{error}</p>
                    )}
                </div>
            </div>
        )
    }

    // ── Radar Chart Helper ────────────────────────────────────────────────
    const radarPoints = (ev: Evaluation) => {
        const scores = [ev.communicationScore, ev.technicalScore, ev.confidenceScore, ev.problemSolvingScore, ev.clarityScore, ev.nonVerbalScore || 0]
        const labels = ['Comm', 'Tech', 'Confidence', 'Problem Solv', 'Clarity', 'Non-Verbal']
        const cx = 100, cy = 100, r = 80
        const pts = scores.map((s, i) => {
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
            const dist = (Math.max(s, 0) / 100) * r
            return {
                x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle), label: labels[i], score: s,
                lx: cx + (r + 18) * Math.cos(angle), ly: cy + (r + 18) * Math.sin(angle)
            }
        })
        return pts
    }

    const ratingColor = (r: string) => r === 'Excellent' ? '#30e8bd' : r === 'Good' ? '#f0b429' : r === 'Average' ? '#9A9996' : '#f04848'

    // ── ENDED SCREEN ────────────────────────────────────────────────────
    if (uiState === 'ended') {
        const totalAnswered = transcript.filter(t => t.role === 'user' && t.text !== '(Skipped)').length
        const skipped = transcript.filter(t => t.role === 'user' && t.text === '(Skipped)').length

        return (
            <div className="max-w-3xl mx-auto space-y-5 py-6">
                <div className="text-center mb-4">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#30e8bd]/10 flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-[#30e8bd]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#E8E6E3]">Interview Complete!</h1>
                    <p className="text-[#6B6966] text-sm mt-1">{config.type} Interview for {config.role}</p>
                </div>

                {isEvaluating && (
                    <div className="flex flex-col items-center py-12 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[#30e8bd]" />
                        <p className="text-sm text-[#6B6966]">Generating your detailed evaluation...</p>
                    </div>
                )}

                {evaluation && (
                    <>
                        {/* Score + Recommendation */}
                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-[#30e8bd]">{evaluation.overallScore}</p>
                                <p className="text-[10px] text-[#6B6966] uppercase">Overall</p>
                            </div>
                            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-center">
                                <p className="text-lg font-bold text-[#E8E6E3]">{totalAnswered}</p>
                                <p className="text-[10px] text-[#6B6966] uppercase">Answered</p>
                            </div>
                            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-center">
                                <p className="text-lg font-bold text-[#f0b429]">{skipped}</p>
                                <p className="text-[10px] text-[#6B6966] uppercase">Skipped</p>
                            </div>
                            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-center">
                                <p className="text-xs font-bold" style={{ color: evaluation.hiringRecommendation === 'Strong Hire' ? '#30e8bd' : evaluation.hiringRecommendation === 'Hire' ? '#f0b429' : '#f04848' }}>
                                    {evaluation.hiringRecommendation}
                                </p>
                                <p className="text-[10px] text-[#6B6966] uppercase mt-1">Verdict</p>
                            </div>
                        </div>

                        {/* Radar Chart */}
                        <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
                            <h3 className="text-xs text-[#6B6966] uppercase tracking-wide mb-3">Competency Radar</h3>
                            <div className="flex justify-center">
                                <svg viewBox="0 0 200 200" width="220" height="220">
                                    {/* Grid rings */}
                                    {[20, 40, 60, 80].map(r => (
                                        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#ffffff08" strokeWidth="0.5" />
                                    ))}
                                    {/* Axes */}
                                    {[0, 1, 2, 3, 4, 5].map(i => {
                                        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
                                        return <line key={i} x1="100" y1="100" x2={100 + 80 * Math.cos(angle)} y2={100 + 80 * Math.sin(angle)} stroke="#ffffff10" strokeWidth="0.5" />
                                    })}
                                    {/* Data polygon */}
                                    <polygon
                                        points={radarPoints(evaluation).map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="#30e8bd15" stroke="#30e8bd" strokeWidth="1.5"
                                    />
                                    {/* Points + labels */}
                                    {radarPoints(evaluation).map((p, i) => (
                                        <g key={i}>
                                            <circle cx={p.x} cy={p.y} r="3" fill="#30e8bd" />
                                            <text x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle" fill="#6B6966" fontSize="7">{p.label}</text>
                                            <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#30e8bd" fontSize="7" fontWeight="bold">{p.score}</text>
                                        </g>
                                    ))}
                                </svg>
                            </div>
                        </div>

                        {/* Strengths + Improvements */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                                <h4 className="text-xs text-[#30e8bd] uppercase tracking-wide mb-2">Strengths</h4>
                                <ul className="space-y-1">{evaluation.strengthAreas.map((s, i) => <li key={i} className="text-xs text-[#9A9996]">✓ {s}</li>)}</ul>
                            </div>
                            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                                <h4 className="text-xs text-[#f04848] uppercase tracking-wide mb-2">Improve</h4>
                                <ul className="space-y-1">{evaluation.improvementAreas.map((s, i) => <li key={i} className="text-xs text-[#9A9996]">→ {s}</li>)}</ul>
                            </div>
                            {evaluation.bodyLanguageFeedback && evaluation.bodyLanguageFeedback.length > 0 && (
                            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 col-span-2 lg:col-span-1">
                                <h4 className="text-xs text-[#8B5CF6] uppercase tracking-wide mb-2">Body Language</h4>
                                <ul className="space-y-1">{evaluation.bodyLanguageFeedback.map((s, i) => <li key={i} className="text-xs text-[#9A9996]">👁 {s}</li>)}</ul>
                            </div>
                            )}
                        </div>

                        {/* Question-by-Question Accordion */}
                        <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
                            <h3 className="text-xs text-[#6B6966] uppercase tracking-wide p-4 pb-2">Question-by-Question</h3>
                            {evaluation.questionByQuestion.map((q, i) => (
                                <div key={i} className="border-t border-[rgba(255,255,255,0.04)]">
                                    <button onClick={() => setExpandedQ(expandedQ === i ? null : i)} className="w-full flex items-center justify-between p-3 hover:bg-[rgba(255,255,255,0.02)] transition">
                                        <div className="flex items-center gap-2 text-left">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${ratingColor(q.rating)}20`, color: ratingColor(q.rating) }}>{q.rating}</span>
                                            <span className="text-xs text-[#E8E6E3] line-clamp-1">{q.question}</span>
                                        </div>
                                        <ChevronDown className={`w-3.5 h-3.5 text-[#6B6966] transition-transform flex-shrink-0 ${expandedQ === i ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {expandedQ === i && (
                                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                <div className="px-4 pb-4 space-y-2 text-xs">
                                                    <div><span className="text-[#6B6966]">Your answer: </span><span className="text-[#9A9996]">{q.userAnswer || '(No answer)'}</span></div>
                                                    <div><span className="text-[#6B6966]">Feedback: </span><span className="text-[#c9c7c3]">{q.feedback}</span></div>
                                                    <div className="bg-[#0a0a0a] border border-[#242424] rounded-lg p-2"><span className="text-[#30e8bd]">Ideal: </span><span className="text-[#6B6966]">{q.idealAnswer}</span></div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>

                        {/* Next Steps */}
                        {evaluation.nextSteps.length > 0 && (
                            <div className="bg-[#1A1D20] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                                <h4 className="text-xs text-[#6B6966] uppercase tracking-wide mb-2">Next Steps</h4>
                                <ul className="space-y-1">{evaluation.nextSteps.map((s, i) => <li key={i} className="text-xs text-[#9A9996]">{i + 1}. {s}</li>)}</ul>
                            </div>
                        )}
                    </>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    {evaluation && (
                        <button onClick={exportReportPdf} className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-[#22262A] text-[#E8E6E3] hover:bg-[#2a2e33] transition">
                            <Download className="w-4 h-4" /> Download Report PDF
                        </button>
                    )}
                    <button
                        onClick={resetInterview}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#30e8bd', color: '#000', boxShadow: '0 0 20px rgba(48,232,189,0.25)' }}
                    >
                        Start New Interview
                    </button>
                </div>
            </div>
        )
    }

    // ── INTERVIEW ROOM ──────────────────────────────────────────────────
    const currentQuestion = questions[currentQIndex] || ''
    const statusConfig: Record<InterviewStatus, { label: string; color: string }> = {
        ai_speaking: { label: 'AI Speaking...', color: '#30e8bd' },
        your_turn: { label: 'Your Turn', color: '#f0b429' },
        processing: { label: 'Processing...', color: '#8B5CF6' },
    }
    const sc = statusConfig[status]
    const timerDanger = timeLeft < 120
    const avatarColor = isAISpeaking ? '#30e8bd' : status === 'your_turn' ? '#e83a30' : '#30e8bd'

    return (
        <div className="fixed inset-0 z-50 bg-[#050510] flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[#080818]">
                <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#30e8bd]/15 text-[#30e8bd]">
                        {config.type}
                    </span>
                    <span className="text-xs text-[#6B6966]">{config.role} · {config.experience}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-[#6B6966]">
                        Q{currentQIndex + 1}/{questions.length}
                    </span>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${timerDanger ? 'bg-red-500/15' : 'bg-[rgba(255,255,255,0.04)]'}`}>
                        <Clock className={`w-3.5 h-3.5 ${timerDanger ? 'text-red-400' : 'text-[#9A9996]'}`} />
                        <span className={`text-sm font-mono font-bold ${timerDanger ? 'text-red-400' : 'text-[#E8E6E3]'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main area */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                {/* Hidden canvas for image capture */}
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Video Background */}
                <video 
                    ref={videoRef} 
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 grayscale-[20%]"
                    muted 
                    playsInline
                />

                {/* Interview panel */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                    {/* AI Avatar with pulse rings */}
                    <div className="relative mb-8">
                        {/* Outer pulse rings */}
                        <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{ border: `2px solid ${avatarColor}20` }}
                            animate={{
                                scale: [1, 1.6, 1.6],
                                opacity: [0.5, 0, 0],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{ border: `2px solid ${avatarColor}30` }}
                            animate={{
                                scale: [1, 1.35, 1.35],
                                opacity: [0.6, 0, 0],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{ border: `1px solid ${avatarColor}40` }}
                            animate={{
                                scale: [1, 1.15, 1.15],
                                opacity: [0.7, 0, 0],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
                        />

                        {/* Core avatar */}
                        <motion.div
                            className="w-20 h-20 rounded-full flex items-center justify-center relative z-10"
                            style={{
                                background: `radial-gradient(circle, ${avatarColor}30, ${avatarColor}10)`,
                                boxShadow: `0 0 40px ${avatarColor}25, 0 0 80px ${avatarColor}10`,
                                border: `2px solid ${avatarColor}50`,
                            }}
                            animate={isAISpeaking ? {
                                scale: [1, 1.08, 1, 1.05, 1],
                                boxShadow: [
                                    `0 0 40px ${avatarColor}25, 0 0 80px ${avatarColor}10`,
                                    `0 0 80px ${avatarColor}50, 0 0 150px ${avatarColor}20`,
                                    `0 0 50px ${avatarColor}30, 0 0 100px ${avatarColor}12`,
                                    `0 0 70px ${avatarColor}45, 0 0 130px ${avatarColor}18`,
                                    `0 0 40px ${avatarColor}25, 0 0 80px ${avatarColor}10`,
                                ],
                            } : {
                                boxShadow: [
                                    `0 0 40px ${avatarColor}25, 0 0 80px ${avatarColor}10`,
                                    `0 0 60px ${avatarColor}40, 0 0 120px ${avatarColor}15`,
                                    `0 0 40px ${avatarColor}25, 0 0 80px ${avatarColor}10`,
                                ],
                            }}
                            transition={{ duration: isAISpeaking ? 0.8 : 3, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            {isAISpeaking
                                ? <Volume2 className="w-8 h-8" style={{ color: avatarColor }} />
                                : <MessageSquare className="w-8 h-8" style={{ color: avatarColor }} />
                            }
                        </motion.div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 mb-6">
                        <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: sc.color }}
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                        />
                        <span className="text-xs font-medium tracking-wide" style={{ color: sc.color }}>
                            {sc.label}
                        </span>
                    </div>

                    {/* Current question */}
                    <div className="max-w-xl text-center px-4">
                        <p className="text-xl text-white font-light leading-relaxed">
                            {currentQuestion}
                        </p>
                    </div>
                </div>

                {/* Transcript panel */}
                <div className="lg:w-[380px] border-t lg:border-t-0 lg:border-l border-[rgba(255,255,255,0.06)] bg-[#0a0a15] flex flex-col">
                    <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                        <span className="text-xs text-[#6B6966] uppercase tracking-wide">Transcript</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {transcript.map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap leading-relaxed
                                    ${t.role === 'ai'
                                        ? 'bg-[#0a2e5c] text-[#c9d7e8] rounded-bl-sm'
                                        : 'bg-[#242424] text-[#E8E6E3] rounded-br-sm'
                                    }`}>
                                    {t.text}
                                </div>
                            </motion.div>
                        ))}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[#080818]">
                <div className="flex items-center gap-3 max-w-3xl mx-auto">
                    {/* Text input */}
                    <div className="flex-1 flex gap-2">
                        <input
                            value={userAnswer}
                            onChange={e => setUserAnswer(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer() } }}
                            placeholder={status === 'your_turn' ? 'Type your answer...' : 'Wait for the question...'}
                            disabled={status !== 'your_turn'}
                            className="flex-1 px-4 py-3 bg-[#12122a] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-[#E8E6E3] placeholder:text-[#4A4845] focus:outline-none focus:border-[#30e8bd]/40 disabled:opacity-40 transition"
                        />
                        <button
                            onClick={submitAnswer}
                            disabled={status !== 'your_turn' || !userAnswer.trim()}
                            className="px-4 py-3 rounded-xl transition-all disabled:opacity-30 flex items-center gap-1.5"
                            style={{
                                backgroundColor: status === 'your_turn' ? '#30e8bd' : '#222',
                                color: status === 'your_turn' ? '#000' : '#666',
                            }}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Mic Record button */}
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={status !== 'your_turn' && !isRecording}
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 border-2 disabled:opacity-30"
                        style={{
                            borderColor: isRecording ? '#f0484860' : '#30e8bd40',
                            backgroundColor: isRecording ? '#f0484820' : '#30e8bd10',
                            color: isRecording ? '#f04848' : '#30e8bd',
                            boxShadow: isRecording ? '0 0 20px rgba(240,72,72,0.3)' : 'none',
                        }}
                        title={isRecording ? 'Stop recording' : 'Start voice answer'}
                    >
                        {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    {/* TTS toggle */}
                    <button
                        onClick={() => setTtsEnabled(!ttsEnabled)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                        style={{
                            backgroundColor: ttsEnabled ? '#30e8bd15' : '#ff5f5715',
                            color: ttsEnabled ? '#30e8bd' : '#ff5f57',
                        }}
                        title={ttsEnabled ? 'Mute TTS' : 'Enable TTS'}
                    >
                        {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    </button>

                    {/* Skip */}
                    <button
                        onClick={skipQuestion}
                        className="px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] text-[#6B6966] text-xs hover:bg-[rgba(255,255,255,0.08)] hover:text-[#9A9996] transition flex items-center gap-1.5 flex-shrink-0"
                    >
                        <SkipForward className="w-3.5 h-3.5" /> Skip
                    </button>

                    {/* End */}
                    <button
                        onClick={endInterview}
                        className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition flex items-center gap-1.5 flex-shrink-0"
                    >
                        <Square className="w-3.5 h-3.5" /> End
                    </button>
                </div>
            </div>
        </div>
    )
}
