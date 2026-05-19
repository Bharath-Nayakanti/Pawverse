import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import QuestionCard from '../components/qanda/QuestionCard'
import { qandaApi } from '../api'
import './Qanda.css'

function QandaNearby() {
  const [questions, setQuestions] = useState([])

  useEffect(() => {
    qandaApi.questions({ feed: 'nearby' }).then((data) => setQuestions(data.questions || [])).catch(() => setQuestions([]))
  }, [])

  return (
    <main className="platform-page qa-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Local discussions</p>
          <h1>Questions near you</h1>
          <p>Nearby vet recommendations, lost pets, meetups, and urgent local pet alerts.</p>
        </div>
      </section>
      <div className="connection-notice-card care-card"><h2><MapPin /> Privacy-first nearby Q&A</h2><p>Location is optional and uses approximate area labels.</p></div>
      <div className="qa-feed single">
        {questions.map((question) => <QuestionCard key={question.id} question={question} />)}
        {!questions.length && <div className="care-card">No nearby Q&A discussions yet.</div>}
      </div>
    </main>
  )
}

export default QandaNearby
