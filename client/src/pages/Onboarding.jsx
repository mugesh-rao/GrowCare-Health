import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo, Button, Label, Alert } from '../components/atoms'
import { FormField } from '../components/molecules'
import { useAuth } from '../context/AuthContext'
import userService from '../services/userService'

const businessTypes = [
  'Freelancer',
  'Agency',
  'Ecommerce',
  'Real Estate',
  'Clinic / Healthcare',
  'Education',
  'Other',
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    businessType: '',
    goal: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.businessType) {
      setError('Please tell us your name and business type.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await userService.completeOnboarding(form)
      await refreshProfile()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex max-w-xl flex-col px-6 py-10">
        <Logo />
        <div className="mt-10">
          <p className="eyebrow">Step 1 of 1</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">
            Tell us about you
          </h1>
          <p className="mt-2 text-muted">
            We&apos;ll use this to personalize your workspace and suggest flow
            templates.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card mt-8 p-6 space-y-5" noValidate>
          {error && <Alert tone="error">{error}</Alert>}

          <FormField
            id="name"
            name="name"
            label="Full name"
            placeholder="Jane Cooper"
            value={form.name}
            onChange={onChange}
            required
          />

          <div>
            <Label required>What best describes you?</Label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {businessTypes.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setForm({ ...form, businessType: t })}
                  className={
                    'rounded-xl border px-3 py-2.5 text-sm font-medium transition ' +
                    (form.businessType === t
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                      : 'border-line bg-white text-ink hover:border-brand-300')
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <FormField
            id="goal"
            name="goal"
            label="What do you want to automate?"
            placeholder="e.g. Auto-reply to pricing questions, qualify leads…"
            value={form.goal}
            onChange={onChange}
            hint="Optional — helps us recommend templates."
          />

          <Button type="submit" size="lg" fullWidth loading={loading}>
            Continue to dashboard
          </Button>
        </form>
      </div>
    </div>
  )
}
