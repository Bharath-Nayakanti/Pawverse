import { Info, MapPin, Navigation, Shield } from 'lucide-react'

function MapView({ hasLocation, profiles = [], places = [], meetups = [] }) {
  const dots = [
    ...profiles.slice(0, 8).map((item, index) => ({ key: item.userId, label: item.displayName, type: 'owner', top: 18 + (index * 19) % 58, left: 12 + (index * 23) % 70 })),
    ...places.slice(0, 4).map((item, index) => ({ key: item.id, label: item.title, type: item.type, top: 26 + (index * 17) % 50, left: 20 + (index * 29) % 64 })),
    ...meetups.slice(0, 3).map((item, index) => ({ key: item.id, label: item.title, type: 'meetup', top: 34 + (index * 15) % 42, left: 28 + (index * 31) % 54 }))
  ]

  return (
    <section className="map-view care-card">
      <div className="section-title compact">
        <div>
          <h2>Approximate Area View</h2>
          <p>This MVP view is static and privacy-fuzzed. It shows result categories, not exact GPS pins.</p>
        </div>
        <span className="privacy-badge"><Shield /> Private by design</span>
      </div>
      <div className="map-canvas" aria-label="Approximate nearby social map">
        <div className="map-ring one" />
        <div className="map-ring two" />
        {hasLocation ? (
          <>
            <div className="you-pin"><Navigation /> Your approximate area</div>
            {dots.map((dot) => (
              <button
                className={`map-dot ${dot.type}`}
                key={`${dot.type}-${dot.key}`}
                style={{ top: `${dot.top}%`, left: `${dot.left}%` }}
                type="button"
                title={dot.label}
              >
                <MapPin />
              </button>
            ))}
          </>
        ) : (
          <div className="map-empty">
            <Info />
            <strong>No area saved yet</strong>
            <span>Use current area or save manual hidden-location mode to run nearby search.</span>
          </div>
        )}
      </div>
      <div className="map-legend">
        <span><i className="legend-dot owner" /> Owners</span>
        <span><i className="legend-dot park" /> Parks</span>
        <span><i className="legend-dot clinic" /> Clinics</span>
        <span><i className="legend-dot shop" /> Shops</span>
        <span><i className="legend-dot meetup" /> Meetups</span>
      </div>
    </section>
  )
}

export default MapView
