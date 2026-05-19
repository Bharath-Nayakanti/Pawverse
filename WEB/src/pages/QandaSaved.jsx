import { useEffect, useState } from 'react'
import QuestionCard from '../components/qanda/QuestionCard'
import { qandaApi } from '../api'
import './Qanda.css'

function QandaSaved() {
  const [questions, setQuestions] = useState([])

  useEffect(() => {
    qandaApi.saved().then((data) => setQuestions(data.questions || [])).catch(() => setQuestions([]))
  }, [])

  return (
    <main className="platform-page qa-page">
      <section className="page-heading"><div><p className="eyebrow">Q&A Library</p><h1>Saved pet discussions</h1></div></section>
      <div className="qa-feed single">
        {questions.map((question) => <QuestionCard key={question.id} question={question} />)}
        {!questions.length && <div className="care-card">No saved Q&A posts yet.</div>}
      </div>
    </main>
  )
}

export default QandaSaved
