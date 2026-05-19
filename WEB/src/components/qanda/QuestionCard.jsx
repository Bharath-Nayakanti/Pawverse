import { Link } from 'react-router-dom'
import { Bookmark, MessageCircle, Share2, Triangle } from 'lucide-react'

function QuestionCard({ question, onVote, onSave }) {
  const urgencyClass = question.urgency === 'emergency' ? ' emergency' : ''

  return (
    <article className={`qa-card${urgencyClass}`}>
      <div className="qa-vote-rail">
        <button type="button" className={question.userVote === 1 ? 'active' : ''} onClick={() => onVote?.(question.id, 1)} title="Upvote">
          <Triangle />
        </button>
        <strong>{question.voteScore}</strong>
        <button type="button" className={question.userVote === -1 ? 'active down' : 'down'} onClick={() => onVote?.(question.id, -1)} title="Downvote">
          <Triangle />
        </button>
      </div>

      <div className="qa-card-main">
        <div className="qa-card-meta">
          <span>{question.petType}</span>
          <span>{question.category}</span>
          <span>{question.authorRole}</span>
          {question.locationLabel && <span>{question.locationLabel}</span>}
        </div>
        <Link className="qa-question-title" to={`/qanda/questions/${question.id}`}>{question.title}</Link>
        <p>{question.body}</p>
        <div className="qa-tags">
          {(question.tags || []).slice(0, 6).map((tag) => (
            <span key={tag.slug || tag.name}>{tag.name}</span>
          ))}
        </div>
        {question.urgency === 'emergency' && (
          <div className="qa-emergency">Emergency detected: seek veterinary help immediately.</div>
        )}
        <div className="qa-card-footer">
          <span><MessageCircle /> {question.answerCount} answers</span>
          <span>{question.viewCount} views</span>
          <button type="button" onClick={() => onSave?.(question.id)}><Bookmark /> {question.isSaved ? 'Saved' : 'Save'}</button>
          <button type="button" onClick={() => navigator.share?.({ title: question.title, url: window.location.origin + `/qanda/questions/${question.id}` })}><Share2 /> Share</button>
        </div>
      </div>
    </article>
  )
}

export default QuestionCard
