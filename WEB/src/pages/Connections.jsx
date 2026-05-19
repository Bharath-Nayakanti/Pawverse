import { useEffect } from 'react'
import { Ban, Check, Clock, MessageCircle, UserX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { socialApi } from '../api'
import { useSocial } from '../context/useSocial'
import './Platform.css'

function Connections() {
  const { connections, refreshSocialLists } = useSocial()
  const incoming = connections.filter((item) => item.status === 'pending' && item.direction === 'incoming')
  const outgoing = connections.filter((item) => item.status === 'pending' && item.direction === 'outgoing')
  const connected = connections.filter((item) => item.status === 'accepted')

  useEffect(() => {
    refreshSocialLists().catch(() => {})
  }, [refreshSocialLists])

  const update = async (id, status) => {
    await socialApi.updateConnection(id, status)
    await refreshSocialLists()
  }

  return (
    <main className="platform-page social-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Trust network</p>
          <h1>Connection Notifications</h1>
          <p>Requests arrive here first. Chat opens only after a request is accepted.</p>
        </div>
      </section>

      <section className="notification-summary-grid">
        <article className="care-card"><strong>{incoming.length}</strong><span>Received requests</span></article>
        <article className="care-card"><strong>{outgoing.length}</strong><span>Sent requests</span></article>
        <article className="care-card"><strong>{connected.length}</strong><span>Accepted connections</span></article>
      </section>

      <section>
        <div className="section-title"><h2>Received Requests</h2></div>
        <div className="social-grid">
          {incoming.map((connection) => (
            <article className="social-card request-card" key={connection.id}>
              <span className="status-pill">notification received</span>
              <h3>{connection.user.displayName}</h3>
              <p>Accepting this request will unlock direct chat.</p>
              <div className="social-actions">
                <button className="primary-action" type="button" onClick={() => update(connection.id, 'accepted')}><Check /> Accept</button>
                <button className="secondary-action" type="button" onClick={() => update(connection.id, 'rejected')}><UserX /> Reject</button>
                <button className="icon-action danger" type="button" title="Block user" onClick={() => update(connection.id, 'blocked')}><Ban /></button>
              </div>
            </article>
          ))}
          {!incoming.length && <div className="care-card">No received requests.</div>}
        </div>
      </section>

      <section>
        <div className="section-title"><h2>Sent Requests</h2></div>
        <div className="social-grid">
          {outgoing.map((connection) => (
            <article className="social-card request-card" key={connection.id}>
              <span className="status-pill">waiting for response</span>
              <h3>{connection.user.displayName}</h3>
              <p><Clock /> They have a connection notification. Chat stays locked until accepted.</p>
              <div className="social-actions">
                <button className="secondary-action" type="button" onClick={() => update(connection.id, 'removed')}><UserX /> Cancel request</button>
              </div>
            </article>
          ))}
          {!outgoing.length && <div className="care-card">No sent requests waiting.</div>}
        </div>
      </section>

      <section>
        <div className="section-title"><h2>Accepted Connections</h2></div>
        <div className="social-grid">
          {connected.map((connection) => (
          <article className="social-card" key={connection.id}>
            <span className="status-pill">connected</span>
            <h3>{connection.user.displayName}</h3>
            <div className="social-actions">
              <Link className="secondary-action" to="/messages"><MessageCircle /> Message</Link>
              <button className="icon-action danger" type="button" title="Block user" onClick={() => update(connection.id, 'blocked')}><Ban /></button>
            </div>
          </article>
          ))}
          {!connected.length && <div className="care-card">No accepted connections yet.</div>}
        </div>
      </section>
    </main>
  )
}

export default Connections
