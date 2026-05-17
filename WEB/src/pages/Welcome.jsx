import { useNavigate } from 'react-router-dom'
import { HeartHandshake, PawPrint, SkipForward } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { setOnboardingState } from '../utils/onboarding'
import './Platform.css'

function Welcome() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const chooseOwner = () => {
    setOnboardingState(user, { isPetOwner: true })
    navigate('/onboarding')
  }

  const skip = () => {
    setOnboardingState(user, { isPetOwner: false, skipped: true, completed: false })
    navigate('/dashboard', { replace: true })
  }

  return (
    <main className="welcome-page">
      <section className="welcome-panel">
        <span className="welcome-icon"><PawPrint /></span>
        <p className="eyebrow">Welcome to PawVerse</p>
        <h1>Let’s build your intelligent pet care workspace.</h1>
        <p className="welcome-copy">
          PawVerse manages pet profiles, vaccines, feeding, reminders, health records, AI insights, and emergency guidance in one protected place.
        </p>
        <div className="welcome-actions">
          <button type="button" className="primary-action" onClick={chooseOwner}>
            <HeartHandshake /> Yes, I have pets
          </button>
          <button type="button" className="secondary-action" onClick={skip}>
            <SkipForward /> Skip for now
          </button>
        </div>
      </section>
    </main>
  )
}

export default Welcome
