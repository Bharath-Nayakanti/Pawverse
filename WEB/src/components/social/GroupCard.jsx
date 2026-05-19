import { Users } from 'lucide-react'

function GroupCard({ group, onJoin }) {
  return (
    <article className="social-card">
      <span className="status-pill">{group.category}</span>
      <h3>{group.title}</h3>
      <p>{group.description || 'A PawVerse local community group.'}</p>
      <div className="mini-list">
        <span><Users /> {group.memberCount || 0} members</span>
        <span>{group.location || 'Local community'} · {group.visibility}</span>
      </div>
      <button className="secondary-action" type="button" onClick={() => onJoin?.(group.id)}>
        {group.isMember ? 'Joined' : 'Join group'}
      </button>
    </article>
  )
}

export default GroupCard
