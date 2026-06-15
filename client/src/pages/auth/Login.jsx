import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthLayout } from '../../components/molecules'
import { Button, Alert } from '../../components/atoms'
import { useAuth } from '../../context/AuthContext'

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
  </svg>
)

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithGoogle, firebaseEnabled } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
      const to = location.state?.from?.pathname || '/dashboard'
      navigate(to, { replace: true })
    } catch (err) {
      setError(err.message || 'Sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome to WA Automation"
      subtitle="Connect your WhatsApp, build AI workflows, and let your customers get instant answers."
      footer={
        <span className="text-xs text-muted">
          By continuing you agree to our Terms & Privacy Policy.
        </span>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <Button
          size="lg"
          fullWidth
          variant="secondary"
          loading={loading}
          leftIcon={<GoogleIcon />}
          onClick={onSignIn}
        >
          Continue with Google
        </Button>

        {!firebaseEnabled && (
          <Alert tone="info">
            Dev mode: Firebase isn&apos;t configured, so this signs you in as a
            local dev user. Set the <code>VITE_FIREBASE_*</code> env vars to
            enable real Google sign-in.
          </Alert>
        )}
      </div>
    </AuthLayout>
  )
}
