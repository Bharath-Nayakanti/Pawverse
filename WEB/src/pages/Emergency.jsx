import { AlertTriangle, HeartPulse, MapPin, Phone, ShieldAlert } from 'lucide-react'
import './Platform.css'

const emergencyCards = [
  { icon: ShieldAlert, title: 'Emergency symptoms', text: 'Trouble breathing, collapse, seizures, severe bleeding, bloat, poisoning, heatstroke, or inability to urinate need urgent care.' },
  { icon: MapPin, title: 'Nearby vet hospitals', text: 'Use your maps app for emergency veterinary hospital near me. Save your primary clinic and nearest 24/7 hospital.' },
  { icon: HeartPulse, title: 'CPR basics', text: 'Check responsiveness and breathing, call emergency care, begin chest compressions only if trained or instructed by a vet professional.' },
  { icon: AlertTriangle, title: 'Poison information', text: 'Chocolate, xylitol, grapes, lilies, human medications, and pesticides can be life-threatening. Call a poison helpline immediately.' }
]

function Emergency() {
  return (
    <main className="platform-page emergency-page">
      <section className="hero-band emergency">
        <div>
          <p className="eyebrow">Emergency assistance</p>
          <h1>Fast guidance for moments that cannot wait.</h1>
          <p>Keep contacts, red-flag symptoms, poison guidance, CPR basics, and nearby clinic prompts in one place.</p>
        </div>
        <a className="primary-action" href="tel:"><Phone /> Call vet</a>
      </section>

      <section className="emergency-grid">
        {emergencyCards.map((card) => {
          const Icon = card.icon
          return (
            <article className="care-card" key={card.title}>
              <Icon />
              <h2>{card.title}</h2>
              <p>{card.text}</p>
            </article>
          )
        })}
      </section>
    </main>
  )
}

export default Emergency
