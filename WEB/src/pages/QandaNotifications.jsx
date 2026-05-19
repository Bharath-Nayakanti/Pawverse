import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { qandaApi } from '../api'
import './Qanda.css'

function QandaNotifications() {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    qandaApi.notifications().then((data) => setNotifications(data.notifications || [])).catch(() => setNotifications([]))
  }, [])

  return (
    <main className="platform-page qa-page">
      <section className="page-heading"><div><p className="eyebrow">Q&A updates</p><h1>Notifications</h1></div></section>
      <div className="qa-feed single">
        {notifications.map((item) => (
          <Link className="care-card qa-notification" key={item.id} to={`/qanda/questions/${item.question_id}`}>
            <Bell />
            <div><strong>{item.message}</strong><p>{item.title || 'Pet discussion'} · {new Date(item.created_at).toLocaleString()}</p></div>
          </Link>
        ))}
        {!notifications.length && <div className="care-card">No Q&A notifications yet.</div>}
      </div>
    </main>
  )
}

export default QandaNotifications
