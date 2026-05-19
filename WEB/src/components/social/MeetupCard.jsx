import { CalendarDays, MapPin, Users } from 'lucide-react'

function MeetupCard({ meetup, onJoin }) {
  return (
    <article className="social-card">
      <span className="status-pill">{meetup.category}</span>
      <h3>{meetup.title}</h3>
      <p>{meetup.description || 'Local pet community meetup'}</p>
      <div className="mini-list">
        <span><CalendarDays /> {new Date(meetup.meetupTime).toLocaleString()}</span>
        <span><MapPin /> {meetup.approximateLocation}</span>
        <span><Users /> {meetup.participantCount || 0}{meetup.maxParticipants ? `/${meetup.maxParticipants}` : ''} going</span>
      </div>
      <button className="secondary-action" type="button" onClick={() => onJoin?.(meetup.id)}>
        {meetup.isJoined ? 'Going' : 'Join meetup'}
      </button>
    </article>
  )
}

export default MeetupCard
