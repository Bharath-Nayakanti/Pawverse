import { PawPrint } from 'lucide-react'

export function LoadingState({ label = 'Loading PawVerse...' }) {
  return (
    <div className="state-view">
      <PawPrint className="pulse-icon" />
      <p>{label}</p>
    </div>
  )
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  )
}
