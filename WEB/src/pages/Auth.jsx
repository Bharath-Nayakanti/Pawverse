import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, HeartPulse, Lock, Mail, PawPrint, UserRound } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import PageNavigation from '../components/PageNavigation'
import { getOnboardingState } from '../utils/onboarding'
import './Auth.css'

function Auth({ mode }) {
  const isSignup = mode === 'signup'
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login, signup } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  })

  const from = location.state?.from?.pathname || '/dashboard'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      let authedUser
      if (isSignup) {
        authedUser = await signup(form)
      } else {
        authedUser = await login({
          email: form.email,
          password: form.password
        })
      }
      const onboarding = getOnboardingState(authedUser)
      navigate(onboarding.completed || onboarding.skipped ? from : '/welcome', { replace: true })
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label={isSignup ? 'Create account' : 'Sign in'}>
        <PageNavigation className="auth-navigation" />

        <div className="auth-brand">
          <span className="auth-mark">
            <PawPrint />
          </span>
          <div>
            <p className="auth-kicker">Pawverse</p>
            <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="auth-name-grid">
              <label className="field">
                <span>First name</span>
                <div className="input-shell">
                  <UserRound />
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={updateField}
                    autoComplete="given-name"
                    required
                    minLength={2}
                  />
                </div>
              </label>

              <label className="field">
                <span>Last name</span>
                <div className="input-shell">
                  <UserRound />
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={updateField}
                    autoComplete="family-name"
                    required
                    minLength={2}
                  />
                </div>
              </label>
            </div>
          )}

          <label className="field">
            <span>Email</span>
            <div className="input-shell">
              <Mail />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-shell">
              <Lock />
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={updateField}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
              <button
                className="icon-button"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          {isSignup && (
            <p className="password-hint">Use at least 8 characters with a letter and a number.</p>
          )}

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            <HeartPulse />
            {submitting ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? 'Already have an account?' : 'No account yet?'}
          {' '}
          <Link to={isSignup ? '/login' : '/signup'}>
            {isSignup ? 'Sign in' : 'Create one'}
          </Link>
        </p>
      </section>
    </main>
  )
}

export default Auth
