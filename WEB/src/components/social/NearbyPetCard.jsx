import { MapPin, PawPrint, Sparkles } from 'lucide-react'

function NearbyPetCard({ pet }) {
  return (
    <article className="social-card pet-social-card">
      <div className="pet-social-photo">
        {pet.imageUrl ? <img src={pet.imageUrl} alt={pet.name} /> : <PawPrint />}
      </div>
      <div>
        <span className="status-pill">{pet.species}</span>
        <h3>{pet.name}</h3>
        <p>{pet.breed || 'Mixed breed'} · {pet.activityLevel || 'moderate'} energy</p>
        <p><MapPin /> {pet.owner?.displayName} · {pet.owner?.approximateDistance}</p>
        <span className="match-note"><Sparkles /> Connect from the owner card to keep requests clear.</span>
      </div>
    </article>
  )
}

export default NearbyPetCard
