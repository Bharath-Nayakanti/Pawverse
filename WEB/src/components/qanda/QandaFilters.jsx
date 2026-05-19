const FEEDS = [
  ['personalized', 'Personalized'],
  ['trending', 'Trending'],
  ['newest', 'Newest'],
  ['answered', 'Most Answered'],
  ['unanswered', 'Unanswered'],
  ['nearby', 'Nearby']
]

const CATEGORIES = ['all', 'Health', 'Food', 'Grooming', 'Training', 'Adoption', 'Emergency', 'Nearby', 'Lost & Found']
const PET_TYPES = ['all', 'dog', 'cat', 'bird', 'fish', 'exotic', 'general']

function QandaFilters({ filters, onChange }) {
  const update = (patch) => onChange({ ...filters, ...patch, offset: 0 })

  return (
    <aside className="qa-filter-panel">
      <h2>Discover</h2>
      <div className="segmented-list">
        {FEEDS.map(([value, label]) => (
          <button key={value} type="button" className={filters.feed === value ? 'active' : ''} onClick={() => update({ feed: value })}>
            {label}
          </button>
        ))}
      </div>

      <label>
        Pet type
        <select value={filters.petType || 'all'} onChange={(event) => update({ petType: event.target.value })}>
          {PET_TYPES.map((type) => <option key={type} value={type}>{type === 'all' ? 'All pets' : type}</option>)}
        </select>
      </label>

      <label>
        Category
        <select value={filters.category || 'all'} onChange={(event) => update({ category: event.target.value })}>
          {CATEGORIES.map((category) => <option key={category} value={category}>{category === 'all' ? 'All topics' : category}</option>)}
        </select>
      </label>

      <label>
        Tag
        <input value={filters.tag || ''} onChange={(event) => update({ tag: event.target.value })} placeholder="rabies, grooming, kitten..." />
      </label>
    </aside>
  )
}

export default QandaFilters
