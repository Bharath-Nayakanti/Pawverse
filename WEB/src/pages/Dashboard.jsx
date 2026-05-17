import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, CheckCircle, HeartPulse, Plus, Syringe } from 'lucide-react'
import { careApi } from '../api'
import PetCard from '../components/PetCard'
import { EmptyState, LoadingState } from '../components/StateViews'
import { useAuth } from '../auth/useAuth'
import { usePets } from '../context/usePets'
import { getOnboardingState } from '../utils/onboarding'
import './Platform.css'

function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { pets, selectedPet, loading, refreshPets } = usePets()
  const [reminders, setReminders] = useState([])
  const [insights, setInsights] = useState([])
  const [vaccines, setVaccines] = useState([])

  useEffect(() => {
    const onboarding = getOnboardingState(user)
    if (!onboarding.completed && !onboarding.skipped) {
      navigate('/welcome', { replace: true })
    }
  }, [navigate, user])

  useEffect(() => {
    const loadDashboard = async () => {
      const [reminderData, vaccineData] = await Promise.all([
        careApi.listReminders(),
        careApi.listVaccines()
      ])
      setReminders(reminderData.reminders || [])
      setVaccines(vaccineData.vaccines || [])
    }
    loadDashboard().catch(() => {})
  }, [pets.length])

  useEffect(() => {
    if (!selectedPet?.id) return
    careApi.insights(selectedPet.id)
      .then((data) => setInsights(data.insights || []))
      .catch(() => setInsights([]))
  }, [selectedPet?.id])

  const stats = useMemo(() => ({
    pets: pets.length,
    overdue: reminders.filter((item) => item.status === 'overdue' || new Date(item.due_at || item.dueAt) < new Date()).length,
    vaccines: vaccines.filter((item) => item.status !== 'completed').length,
    alerts: insights.filter((item) => ['high', 'emergency'].includes(item.severity)).length
  }), [pets, reminders, vaccines, insights])

  const todayReminders = useMemo(() => reminders
    .filter((item) => new Date(item.snoozed_until || item.due_at || item.dueAt).toDateString() === new Date().toDateString())
    .slice(0, 6), [reminders])

  const overdueReminders = useMemo(() => reminders
    .filter((item) => item.status === 'overdue')
    .slice(0, 4), [reminders])

  if (loading) return <LoadingState label="Loading your pet care dashboard..." />

  return (
    <main className="platform-page">
      <section className="hero-band">
        <div>
          <p className="eyebrow">AI pet care ecosystem</p>
          <h1>Good care starts with one calm dashboard.</h1>
          <p>Manage pets, vaccines, reminders, feeding, health history, and AI risk signals without losing the thread.</p>
        </div>
        <Link className="primary-action" to="/onboarding"><Plus /> Add pet</Link>
      </section>

      <section className="metric-grid">
        <article><HeartPulse /><strong>{stats.pets}</strong><span>Pets</span></article>
        <article><CalendarClock /><strong>{stats.overdue}</strong><span>Overdue tasks</span></article>
        <article><Syringe /><strong>{stats.vaccines}</strong><span>Open vaccines</span></article>
        <article><AlertTriangle /><strong>{stats.alerts}</strong><span>Health alerts</span></article>
      </section>

      {!pets.length ? (
        <EmptyState
          title="No pets yet"
          message="Add your first pet to generate schedules, vaccines, feeding plans, records, and AI insights."
          action={<Link className="primary-action" to="/onboarding">Start onboarding</Link>}
        />
      ) : (
        <section className="dashboard-grid">
          <div className="panel-span">
            <div className="section-title">
              <h2>Your pets</h2>
              <button type="button" onClick={refreshPets}>Refresh</button>
            </div>
            <div className="pet-grid">
              {pets.map((pet) => (
                <PetCard key={pet.id} pet={pet} reminders={reminders} insights={insights} />
              ))}
            </div>
          </div>

          <aside className="care-card">
            <h2>AI insights</h2>
            <div className="insight-list">
              {insights.map((insight, index) => (
                <div className={`insight-card ${insight.severity}`} key={`${insight.title}-${index}`}>
                  <strong>{insight.title}</strong>
                  <p>{insight.summary}</p>
                </div>
              ))}
            </div>
          </aside>

          <section className="care-card">
            <h2>Today</h2>
            <div className="timeline">
              {todayReminders.map((reminder) => (
                <article key={reminder.id}>
                  <span>{reminder.type}</span>
                  <strong>{reminder.title}</strong>
                  <p>{new Date(reminder.snoozed_until || reminder.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {reminder.status}</p>
                </article>
              ))}
              {!todayReminders.length && <p>No care tasks due today.</p>}
            </div>
          </section>

          <section className="care-card">
            <h2>Overdue</h2>
            <div className="timeline">
              {overdueReminders.map((reminder) => (
                <article key={reminder.id}>
                  <span>{reminder.type}</span>
                  <strong>{reminder.title}</strong>
                  <p>{new Date(reminder.due_at).toLocaleString()}</p>
                </article>
              ))}
              {!overdueReminders.length && <p><CheckCircle /> No overdue tasks.</p>}
            </div>
          </section>
        </section>
      )}
    </main>
  )
}

export default Dashboard
