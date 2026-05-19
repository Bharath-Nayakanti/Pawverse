import { useEffect, useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import { socialApi } from '../api'
import { usePets } from '../context/usePets'
import { useSocial } from '../context/useSocial'
import './Platform.css'

function LostPets() {
  const { pets } = usePets()
  const { lostPetAlerts, refreshSocialLists } = useSocial()
  const [form, setForm] = useState({ petId: '', lastSeenArea: '', description: '', photoUrl: '' })

  useEffect(() => {
    refreshSocialLists().catch(() => {})
  }, [refreshSocialLists])

  const createAlert = async (event) => {
    event.preventDefault()
    await socialApi.createLostPetAlert(form)
    setForm({ petId: '', lastSeenArea: '', description: '', photoUrl: '' })
    await refreshSocialLists()
  }

  return (
    <main className="platform-page social-page">
      <section className="hero-band emergency">
        <div>
          <p className="eyebrow">Emergency nearby alerts</p>
          <h1>Lost Pet Alerts</h1>
          <p>Notify nearby PawVerse users with a pet photo and last-seen area while keeping exact addresses private.</p>
        </div>
      </section>

      <div className="social-layout two-column">
        <form className="care-card social-form" onSubmit={createAlert}>
          <h2><AlertTriangle /> Report lost pet</h2>
          <select value={form.petId} onChange={(event) => setForm({ ...form, petId: event.target.value })}>
            <option value="">Select pet</option>
            {pets.map((pet) => <option value={pet.id} key={pet.id}>{pet.name}</option>)}
          </select>
          <input value={form.lastSeenArea} onChange={(event) => setForm({ ...form, lastSeenArea: event.target.value })} placeholder="Last seen area, not exact address" required />
          <input value={form.photoUrl} onChange={(event) => setForm({ ...form, photoUrl: event.target.value })} placeholder="Photo URL" />
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Collar, behavior, contact preferences" />
          <button className="primary-action" type="submit"><Plus /> Send nearby alert</button>
        </form>

        <section>
          <div className="section-title"><h2>Active Nearby Alerts</h2></div>
          <div className="social-grid">
            {lostPetAlerts.map((alert) => (
              <article className="social-card lost-pet-card" key={alert.id}>
                <div className="pet-social-photo">
                  {alert.imageUrl ? <img src={alert.imageUrl} alt={alert.petName || 'Lost pet'} /> : <AlertTriangle />}
                </div>
                <div>
                  <span className="status-pill">{alert.status}</span>
                  <h3>{alert.petName || 'Lost pet'}</h3>
                  <p>{alert.description}</p>
                  <p>Last seen near {alert.lastSeenArea}</p>
                </div>
              </article>
            ))}
            {!lostPetAlerts.length && <div className="care-card">No active lost-pet alerts nearby.</div>}
          </div>
        </section>
      </div>
    </main>
  )
}

export default LostPets
