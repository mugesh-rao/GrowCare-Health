import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '../components/atoms'
import { useAuth } from '../context/AuthContext'

/**
 * Guards authenticated routes.
 *  - not signed in            → /login
 *  - signed in, not onboarded → /onboarding
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, onboardingCompleted, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    )
  }
  if (!isAuthenticated)
    return <Navigate to="/login" replace state={{ from: location }} />
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />

  return children
}
