import { Link } from 'react-router-dom'
import { AlertCircle, CalendarClock, PawPrint } from 'lucide-react'

function PetCard({ pet, reminders = [], insights = [] }) {
  const upcoming = reminders.filter((reminder) => reminder.pet_id === pet.id || reminder.petId === pet.id).slice(0, 2)
  const alert = insights.find((item) => item.severity === 'high' || item.severity === 'emergency')

  return (
    <article className="pet-card">
      <div className="pet-image">
        {pet.imageUrl || pet.image_url ? <img src={pet.imageUrl || pet.image_url} alt={pet.name} /> : <PawPrint />}
      </div>
      <div className="pet-card-body">
        <div>
          <h3>{pet.name}</h3>
          <p>{pet.confirmedBreed || pet.breed || pet.predictedBreed || 'Breed not set'} · {pet.species}</p>
        </div>
        <div className="mini-list">
          {upcoming.length ? upcoming.map((item) => (
            <span key={item.id}><CalendarClock /> {item.title}</span>
          )) : <span><CalendarClock /> No upcoming reminders</span>}
          {alert && <span className="alert"><AlertCircle /> {alert.title}</span>}
        </div>
        <Link to={`/pets/${pet.id}`} className="card-link">Open profile</Link>
      </div>
    </article>
  )
}

export default PetCard
