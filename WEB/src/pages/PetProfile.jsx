import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, FileText, HeartPulse, Salad, Syringe } from 'lucide-react'
import { careApi } from '../api'
import { LoadingState } from '../components/StateViews'
import { usePets } from '../context/usePets'
import './Platform.css'

function PetProfile() {
  const { petId } = useParams()
  const { pets } = usePets()
  const pet = pets.find((item) => item.id === petId)
  const [data, setData] = useState({ reminders: [], vaccines: [], plans: [], records: [], insights: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [reminders, vaccines, plans, records, insights] = await Promise.all([
        careApi.listReminders(petId),
        careApi.listVaccines(petId),
        careApi.listFeedingPlans(petId),
        careApi.listHealthRecords(petId),
        careApi.insights(petId)
      ])
      setData({
        reminders: reminders.reminders || [],
        vaccines: vaccines.vaccines || [],
        plans: plans.plans || [],
        records: records.records || [],
        insights: insights.insights || []
      })
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [petId])

  if (!pet || loading) return <LoadingState label="Loading pet profile..." />

  return (
    <main className="platform-page">
      <section className="profile-header">
        <div className="profile-photo">{pet.imageUrl ? <img src={pet.imageUrl} alt={pet.name} /> : <HeartPulse />}</div>
        <div>
          <p className="eyebrow">{pet.species}</p>
          <h1>{pet.name}</h1>
          <p>{pet.confirmedBreed || pet.breed || 'Breed not set'} · {pet.weightKg || 'Weight unknown'} kg · {pet.activityLevel} activity</p>
        </div>
      </section>

      <section className="profile-grid">
        <article className="care-card"><Syringe /><h2>Vaccine timeline</h2>{data.vaccines.map((v) => <p key={v.id}>{v.vaccine_name} · {v.status}</p>)}</article>
        <article className="care-card"><Salad /><h2>Feeding plan</h2>{data.plans.slice(0, 1).map((p) => <p key={p.id}>{p.calories_per_day} kcal/day · {p.meals_per_day} meals</p>)}</article>
        <article className="care-card"><CalendarDays /><h2>Reminders</h2>{data.reminders.slice(0, 5).map((r) => <p key={r.id}>{r.title} · {new Date(r.due_at).toLocaleDateString()}</p>)}</article>
        <article className="care-card"><FileText /><h2>Health history</h2>{data.records.slice(0, 5).map((r) => <p key={r.id}>{r.title} · {r.type}</p>)}</article>
      </section>

      <section className="care-card">
        <h2>AI insights panel</h2>
        <div className="insight-list">
          {data.insights.map((insight, index) => <div className={`insight-card ${insight.severity}`} key={index}><strong>{insight.title}</strong><p>{insight.summary}</p></div>)}
        </div>
      </section>
    </main>
  )
}

export default PetProfile
