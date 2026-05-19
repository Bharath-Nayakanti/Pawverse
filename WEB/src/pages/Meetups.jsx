import { useEffect, useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { socialApi } from '../api'
import MeetupCard from '../components/social/MeetupCard'
import { useSocial } from '../context/useSocial'
import './Platform.css'

function Meetups() {
  const { meetups, refreshSocialLists } = useSocial()
  const [form, setForm] = useState({
    title: '',
    description: '',
    meetupTime: '',
    approximateLocation: '',
    category: 'playdate',
    visibility: 'nearby',
    maxParticipants: ''
  })

  useEffect(() => {
    refreshSocialLists().catch(() => {})
  }, [refreshSocialLists])

  const createMeetup = async (event) => {
    event.preventDefault()
    await socialApi.createMeetup({ ...form, maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null })
    setForm({ title: '', description: '', meetupTime: '', approximateLocation: '', category: 'playdate', visibility: 'nearby', maxParticipants: '' })
    await refreshSocialLists()
  }

  const joinMeetup = async (id) => {
    await socialApi.joinMeetup(id)
    await refreshSocialLists()
  }

  return (
    <main className="platform-page social-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Walks and playdates</p>
          <h1>Meetups</h1>
          <p>Organize dog walks, pet playdates, adoption drives, vaccination camps, grooming sessions, and training meetups.</p>
        </div>
      </section>

      <div className="social-layout two-column">
        <form className="care-card social-form" onSubmit={createMeetup}>
          <h2><CalendarDays /> Create meetup</h2>
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Saturday morning dog walk" required />
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Details and safety notes" />
          <input type="datetime-local" value={form.meetupTime} onChange={(event) => setForm({ ...form, meetupTime: event.target.value })} required />
          <input value={form.approximateLocation} onChange={(event) => setForm({ ...form, approximateLocation: event.target.value })} placeholder="Approximate park or area" required />
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="playdate">Playdate</option>
            <option value="walk">Walk</option>
            <option value="adoption">Adoption</option>
            <option value="vaccination">Vaccination</option>
            <option value="grooming">Grooming</option>
            <option value="training">Training</option>
          </select>
          <input type="number" min="2" value={form.maxParticipants} onChange={(event) => setForm({ ...form, maxParticipants: event.target.value })} placeholder="Max participants" />
          <button className="primary-action" type="submit"><Plus /> Create meetup</button>
        </form>

        <section>
          <div className="section-title"><h2>Upcoming Meetups</h2></div>
          <div className="social-grid">
            {meetups.map((meetup) => <MeetupCard key={meetup.id} meetup={meetup} onJoin={joinMeetup} />)}
            {!meetups.length && <div className="care-card">No meetups yet.</div>}
          </div>
        </section>
      </div>
    </main>
  )
}

export default Meetups
