import { ArrowLeft, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function PageNavigation({ className = '' }) {
  const navigate = useNavigate()

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <div className={`page-navigation ${className}`.trim()}>
      <button type="button" className="nav-action" onClick={goBack}>
        <ArrowLeft className="nav-action-icon" />
        Back
      </button>
      <button type="button" className="nav-action" onClick={() => navigate('/dashboard')}>
        <Home className="nav-action-icon" />
        Home
      </button>
    </div>
  )
}

export default PageNavigation
