import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { qandaApi } from '../api'
import './Qanda.css'

function QandaModeration() {
  const [queue, setQueue] = useState([])

  useEffect(() => {
    qandaApi.moderation().then((data) => setQueue(data.queue || [])).catch(() => setQueue([]))
  }, [])

  return (
    <main className="platform-page qa-page">
      <section className="page-heading"><div><p className="eyebrow">AI safety</p><h1>Moderation Dashboard</h1><p>Rejected and flagged Q&A submissions from rule filters and AI relevance checks.</p></div></section>
      <div className="qa-feed single">
        {queue.map((item) => (
          <article className="care-card qa-moderation-row" key={item.id}>
            <ShieldCheck />
            <div>
              <strong>{item.title || 'Answer moderation event'}</strong>
              <p>{item.label} · {item.action} · {Math.round(Number(item.confidence || 0) * 100)}%</p>
              <span>{item.input_text}</span>
            </div>
          </article>
        ))}
        {!queue.length && <div className="care-card">No moderation items queued.</div>}
      </div>
    </main>
  )
}

export default QandaModeration
