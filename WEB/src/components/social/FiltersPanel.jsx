import { Search, SlidersHorizontal } from 'lucide-react'

function FiltersPanel({ disabled, filters, isSearching, lastSearchLabel, onChange, onApply }) {
  const setValue = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <aside className="care-card filters-panel">
      <h2><SlidersHorizontal /> Filters</h2>
      <label>
        Radius
        <input type="range" min="1" max="50" value={filters.radiusKm || 10} onChange={(event) => setValue('radiusKm', event.target.value)} />
        <span>{filters.radiusKm || 10} km</span>
      </label>
      <label>
        Species
        <select value={filters.species || ''} onChange={(event) => setValue('species', event.target.value)}>
          <option value="">Any</option>
          <option value="dog">Dogs</option>
          <option value="cat">Cats</option>
        </select>
      </label>
      <label>
        Breed
        <input value={filters.breed || ''} onChange={(event) => setValue('breed', event.target.value)} placeholder="Golden Retriever" />
      </label>
      <label>
        Activity
        <select value={filters.activityLevel || ''} onChange={(event) => setValue('activityLevel', event.target.value)}>
          <option value="">Any</option>
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
        </select>
      </label>
      <label>
        Age group
        <select value={filters.ageGroup || ''} onChange={(event) => setValue('ageGroup', event.target.value)}>
          <option value="">Any</option>
          <option value="young">Young</option>
          <option value="adult">Adult</option>
          <option value="senior">Senior</option>
        </select>
      </label>
      <button className="primary-action wide" type="button" onClick={onApply} disabled={disabled || isSearching}>
        <Search /> {isSearching ? 'Searching...' : 'Search Nearby'}
      </button>
      <p className="filter-help">{disabled ? 'Save an approximate area first.' : lastSearchLabel || 'Filters apply to the next nearby search.'}</p>
    </aside>
  )
}

export default FiltersPanel
