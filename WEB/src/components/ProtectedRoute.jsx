import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PawPrint } from 'lucide-react'
import { useAuth } from '../auth/useAuth'

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="session-loading">
        <PawPrint className="session-loading-icon" />
        <span>Checking your session...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
