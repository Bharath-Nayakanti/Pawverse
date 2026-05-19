import { useEffect, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { socialApi } from '../api'
import GroupCard from '../components/social/GroupCard'
import { useSocial } from '../context/useSocial'
import './Platform.css'

const normalizeGroup = (group) => ({
  id: group.id,
  title: group.title,
  description: group.description,
  location: group.location,
  category: group.category,
  visibility: group.visibility,
  createdBy: group.createdBy || group.created_by,
  createdAt: group.createdAt || group.created_at,
  memberCount: group.memberCount ?? group.member_count ?? 1,
  isMember: group.isMember ?? group.is_member ?? true
})

function Community() {
  const { groups, setGroups } = useSocial()
  const [form, setForm] = useState({ title: '', description: '', location: '', category: 'community', visibility: 'public' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let mounted = true
    socialApi.groups()
      .then((data) => {
        if (mounted) setGroups(data.groups || [])
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Could not load groups.')
      })

    return () => {
      mounted = false
    }
  }, [setGroups])

  const createGroup = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      const created = await socialApi.createGroup(form)
      const group = normalizeGroup(created.group)
      setGroups((current) => [group, ...current.filter((item) => item.id !== group.id)])
      setForm({ title: '', description: '', location: '', category: 'community', visibility: 'public' })
      setNotice('Group created.')

      const latest = await socialApi.groups()
      setGroups(latest.groups || [group])
    } catch (err) {
      setError(err.message || 'Could not create group.')
    } finally {
      setSubmitting(false)
    }
  }

  const joinGroup = async (id) => {
    setError('')
    try {
      await socialApi.joinGroup(id)
      const latest = await socialApi.groups()
      setGroups(latest.groups || [])
    } catch (err) {
      setError(err.message || 'Could not join group.')
    }
  }

  return (
    <main className="platform-page social-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Local pet communities</p>
          <h1>Community Groups</h1>
          <p>Create breed groups, city groups, walking circles, adoption communities, and rescue networks.</p>
        </div>
      </section>

      <div className="social-layout two-column">
        <form className="care-card social-form" onSubmit={createGroup}>
          <h2><Users /> Create group</h2>
          {error && <div className="inline-error">{error}</div>}
          {notice && <div className="success-note">{notice}</div>}
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Mumbai Golden Retriever Owners" required />
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What is this group for?" />
          <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Approximate city or area" />
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="community">Community</option>
            <option value="breed">Breed</option>
            <option value="walking">Walking</option>
            <option value="adoption">Adoption</option>
            <option value="rescue">Rescue</option>
          </select>
          <button className="primary-action" type="submit" disabled={submitting}>
            <Plus /> {submitting ? 'Creating...' : 'Create group'}
          </button>
        </form>

        <section>
          <div className="section-title"><h2>Discover Groups</h2></div>
          <div className="social-grid">
            {groups.map((group) => <GroupCard key={group.id} group={group} onJoin={joinGroup} />)}
            {!groups.length && <div className="care-card">No groups yet. Create the first local pet community.</div>}
          </div>
        </section>
      </div>
    </main>
  )
}

export default Community
