import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Bookmark, Plus, ShieldCheck } from 'lucide-react'
import { qandaApi } from '../api'
import QandaFilters from '../components/qanda/QandaFilters'
import QuestionCard from '../components/qanda/QuestionCard'
import './Qanda.css'

function QandaFeed() {
  const [filters, setFilters] = useState({ feed: 'personalized', petType: 'all', category: 'all', tag: '', offset: 0 })
  const [questions, setQuestions] = useState([])
  const [nextOffset, setNextOffset] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (replace = true, next = filters) => {
    setLoading(true)
    setError('')
    try {
      const data = await qandaApi.questions(next)
      setQuestions((current) => replace ? data.questions || [] : [...current, ...(data.questions || [])])
      setNextOffset(data.nextOffset)
    } catch (err) {
      setError(err.message || 'Could not load Q&A feed.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    queueMicrotask(() => {
      load(true).catch(() => {})
    })
  }, [load])

  const updateFilters = (next) => setFilters(next)

  const vote = async (id, value) => {
    const data = await qandaApi.voteQuestion(id, value)
    setQuestions((current) => current.map((question) => question.id === id ? data.question : question))
  }

  const save = async (id) => {
    const data = await qandaApi.saveQuestion(id)
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, isSaved: data.saved } : question))
  }

  return (
    <main className="platform-page qa-page">
      <section className="qa-hero">
        <div>
          <p className="eyebrow">Pet-only Q&A</p>
          <h1>Ask owners, vets, trainers, and PawVerse AI-filtered communities.</h1>
          <p>Every post is checked for pet relevance, spam, toxicity, urgency, and topic category before it enters the feed.</p>
        </div>
        <div className="qa-hero-actions">
          <Link className="secondary-action" to="/qanda/saved"><Bookmark /> Saved</Link>
          <Link className="secondary-action" to="/qanda/notifications"><Bell /> Notifications</Link>
          <Link className="secondary-action" to="/qanda/moderation"><ShieldCheck /> Moderation</Link>
          <Link className="primary-action" to="/qanda/ask"><Plus /> Ask question</Link>
        </div>
      </section>

      <div className="qa-layout">
        <QandaFilters filters={filters} onChange={updateFilters} />
        <section className="qa-feed">
          {error && <div className="inline-error">{error}</div>}
          {questions.map((question) => <QuestionCard key={question.id} question={question} onVote={vote} onSave={save} />)}
          {!questions.length && !loading && <div className="care-card">No pet questions yet. Ask the first one.</div>}
          {nextOffset !== null && (
            <button className="secondary-action load-more" type="button" disabled={loading} onClick={() => {
              const next = { ...filters, offset: nextOffset }
              load(false, next).catch(() => {})
            }}>
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </section>
      </div>
    </main>
  )
}

export default QandaFeed
