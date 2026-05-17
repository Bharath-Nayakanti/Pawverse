import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Calendar, Stethoscope, Heart, LogOut, PawPrint, User } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import PageNavigation from '../components/PageNavigation'
import { getAnalysisStats } from '../utils/analysisStats'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [userStats] = useState(() => getAnalysisStats(user))

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Pet parent'
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const lastAnalysisLabel = userStats.lastAnalysis
    ? new Date(userStats.lastAnalysis).toLocaleDateString()
    : 'No analyses yet'

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <PawPrint className="logo-icon" />
            <h1>Pawverse</h1>
          </div>
          <PageNavigation className="dashboard-navigation" />
          <div className="user-section">
            <div className="user-info">
              <div className="user-avatar" aria-hidden="true">{initials}</div>
              <div className="user-details">
                <span className="user-name">{displayName}</span>
                <span className="user-email">{user?.email}</span>
              </div>
            </div>
            <button className="logout-btn" type="button" onClick={handleLogout}>
              <LogOut className="icon" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Welcome, {user?.firstName || 'there'}.</h2>
          <p>Monitor your pet's health with AI-powered analysis tools</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Activity className="icon" />
            </div>
            <div className="stat-content">
              <h3>{userStats.totalAnalyses}</h3>
              <p>Total Analyses</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Calendar className="icon" />
            </div>
            <div className="stat-content">
              <h3>{lastAnalysisLabel}</h3>
              <p>Last Analysis</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Heart className="icon" />
            </div>
            <div className="stat-content">
              <h3>Healthy</h3>
              <p>Pet Status</p>
            </div>
          </div>
        </div>

        <div className="actions-grid">
          <Link to="/health-analysis" className="action-card primary">
            <div className="action-icon">
              <Stethoscope className="icon" />
            </div>
            <div className="action-content">
              <h3>Health Analysis</h3>
              <p>Start a new pet health analysis with AI</p>
            </div>
            <div className="action-arrow">→</div>
          </Link>

          <div className="action-card secondary">
            <div className="action-icon">
              <Activity className="icon" />
            </div>
            <div className="action-content">
              <h3>Analysis History</h3>
              <p>View your previous health analyses</p>
            </div>
            <div className="action-arrow">→</div>
          </div>

          <div className="action-card secondary">
            <div className="action-icon">
              <User className="icon" />
            </div>
            <div className="action-content">
              <h3>Profile Settings</h3>
              <p>Manage your account and preferences</p>
            </div>
            <div className="action-arrow">→</div>
          </div>
        </div>

        <div className="info-section">
          <div className="tips-card">
            <h3>💡 Quick Tips</h3>
            <ul>
              <li>Upload clear images for better disease detection accuracy</li>
              <li>Answer symptom questions honestly for accurate diagnosis</li>
              <li>Regular health checks help monitor your pet's condition</li>
              <li>Always consult a veterinarian for serious health concerns</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>⚠️ This tool is for informational purposes only. Always consult a licensed veterinarian.</p>
      </footer>
    </div>
  )
}

export default Dashboard
