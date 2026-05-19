import { Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { socialApi } from '../../api'

function ChatWindow({ conversation, currentUserId }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!conversation?.userId) return
    socialApi.messages(conversation.userId)
      .then((data) => setMessages(data.messages || []))
      .catch(() => setMessages([]))
  }, [conversation?.userId])

  const handleSend = async (event) => {
    event.preventDefault()
    if (!draft.trim() || !conversation?.userId) return
    const data = await socialApi.sendMessage({ receiverId: conversation.userId, message: draft.trim() })
      .catch((err) => {
        setError(err.message || 'Could not send message.')
        return null
      })
    if (!data?.message) return
    setMessages((items) => [...items, data.message])
    setDraft('')
    setError('')
  }

  if (!conversation) {
    return (
      <section className="chat-window empty-chat">
        <h2>Select a conversation</h2>
        <p>Chat opens only after a connection is accepted.</p>
      </section>
    )
  }

  return (
    <section className="chat-window">
      <header>
        <h2>{conversation.displayName}</h2>
        <span className="privacy-badge">Connected chat</span>
      </header>
      <div className="message-stream">
        {messages.map((message) => (
          <article className={`message-bubble ${message.senderId === currentUserId ? 'mine' : ''}`} key={message.id}>
            <p>{message.message}</p>
            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </article>
        ))}
        {!messages.length && <p>No messages yet.</p>}
      </div>
      <form className="message-composer" onSubmit={handleSend}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Coordinate a walk or playdate" />
        <button className="primary-action" type="submit"><Send /> Send</button>
      </form>
      {error && <p className="inline-error chat-error">{error}</p>}
    </section>
  )
}

export default ChatWindow
