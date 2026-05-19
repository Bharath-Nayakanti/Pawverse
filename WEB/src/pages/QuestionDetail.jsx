import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle, Send, Triangle } from 'lucide-react'
import { qandaApi } from '../api'
import './Qanda.css'

function QuestionDetail() {
  const { id } = useParams()
  const [question, setQuestion] = useState(null)
  const [answers, setAnswers] = useState([])
  const [sort, setSort] = useState('top')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const data = await qandaApi.question(id, sort)
    setQuestion(data.question)
    setAnswers(data.answers || [])
  }, [id, sort])

  useEffect(() => {
    queueMicrotask(() => {
      load().catch((err) => setError(err.message || 'Could not load question.'))
    })
  }, [load])

  const summary = useMemo(() => {
    if (!answers.length) return 'No answers yet. Be the first to help.'
    const top = answers.slice(0, 3).map((answer) => answer.body).join(' ')
    return top.length > 220 ? `${top.slice(0, 220)}...` : top
  }, [answers])

  const submitAnswer = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await qandaApi.answer(id, { body })
      setBody('')
      await load()
    } catch (err) {
      setError(err.message || 'Could not post answer.')
    }
  }

  const voteAnswer = async (answerId, value) => {
    await qandaApi.voteAnswer(answerId, value)
    await load()
  }

  const accept = async (answerId) => {
    const data = await qandaApi.acceptAnswer(id, answerId)
    setQuestion(data.question)
    setAnswers(data.answers || [])
  }

  if (!question && !error) return <main className="platform-page qa-page"><div className="care-card">Loading question...</div></main>

  return (
    <main className="platform-page qa-page">
      {error && <div className="inline-error">{error}</div>}
      {question && (
        <>
          <article className={`qa-detail-card ${question.urgency === 'emergency' ? 'emergency' : ''}`}>
            <Link to="/qanda" className="qa-back-link">Back to Q&A</Link>
            <div className="qa-card-meta">
              <span>{question.petType}</span><span>{question.category}</span><span>{question.authorRole}</span>
            </div>
            <h1>{question.title}</h1>
            <p>{question.body}</p>
            <div className="qa-tags">{question.tags?.map((tag) => <span key={tag.slug}>{tag.name}</span>)}</div>
            {question.urgency === 'emergency' && <div className="qa-emergency">Emergency: seek veterinary care immediately.</div>}
          </article>

          <section className="care-card qa-summary">
            <h2>AI thread summary</h2>
            <p>{question.aiSummary || summary}</p>
          </section>

          <section className="qa-answer-toolbar">
            <h2>{answers.length} Answers</h2>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="top">Top</option>
              <option value="newest">Newest</option>
              <option value="helpful">Most helpful</option>
            </select>
          </section>

          <div className="qa-answer-list">
            {answers.map((answer) => (
              <article className="qa-answer-card" key={answer.id}>
                <div className="qa-vote-rail">
                  <button type="button" onClick={() => voteAnswer(answer.id, 1)}><Triangle /></button>
                  <strong>{answer.voteScore}</strong>
                  <button type="button" className="down" onClick={() => voteAnswer(answer.id, -1)}><Triangle /></button>
                </div>
                <div>
                  <div className="qa-card-meta"><span>{answer.authorRole}</span><span>{new Date(answer.createdAt).toLocaleDateString()}</span></div>
                  <p>{answer.body}</p>
                  {answer.isAccepted && <span className="accepted-answer"><CheckCircle /> Accepted answer</span>}
                  {!answer.isAccepted && question.userId !== answer.userId && (
                    <button className="secondary-action" type="button" onClick={() => accept(answer.id)}>Accept answer</button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <form className="care-card qa-form" onSubmit={submitAnswer}>
            <h2>Your answer</h2>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={2} placeholder="Share practical pet experience, safety notes, and when to call a vet." />
            <button className="primary-action" type="submit"><Send /> Post answer</button>
          </form>
        </>
      )}
    </main>
  )
}

export default QuestionDetail
