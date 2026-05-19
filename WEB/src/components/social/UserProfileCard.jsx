import { Ban, Flag, HeartHandshake, MapPin, MessageCircle, PawPrint } from 'lucide-react'

function UserProfileCard({ profile, onConnect, onMessage, onReport, onBlock }) {
  const featuredPet = profile.pets?.[0]
  const isAccepted = profile.connection?.status === 'accepted'
  const isPending = profile.connection?.status === 'pending'
  const isIncoming = profile.connection?.direction === 'incoming'
  const connectionLabel = isAccepted ? 'Connected' : isPending ? (isIncoming ? 'Request received' : 'Notification sent') : 'Send request'

  return (
    <article className="social-card user-profile-card">
      <div className="social-card-top">
        <div className="avatar-tile"><PawPrint /></div>
        <div>
          <h3>{profile.displayName}</h3>
          <p><MapPin /> {profile.areaLabel} · {profile.approximateDistance}</p>
        </div>
      </div>

      <div className="mini-list">
        <span>{profile.pets?.length || 0} visible pets</span>
        {featuredPet && <span>{featuredPet.name} may enjoy {featuredPet.activityLevel || 'moderate'} play</span>}
        {isPending && <span className="request-note">{isIncoming ? 'They sent you a connection request.' : 'They will see this in their connection notifications.'}</span>}
      </div>

      <div className="social-actions">
        <button className="primary-action" type="button" disabled={isAccepted || isPending} onClick={() => onConnect?.(profile.userId)}>
          <HeartHandshake /> {connectionLabel}
        </button>
        <button className="secondary-action" type="button" disabled={!isAccepted} onClick={() => onMessage?.(profile.userId)}>
          <MessageCircle /> {isAccepted ? 'Chat' : 'Chat after accept'}
        </button>
        <button className="icon-action" type="button" title="Report user" onClick={() => onReport?.(profile.userId)}>
          <Flag />
        </button>
        <button className="icon-action danger" type="button" title="Block user" onClick={() => onBlock?.(profile.userId)}>
          <Ban />
        </button>
      </div>
    </article>
  )
}

export default UserProfileCard
