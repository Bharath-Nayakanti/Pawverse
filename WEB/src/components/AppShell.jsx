import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarDays, ClipboardList, HeartPulse, HelpCircle, LayoutDashboard, LogOut, MapPin, MessageCircle, PawPrint, Users, UserPlus } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { usePets } from '../context/usePets'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scheduler', label: 'Scheduler', icon: CalendarDays },
  { to: '/records', label: 'Records', icon: ClipboardList },
  { to: '/health-analysis', label: 'AI Health', icon: HeartPulse },
  { to: '/qanda', label: 'Pet Q&A', icon: HelpCircle },
  { to: '/nearby', label: 'Nearby', icon: MapPin },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/emergency', label: 'Emergency', icon: AlertTriangle }
]

function AppShell() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { pets, selectedPetId, setSelectedPetId } = usePets()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="care-shell">
      <aside className="care-sidebar">
        <Link className="care-brand" to="/dashboard">
          <span><PawPrint /></span>
          <strong>PawVerse</strong>
        </Link>

        <nav className="care-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `care-nav-link ${isActive ? 'active' : ''}`}>
                <Icon />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="pet-switcher">
          <label htmlFor="pet-switch">Active pet</label>
          <select id="pet-switch" value={selectedPetId || ''} onChange={(event) => setSelectedPetId(event.target.value)}>
            <option value="">All pets</option>
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>{pet.name}</option>
            ))}
          </select>
          <Link to="/onboarding" className="small-action"><UserPlus /> Add pet</Link>
        </div>

        <button className="sidebar-logout" type="button" onClick={handleLogout}>
          <LogOut /> Logout
        </button>
      </aside>

      <div className="care-content">
        <header className="care-topbar">
          <div>
            <p>Signed in as</p>
            <strong>{user?.firstName} {user?.lastName}</strong>
          </div>
          <Link className="topbar-action" to="/onboarding">Add Pet</Link>
        </header>
        <Outlet />
      </div>
    </div>
  )
}

export default AppShell
