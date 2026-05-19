import { useEffect, useState } from 'react'
import ChatWindow from '../components/social/ChatWindow'
import { useAuth } from '../auth/useAuth'
import { useSocial } from '../context/useSocial'
import './Platform.css'

function Messages() {
  const { user } = useAuth()
  const { conversations, refreshSocialLists } = useSocial()
  const [active, setActive] = useState(null)
  const selectedConversation = active || conversations[0] || null

  useEffect(() => {
    refreshSocialLists().catch(() => {})
  }, [refreshSocialLists])

  return (
    <main className="platform-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Connected chat</p>
          <h1>Messages</h1>
          <p>Direct messaging is enabled only after accepted connections to reduce spam and keep local coordination trusted.</p>
        </div>
      </section>

      <section className="messages-layout">
        <aside className="care-card conversation-list">
          <h2>Conversations</h2>
          {conversations.map((conversation) => (
            <button
              className={active?.userId === conversation.userId ? 'active' : ''}
              key={conversation.userId}
              type="button"
              onClick={() => setActive(conversation)}
            >
              <strong>{conversation.displayName}</strong>
              <span>{conversation.unreadCount ? `${conversation.unreadCount} unread` : conversation.lastMessage?.message || 'Connected. Start the chat.'}</span>
            </button>
          ))}
          {!conversations.length && <p>No connected chats yet.</p>}
        </aside>
        <ChatWindow conversation={selectedConversation} currentUserId={user?.id} />
      </section>
    </main>
  )
}

export default Messages
