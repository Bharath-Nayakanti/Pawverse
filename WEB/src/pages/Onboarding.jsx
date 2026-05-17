import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, CheckCircle, Plus, RotateCcw } from 'lucide-react'
import { api, careApi } from '../api'
import { useAuth } from '../auth/useAuth'
import { setOnboardingState } from '../utils/onboarding'
import './Platform.css'

const initialPet = {
  name: '',
  species: 'dog',
  breed: '',
  dateOfBirth: '',
  ageYears: '',
  gender: 'unknown',
  weightKg: '',
  allergies: '',
  medicalConditions: '',
  activityLevel: 'moderate',
  neuteredSpayed: false,
  imageUrl: '',
  predictedBreed: '',
  confirmedBreed: '',
  breedConfidence: null
}

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

function Onboarding() {
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pet, setPet] = useState(initialPet)
  const [savedPets, setSavedPets] = useState([])
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field, value) => {
    setPet((current) => ({ ...current, [field]: value }))
  }

  const handleImage = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const imageUrl = await fileToDataUrl(file)
      update('imageUrl', imageUrl)
      const result = await api.predictBreed(file)
      setPrediction(result)
      setPet((current) => ({
        ...current,
        species: result.species || current.species,
        predictedBreed: result.breed,
        confirmedBreed: result.breed,
        breed: result.breed,
        breedConfidence: result.breed_confidence ?? result.breedConfidence
      }))
    } catch (err) {
      setError(err.message || 'Breed detection failed. You can still enter the breed manually.')
    } finally {
      setLoading(false)
    }
  }

  const payload = () => ({
    ...pet,
    ageYears: pet.ageYears ? Number(pet.ageYears) : null,
    weightKg: pet.weightKg ? Number(pet.weightKg) : null,
    dateOfBirth: pet.dateOfBirth || null,
    allergies: pet.allergies.split(',').map((item) => item.trim()).filter(Boolean),
    medicalConditions: pet.medicalConditions.split(',').map((item) => item.trim()).filter(Boolean)
  })

  const savePet = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await careApi.createPet(payload())
      if (pet.imageUrl) {
        await careApi.addPetImage(data.pet.id, {
          imageUrl: pet.imageUrl,
          predictedSpecies: prediction?.species || pet.species,
          predictedBreed: pet.predictedBreed,
          confirmedBreed: pet.confirmedBreed || pet.breed,
          confidence: pet.breedConfidence,
          isPrimary: true
        })
      }
      setSavedPets((current) => [...current, data.pet])
      setPet(initialPet)
      setPrediction(null)
    } catch (err) {
      setError(err.message || 'Failed to save pet')
    } finally {
      setLoading(false)
    }
  }

  const finish = () => {
    setOnboardingState(user, { completed: true, skipped: false, isPetOwner: true })
    navigate('/dashboard', { replace: true })
  }

  return (
    <main className="platform-page onboarding-page">
      <section className="page-heading">
        <p className="eyebrow">Pet onboarding</p>
        <h1>Add your pets</h1>
        <p>Build separate health profiles, schedules, reminders, feeding plans, vaccine timelines, and AI insights for every pet.</p>
      </section>

      <section className="wizard-grid">
        <form className="care-card form-grid" onSubmit={(event) => event.preventDefault()}>
          <label>Pet name<input value={pet.name} onChange={(e) => update('name', e.target.value)} required /></label>
          <label>Species<select value={pet.species} onChange={(e) => update('species', e.target.value)}><option value="dog">Dog</option><option value="cat">Cat</option></select></label>
          <label>Breed<input value={pet.breed} onChange={(e) => { update('breed', e.target.value); update('confirmedBreed', e.target.value) }} /></label>
          <label>Date of birth<input type="date" value={pet.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} /></label>
          <label>Age years<input type="number" min="0" step="0.1" value={pet.ageYears} onChange={(e) => update('ageYears', e.target.value)} /></label>
          <label>Gender<select value={pet.gender} onChange={(e) => update('gender', e.target.value)}><option value="unknown">Unknown</option><option value="female">Female</option><option value="male">Male</option></select></label>
          <label>Weight kg<input type="number" min="0" step="0.1" value={pet.weightKg} onChange={(e) => update('weightKg', e.target.value)} /></label>
          <label>Activity<select value={pet.activityLevel} onChange={(e) => update('activityLevel', e.target.value)}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
          <label>Allergies<input value={pet.allergies} onChange={(e) => update('allergies', e.target.value)} placeholder="Chicken, pollen" /></label>
          <label>Medical conditions<input value={pet.medicalConditions} onChange={(e) => update('medicalConditions', e.target.value)} placeholder="Arthritis, skin allergy" /></label>
          <label className="check-row"><input type="checkbox" checked={pet.neuteredSpayed} onChange={(e) => update('neuteredSpayed', e.target.checked)} /> Neutered/spayed</label>
        </form>

        <aside className="care-card ai-upload">
          <h2>AI breed detection</h2>
          <div className="image-drop" onClick={() => fileInputRef.current?.click()}>
            {pet.imageUrl ? <img src={pet.imageUrl} alt="Pet preview" /> : <Camera />}
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImage} />
          </div>
          {loading && <p>Analyzing image...</p>}
          {prediction && (
            <div className="prediction-box">
              <strong>We think this is a {prediction.breed}</strong>
              <span>{Math.round((prediction.breed_confidence || 0) * 100)}% confidence</span>
              <button type="button" onClick={() => update('confirmedBreed', prediction.breed)}><CheckCircle /> Confirm</button>
              <button type="button" onClick={() => fileInputRef.current?.click()}><RotateCcw /> Retry</button>
            </div>
          )}
          {error && <div className="inline-error">{error}</div>}
          <button type="button" className="primary-action wide" disabled={!pet.name || loading} onClick={savePet}><Plus /> Save pet</button>
          <button type="button" className="secondary-action wide" onClick={finish}>{savedPets.length ? 'Finish onboarding' : 'Skip and add later'}</button>
          {savedPets.length > 0 && <p className="saved-note">{savedPets.length} pet{savedPets.length > 1 ? 's' : ''} saved.</p>}
        </aside>
      </section>
    </main>
  )
}

export default Onboarding
