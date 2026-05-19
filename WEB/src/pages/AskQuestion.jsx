import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bot, ImagePlus, Send } from 'lucide-react'
import { qandaApi } from '../api'
import './Qanda.css'

const initialForm = {
  title: '',
  body: '',
  tags: '',
  petType: 'general',
  category: 'General',
  images: '',
  locationLabel: ''
}

function AskQuestion() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [similar, setSimilar] = useState([])
  const [moderation, setModeration] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (form.title.trim().length < 12) return
    const handle = setTimeout(() => {
      qandaApi.similar(form.title).then((data) => setSimilar(data.questions || [])).catch(() => {})
    }, 450)
    return () => clearTimeout(handle)
  }, [form.title])

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setModeration(null)
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        images: form.images.split(',').map((image) => image.trim()).filter(Boolean)
      }
      const data = await qandaApi.createQuestion(payload)
      setModeration(data.moderation)
      if (data.question?.status === 'published') {
        navigate(`/qanda/questions/${data.question.id}`)
        return
      }
      setError(data.moderation?.action === 'reject'
        ? 'This question was rejected because it does not match PawVerse pet-only guidelines.'
        : 'This question was flagged for review. Make it more clearly pet-related and try again.')
    } catch (err) {
      setError(err.message || 'Could not post question.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="platform-page qa-page">
      <section className="qa-hero compact">
        <div>
          <p className="eyebrow">Ask PawVerse</p>
          <h1>Write a pet-focused question.</h1>
          <p>AI moderation checks relevance, spam, toxicity, urgency, and likely topic before publishing.</p>
        </div>
      </section>

      <div className="qa-compose-layout">
        <form className="care-card qa-form" onSubmit={submit}>
          {error && <div className="inline-error"><AlertTriangle /> {error}</div>}
          {moderation && (
            <div className="qa-ai-note">
              <Bot />
              <span>{moderation.label} · {Math.round((moderation.confidence || 0) * 100)}% · {moderation.categories?.category}</span>
            </div>
          )}
          <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required minLength={8} placeholder="Why is my dog vomiting after meals?" /></label>
          <label>Details<textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required minLength={12} placeholder="Share age, breed, symptoms, food changes, timeline, and what you have tried." /></label>
          <div className="qa-form-grid">
            <label>Pet type<select value={form.petType} onChange={(event) => setForm({ ...form, petType: event.target.value })}>
              <option value="general">General</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="bird">Bird</option>
              <option value="fish">Fish</option>
              <option value="exotic">Exotic Pets</option>
            </select></label>
            <label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option>General</option><option>Health</option><option>Food</option><option>Grooming</option><option>Training</option><option>Adoption</option><option>Emergency</option><option>Lost & Found</option>
            </select></label>
          </div>
          <label>Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="cat, eye problem, health" /></label>
          <label>Image URLs <span><ImagePlus /> optional</span><input value={form.images} onChange={(event) => setForm({ ...form, images: event.target.value })} placeholder="/uploads/cat-eye.jpg, https://..." /></label>
          <label>Location<input value={form.locationLabel} onChange={(event) => setForm({ ...form, locationLabel: event.target.value })} placeholder="Approximate area, optional" /></label>
          <button className="primary-action" type="submit" disabled={loading}><Send /> {loading ? 'Checking...' : 'Post question'}</button>
        </form>

        <aside className="care-card qa-similar-panel">
          <h2>Similar questions</h2>
          {similar.map((question) => (
            <button key={question.id} type="button" onClick={() => navigate(`/qanda/questions/${question.id}`)}>
              <strong>{question.title}</strong>
              <span>{question.answerCount} answers · {question.voteScore} votes</span>
            </button>
          ))}
          {!similar.length && <p>Start typing a title to check for duplicates.</p>}
        </aside>
      </div>
    </main>
  )
}

export default AskQuestion
