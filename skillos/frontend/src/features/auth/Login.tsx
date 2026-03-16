import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { AUTH_ERRORS } from '@/types/auth'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthBackground } from '@/components/ui/auth-background'

/**
 * Login - Premium Authentication Page
 * 
 * Design principles:
 * - Charcoal/graphite background
 * - Soft off-white text
 * - Muted warm yellow accent for primary actions only
 * - No cyberpunk elements (no neon, no glowing borders)
 * - Clean, calm, professional
 */


export default function Login() {
    const [mode, setMode] = useState<'email-signin' | 'email-signup' | 'phone' | 'otp'>('email-signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [otp, setOtp] = useState('')
    const [countdown, setCountdown] = useState(0)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const {
        signInWithOTP, verifyOTP, signInWithPassword, signUpWithPassword,
        loading, error, clearError, user
    } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (user) navigate('/onboarding')
    }, [user, navigate])

    useEffect(() => {
        let timer: number
        if (countdown > 0) {
            timer = window.setInterval(() => setCountdown(c => c - 1), 1000)
        }
        return () => clearInterval(timer)
    }, [countdown])

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        clearError()
        setValidationError(null)
        setSuccessMessage(null)

        if (!email || !password) {
            setValidationError("Please fill in all fields")
            return
        }

        if (mode === 'email-signup') {
            const { error } = await signUpWithPassword(email, password)
            if (!error) {
                setSuccessMessage("Account created. Check your email to verify.")
            }
        } else {
            await signInWithPassword(email, password)
        }
    }

    const sanitizePhone = (phone: string) => phone.replace(/[\s\-()]/g, '')

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        clearError()
        setValidationError(null)

        const cleanPhone = sanitizePhone(phoneNumber)
        if (!/^\+[1-9]\d{1,14}$/.test(cleanPhone)) {
            setValidationError('Enter a valid phone number (e.g., +1234567890)')
            return
        }

        const { error } = await signInWithOTP(cleanPhone)
        if (!error) {
            setMode('otp')
            setCountdown(60)
        }
    }

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        clearError()
        const cleanPhone = sanitizePhone(phoneNumber)
        await verifyOTP(cleanPhone, otp)
    }

    const switchMode = (newMode: typeof mode) => {
        clearError()
        setValidationError(null)
        setSuccessMessage(null)
        setMode(newMode)
    }

    return (
        <AuthBackground>
            {/* Auth Card - Centered, max-width 400px, premium feel */}
            <Card className="w-full max-w-[400px] bg-[#1A1D20] border-[rgba(255,255,255,0.08)] rounded-xl">
                <CardHeader className="text-center pb-2 pt-8">
                    <h1 className="text-[22px] font-semibold text-[#E8E6E3] tracking-tight">
                        {mode === 'email-signup' ? 'Create Account' : 'Sign In'}
                    </h1>
                    <p className="text-[13px] text-[#6B6966] mt-1">
                        SkillOS Authentication
                    </p>
                </CardHeader>

                <CardContent className="px-6 pb-6 space-y-5">
                    {/* Error Alert */}
                    {(error || validationError) && (
                        <div className="p-3 bg-[rgba(184,84,80,0.08)] border border-[rgba(184,84,80,0.2)] rounded-lg text-[#B85450] text-[13px] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#B85450] rounded-full" />
                            {validationError || (error?.message === 'Rate limit exceeded' ? AUTH_ERRORS.RATE_LIMIT : error?.message)}
                        </div>
                    )}

                    {/* Success Alert */}
                    {successMessage && (
                        <div className="p-3 bg-[rgba(90,154,90,0.08)] border border-[rgba(90,154,90,0.2)] rounded-lg text-[#5A9A5A] text-[13px] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#5A9A5A] rounded-full" />
                            {successMessage}
                        </div>
                    )}

                    {/* Email Auth Forms */}
                    {(mode === 'email-signin' || mode === 'email-signup') && (
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[12px] font-medium text-[#6B6966]">Email</Label>
                                <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[12px] font-medium text-[#6B6966]">Password</Label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* Primary Button - Uses accent yellow */}
                            <Button
                                type="submit"
                                className="w-full h-10 mt-2"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : (mode === 'email-signup' ? 'Create Account' : 'Sign In')}
                            </Button>

                            <div className="text-center space-y-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => switchMode(mode === 'email-signin' ? 'email-signup' : 'email-signin')}
                                    className="text-[13px] text-[#6B6966] hover:text-[#9A9996] transition-colors"
                                >
                                    {mode === 'email-signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                                </button>
                                <div className="border-t border-[rgba(255,255,255,0.04)] pt-3">
                                    <button
                                        type="button"
                                        onClick={() => switchMode('phone')}
                                        className="text-[12px] text-[#4A4845] hover:text-[#6B6966] transition-colors"
                                    >
                                        Sign in with phone instead
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Phone Auth Forms */}
                    {(mode === 'phone' || mode === 'otp') && (
                        <>
                            {mode === 'phone' ? (
                                <form onSubmit={handleSendOTP} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[12px] font-medium text-[#6B6966]">Phone Number</Label>
                                        <Input
                                            placeholder="+1234567890"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-10" disabled={loading}>
                                        {loading ? 'Sending...' : 'Send Code'}
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOTP} className="space-y-4">
                                    <div className="space-y-2 text-center">
                                        <Label className="text-[12px] font-medium text-[#6B6966]">Enter Verification Code</Label>
                                        <Input
                                            className="text-center text-[24px] tracking-[0.3em] h-14 font-mono"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            disabled={loading}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-10" disabled={loading}>
                                        {loading ? 'Verifying...' : 'Verify'}
                                    </Button>
                                    <div className="flex justify-between text-[12px] text-[#4A4845]">
                                        <button type="button" onClick={() => switchMode('phone')} className="hover:text-[#6B6966] transition-colors">
                                            ← Change number
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSendOTP({ preventDefault: () => { } } as any)}
                                            disabled={countdown > 0}
                                            className={countdown > 0 ? 'opacity-50' : 'hover:text-[#6B6966] transition-colors'}
                                        >
                                            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                                        </button>
                                    </div>
                                </form>
                            )}
                            <div className="text-center border-t border-[rgba(255,255,255,0.04)] pt-4">
                                <button
                                    type="button"
                                    onClick={() => switchMode('email-signin')}
                                    className="text-[12px] text-[#4A4845] hover:text-[#6B6966] transition-colors"
                                >
                                    Sign in with email instead
                                </button>
                            </div>
                        </>
                    )}
                </CardContent>

                <CardFooter className="justify-center pb-6 pt-0">
                    <p className="text-[10px] text-[#4A4845]">Secure • Encrypted • Private</p>
                </CardFooter>
            </Card>
        </AuthBackground>
    )
}
