import { Navigate } from 'react-router-dom'
import { Spinner } from '../components/atoms'
import { useAuth } from '../context/AuthContext'

/** Requires auth; sends already-onboarded users to the dashboard. */
export default function OnboardingRoute({ children }) {
  const { isAuthenticated, onboardingCompleted, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (onboardingCompleted) return <Navigate to="/dashboard" replace />

  return children
}
