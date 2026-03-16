import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh', width: '100%' }}>
                <div className="glass-panel p-6">
                    <div className="animate-glow flex-center" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
                </div>
                <style>{`
           @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
         `}</style>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return children
}
