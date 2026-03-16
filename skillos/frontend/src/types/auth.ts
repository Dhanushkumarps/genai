import type { Session, User } from '@supabase/supabase-js'

export interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
    error: Error | null
}

export interface AuthContextType extends AuthState {
    signInWithOTP: (phone: string) => Promise<{ error: Error | null }>
    verifyOTP: (phone: string, token: string) => Promise<{ error: Error | null; session: Session | null }>
    signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>
    signUpWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<{ error: Error | null }>
    clearError: () => void
}

export const AUTH_ERRORS = {
    INVALID_PHONE: 'Please enter a valid phone number',
    INVALID_OTP: 'Invalid verification code',
    RATE_LIMIT: 'Too many attempts. Please try again later',
    NETWORK_ERROR: 'Network error. Please check your connection',
}
