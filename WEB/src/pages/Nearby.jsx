import { useEffect, useState } from 'react'
import { Bell, CheckCircle, Eye, EyeOff, Inbox, MapPin, Navigation, Shield } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { socialApi } from '../api'
import FiltersPanel from '../components/social/FiltersPanel'
import MapView from '../components/social/MapView'
import NearbyPetCard from '../components/social/NearbyPetCard'
import UserProfileCard from '../components/social/UserProfileCard'
import MeetupCard from '../components/social/MeetupCard'
import { useSocial } from '../context/useSocial'
import './Platform.css'

function Nearby() {
  const navigate = useNavigate()
  const { connections, location, nearbyPets, nearbyUsers, meetups, refreshNearby, refreshSocialLists, saveLocation } = useSocial()
  const [filters, setFilters] = useState({ radiusKm: 10 })
  const [places, setPlaces] = useState([])
  const [manualArea, setManualArea] = useState(null)
  const [visibilityMode, setVisibilityMode] = useState('')
  const [error, setError] = useState('')
  const [locationStatus, setLocationStatus] = useState('idle')
  const [locationNotice, setLocationNotice] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [lastSearch, setLastSearch] = useState(null)
  const [needsLocation, setNeedsLocation] = useState(false)
  const [actionNotice, setActionNotice] = useState('')

  const currentArea = manualArea ?? location?.areaLabel ?? ''
  const currentVisibilityMode = visibilityMode || location?.visibilityMode || 'nearby'
  const hasSearchableLocation = Boolean(location?.locationUpdatedAt && location?.isVisible && location?.visibilityMode !== 'invisible')
  const locationUpdatedLabel = location?.locationUpdatedAt
    ? new Date(location.locationUpdatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not saved yet'
  const incomingRequests = connections.filter((item) => item.status === 'pending' && item.direction === 'incoming')
  const outgoingRequests = connections.filter((item) => item.status === 'pending' && item.direction === 'outgoing')

  useEffect(() => {
    refreshNearby(filters).then((data) => {
      setPlaces(data.places || [])
      setNeedsLocation(Boolean(data.needsLocation))
    }).catch(() => {})
    refreshSocialLists().catch(() => {})
  }, [filters, refreshNearby, refreshSocialLists])

  const saveResolvedLocation = async (payload, successMessage) => {
    setLocationStatus('saving')
    setError('')
    try {
      await saveLocation(payload)
      const data = await refreshNearby(filters)
      setPlaces(data.places || [])
      setNeedsLocation(Boolean(data.needsLocation))
      setLocationStatus('saved')
      setLocationNotice(successMessage)
      setLastSearch({
        at: new Date(),
        owners: data.profiles?.length || 0,
        pets: data.pets?.length || 0,
        places: data.places?.length || 0
      })
    } catch (err) {
      setLocationStatus('error')
      setLocationNotice('')
      setError(err.message || 'Location was detected, but PawVerse could not save it.')
    }
  }

  const requestBrowserLocation = async () => {
    if (!navigator.geolocation) {
      setError('Location permission is not available in this browser.')
      return
    }
    setLocationStatus('requesting')
    setLocationNotice('Waiting for browser location permission...')
    navigator.geolocation.getCurrentPosition(async (position) => {
      await saveResolvedLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        areaLabel: currentArea || 'Current area',
        visibilityMode: currentVisibilityMode,
        visibilityRadiusKm: filters.radiusKm,
        isVisible: true,
        petsVisible: true,
        messagesAllowed: true,
        connectionRequestsAllowed: true
      }, 'Location saved. Nearby discovery is using your approximate current area.')
    }, (locationError) => {
      setLocationStatus('error')
      setLocationNotice('')
      setError(locationError.code === 1
        ? 'Location permission was not granted. You can still use manual area mode.'
        : 'Could not read your device location. Try again or use manual area mode.')
    }, {
      enableHighAccuracy: false,
      maximumAge: 5 * 60 * 1000,
      timeout: 12000
    })
  }

  const saveManualLocation = async () => {
    await saveResolvedLocation({
      latitude: 19.076,
      longitude: 72.8777,
      areaLabel: currentArea || 'Manual nearby area',
      visibilityMode: 'hidden_location',
      visibilityRadiusKm: filters.radiusKm,
      isVisible: true,
      petsVisible: true,
      messagesAllowed: true,
      connectionRequestsAllowed: true,
      manualLocation: true
    }, 'Manual area saved in hidden-location mode.')
  }

  const sendConnection = async (userId) => {
    if (!userId) return
    setError('')
    try {
      await socialApi.requestConnection(userId)
      await applyFilters()
      await refreshSocialLists()
      setActionNotice('Connection notification sent. Chat unlocks only after they accept.')
    } catch (err) {
      setError(err.message || 'Could not send connection request.')
    }
  }

  const openChat = (userId) => {
    if (!userId) return
    navigate('/messages')
  }

  const reportUser = async (userId) => {
    await socialApi.reportUser({ reportedUserId: userId, reason: 'Safety review requested' })
  }

  const blockUser = async (userId) => {
    await socialApi.blockUser({ blockedUserId: userId, reason: 'User blocked from nearby discovery' })
    await refreshNearby(filters)
  }

  const applyFilters = async () => {
    setIsSearching(true)
    setError('')
    try {
      const data = await refreshNearby(filters)
      setPlaces(data.places || [])
      setNeedsLocation(Boolean(data.needsLocation))
      setLastSearch({
        at: new Date(),
        owners: data.profiles?.length || 0,
        pets: data.pets?.length || 0,
        places: data.places?.length || 0
      })
      if (data.needsLocation) {
        setError(data.message || 'Save a visible approximate area before searching nearby.')
      }
    } catch (err) {
      setError(err.message || 'Nearby search failed.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <main className="platform-page social-page">
      <section className="hero-band social-hero">
        <div>
          <p className="eyebrow">Local pet community</p>
          <h1>Discover nearby pets without exposing exact homes.</h1>
          <p>Find compatible owners, pet parks, clinics, meetups, and lost-pet alerts with privacy controls on every interaction.</p>
        </div>
        <button className="primary-action" type="button" onClick={requestBrowserLocation}><Navigation /> Use current area</button>
      </section>

      <section className="privacy-settings care-card">
        <div>
          <h2><Shield /> Visibility controls</h2>
          <p>Current mode: <strong>{location?.visibilityMode || 'not configured'}</strong>. The app shares approximate distance only.</p>
          <div className="location-status-grid">
            <span><CheckCircle /> Saved area: <strong>{location?.areaLabel || 'None'}</strong></span>
            <span><MapPin /> Last update: <strong>{locationUpdatedLabel}</strong></span>
            <span><Eye /> Visibility radius: <strong>{location?.visibilityRadiusKm || filters.radiusKm} km</strong></span>
          </div>
        </div>
        <label>
          Manual area
          <input value={currentArea} onChange={(event) => setManualArea(event.target.value)} placeholder="Bandra West, Mumbai" />
        </label>
        <label>
          Visibility
          <select value={currentVisibilityMode} onChange={(event) => setVisibilityMode(event.target.value)}>
            <option value="nearby">Nearby visible</option>
            <option value="pet_only">Pet-only visible</option>
            <option value="friends_only">Friends only</option>
            <option value="hidden_location">Hidden location</option>
            <option value="invisible">Invisible</option>
          </select>
        </label>
        <button className="secondary-action" type="button" onClick={saveManualLocation}><EyeOff /> Save hidden-location mode</button>
        {locationStatus !== 'idle' && locationStatus !== 'error' && (
          <p className={`location-status ${locationStatus}`}>{locationNotice || `Location status: ${locationStatus}`}</p>
        )}
        {actionNotice && <p className="location-status saved">{actionNotice}</p>}
        {error && <p className="inline-error">{error}</p>}
      </section>

      <div className="social-layout">
        <FiltersPanel
          disabled={!hasSearchableLocation}
          filters={filters}
          isSearching={isSearching}
          lastSearchLabel={lastSearch ? `Last search: ${lastSearch.owners} owners, ${lastSearch.pets} pets, ${lastSearch.places} places` : ''}
          onChange={setFilters}
          onApply={applyFilters}
        />
        <div className="social-main">
          <MapView hasLocation={hasSearchableLocation} profiles={nearbyUsers} places={places} meetups={meetups} />

          <section className="connection-notice-card care-card">
            <div>
              <h2><Inbox /> Connection Notifications</h2>
              <p>Requests stay pending until accepted. Chat never opens from discovery alone.</p>
            </div>
            <div className="notice-row">
              <span><strong>{incomingRequests.length}</strong> received</span>
              <span><strong>{outgoingRequests.length}</strong> sent</span>
              <Link className="secondary-action" to="/connections">Review</Link>
            </div>
          </section>

          <section className="search-status-card care-card">
            <strong>{hasSearchableLocation ? 'Nearby search is ready' : 'Nearby search needs a saved area'}</strong>
            <p>
              {needsLocation
                ? 'No pins or places are shown until PawVerse has your saved approximate area.'
                : lastSearch
                  ? `Showing results from ${lastSearch.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                  : 'Use filters, then press Search Nearby to refresh results.'}
            </p>
          </section>

          <section>
            <div className="section-title">
              <h2>Nearby Owners</h2>
              <span className="privacy-badge"><MapPin /> Approximate distance</span>
            </div>
            <div className="social-grid">
              {nearbyUsers.map((profile) => (
                <UserProfileCard key={profile.userId} profile={profile} onConnect={sendConnection} onMessage={openChat} onReport={reportUser} onBlock={blockUser} />
              ))}
              {!nearbyUsers.length && <div className="care-card">Set your nearby visibility to discover pet owners around you.</div>}
            </div>
          </section>

          <section>
            <div className="section-title"><h2>Nearby Pets</h2></div>
            <div className="social-grid">
              {nearbyPets.map((pet) => <NearbyPetCard key={pet.id} pet={pet} />)}
            </div>
          </section>

          <section className="nearby-sections">
            <article className="care-card">
              <h2>Upcoming Meetups</h2>
              <div className="stack-list">
                {meetups.slice(0, 3).map((meetup) => <MeetupCard key={meetup.id} meetup={meetup} />)}
                {!meetups.length && <p>No nearby meetups yet.</p>}
              </div>
            </article>
            {['Pet Parks', 'Pet Clinics', 'Pet Shops'].map((title, index) => (
              <article className="care-card" key={title}>
                <h2>{title}</h2>
                <div className="stack-list">
                  {places.filter((place) => place.type === ['park', 'clinic', 'shop'][index]).map((place) => (
                    <p key={place.id}><Bell /> {place.title} · {place.approximateDistance}</p>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  )
}

export default Nearby
