import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './auth/AuthContext'
import { PetProvider } from './context/PetContext'
import { SocialProvider } from './context/SocialContext'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Emergency from './pages/Emergency'
import HealthAnalysis from './pages/HealthAnalysis'
import Community from './pages/Community'
import Connections from './pages/Connections'
import LostPets from './pages/LostPets'
import Meetups from './pages/Meetups'
import Messages from './pages/Messages'
import Nearby from './pages/Nearby'
import Onboarding from './pages/Onboarding'
import PetProfile from './pages/PetProfile'
import AskQuestion from './pages/AskQuestion'
import QandaFeed from './pages/QandaFeed'
import QandaModeration from './pages/QandaModeration'
import QandaNearby from './pages/QandaNearby'
import QandaNotifications from './pages/QandaNotifications'
import QandaSaved from './pages/QandaSaved'
import QuestionDetail from './pages/QuestionDetail'
import Records from './pages/Records'
import Scheduler from './pages/Scheduler'
import Welcome from './pages/Welcome'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<PetProvider><SocialProvider><AppShell /></SocialProvider></PetProvider>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pets/:petId" element={<PetProfile />} />
              <Route path="/scheduler" element={<Scheduler />} />
              <Route path="/records" element={<Records />} />
              <Route path="/health-analysis" element={<HealthAnalysis />} />
              <Route path="/emergency" element={<Emergency />} />
              <Route path="/qanda" element={<QandaFeed />} />
              <Route path="/qanda/ask" element={<AskQuestion />} />
              <Route path="/qanda/questions/:id" element={<QuestionDetail />} />
              <Route path="/qanda/saved" element={<QandaSaved />} />
              <Route path="/qanda/notifications" element={<QandaNotifications />} />
              <Route path="/qanda/nearby" element={<QandaNearby />} />
              <Route path="/qanda/moderation" element={<QandaModeration />} />
              <Route path="/nearby" element={<Nearby />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/community" element={<Community />} />
              <Route path="/meetups" element={<Meetups />} />
              <Route path="/lost-pets" element={<LostPets />} />
              <Route path="/connections" element={<Connections />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
