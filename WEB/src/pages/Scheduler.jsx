import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarPlus,
  Check,
  CheckCircle,
  Clock3,
  RotateCcw,
  ShieldPlus,
  SkipForward,
  Utensils
} from 'lucide-react'
import { careApi } from '../api'
import { usePets } from '../context/usePets'
import './Platform.css'

const statusLabel = {
  pending: 'Pending',
  overdue: 'Overdue',
  snoozed: 'Snoozed',
  completed: 'Done',
  skipped: 'Skipped'
}

const dateKey = (date) => {
  const value = new Date(date)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fiveDayWindow = () => Array.from({ length: 5 }, (_, index) => {
  const day = new Date()
  day.setDate(day.getDate() + index)
  day.setHours(0, 0, 0, 0)
  return day
})

const formatTime = (value) => new Date(value).toLocaleTimeString([], {
  hour: '2-digit',
  minute: '2-digit'
})

const getEffectiveDate = (reminder) => new Date(reminder.snoozed_until || reminder.due_at)

const addMinutesFromReminder = (reminder, minutes) => {
  const base = getEffectiveDate(reminder)
  base.setMinutes(base.getMinutes() + minutes)
  return base.toISOString()
}

const moveReminderToTomorrow = (reminder) => {
  const base = getEffectiveDate(reminder)
  base.setDate(base.getDate() + 1)
  return base.toISOString()
}

function Scheduler() {
  const { selectedPet, pets } = usePets()
  const [reminders, setReminders] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [reminderData, templateData] = await Promise.all([
      careApi.listReminders(selectedPet?.id),
      careApi.listScheduleTemplates(selectedPet?.id)
    ])
    setReminders(reminderData.reminders || [])
    setTemplates(templateData.templates || [])
  }, [selectedPet?.id])

  useEffect(() => {
    queueMicrotask(() => {
      load().catch((err) => setError(err.message || 'Could not load schedule.'))
    })
  }, [load])

  const days = useMemo(() => fiveDayWindow(), [])

  const feedingDays = useMemo(() => {
    const grouped = new Map(days.map((day) => [dateKey(day), []]))

    reminders
      .filter((reminder) => reminder.type === 'feeding')
      .forEach((reminder) => {
        const due = getEffectiveDate(reminder)
        const key = dateKey(due)
        if (grouped.has(key)) grouped.get(key).push(reminder)
      })

    return days.map((day) => ({
      date: day,
      meals: grouped.get(dateKey(day)).sort((a, b) => (
        getEffectiveDate(a) - getEffectiveDate(b)
      ))
    }))
  }, [days, reminders])

  const vaccineSchedule = useMemo(() => reminders
    .filter((reminder) => reminder.type === 'vaccine')
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
    .slice(0, 6), [reminders])

  const otherTasks = useMemo(() => reminders
    .filter((reminder) => !['feeding', 'vaccine'].includes(reminder.type))
    .filter((reminder) => !['completed', 'skipped'].includes(reminder.status))
    .sort((a, b) => getEffectiveDate(a) - getEffectiveDate(b))
    .slice(0, 8), [reminders])

  const history = useMemo(() => reminders
    .filter((reminder) => ['completed', 'skipped', 'snoozed'].includes(reminder.status))
    .sort((a, b) => (
      new Date(b.completed_at || b.skipped_at || b.snoozed_until || b.due_at) -
      new Date(a.completed_at || a.skipped_at || a.snoozed_until || a.due_at)
    ))
    .slice(0, 10), [reminders])

  const stats = useMemo(() => ({
    meals: feedingDays.reduce((count, day) => count + day.meals.length, 0),
    vaccines: vaccineSchedule.length,
    overdue: reminders.filter((reminder) => reminder.status === 'overdue').length,
    rules: templates.filter((template) => template.is_active).length
  }), [feedingDays, reminders, templates, vaccineSchedule.length])

  const generate = async () => {
    if (!selectedPet) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const data = await careApi.generateSchedule(selectedPet.id)
      await load()
      setNotice(`Plan refreshed: ${data.templates?.length || 0} rules and ${data.reminders?.length || 0} scheduled tasks.`)
    } catch (err) {
      setError(err.message || 'Could not generate the care plan.')
    } finally {
      setLoading(false)
    }
  }

  const runAction = async (id, payload) => {
    setError('')
    setNotice('')
    try {
      await careApi.updateReminder(id, payload)
      await load()
    } catch (err) {
      setError(err.message || 'Could not update this reminder.')
    }
  }

  const actionButtons = (reminder, compact = false) => (
    ['completed', 'skipped'].includes(reminder.status) ? (
      <span className="locked-status">{statusLabel[reminder.status]}</span>
    ) : (
      <div className={compact ? 'planner-actions compact' : 'planner-actions'}>
        <button type="button" title="Complete" onClick={() => runAction(reminder.id, { action: 'complete' })}><Check /></button>
        <button type="button" title="Snooze 2 hours" onClick={() => runAction(reminder.id, { action: 'snooze', snoozedUntil: addMinutesFromReminder(reminder, 120) })}><Clock3 /></button>
        <button type="button" title="Move to tomorrow" onClick={() => runAction(reminder.id, { action: 'reschedule', dueAt: moveReminderToTomorrow(reminder) })}><RotateCcw /></button>
        <button type="button" title="Skip" onClick={() => runAction(reminder.id, { action: 'skip' })}><SkipForward /></button>
      </div>
    )
  )

  return (
    <main className="platform-page scheduler-page">
      <section className="scheduler-hero">
        <div>
          <p className="eyebrow">Care planner</p>
          <h1>{selectedPet ? `${selectedPet.name}'s schedule` : 'Pet care schedule'}</h1>
          <p>Five-day feeding plan, vaccine timeline, and recurring care tasks in one clean workspace.</p>
        </div>
        <button className="primary-action" type="button" disabled={!selectedPet || loading} onClick={generate}>
          <CalendarPlus /> {loading ? 'Refreshing...' : 'Generate plan'}
        </button>
      </section>

      {error && <div className="inline-error scheduler-alert">{error}</div>}
      {notice && <div className="success-note scheduler-alert">{notice}</div>}

      <section className="scheduler-stats">
        <article><Utensils /><strong>{stats.meals}</strong><span>Meals / 5 days</span></article>
        <article><ShieldPlus /><strong>{stats.vaccines}</strong><span>Vaccines</span></article>
        <article><Clock3 /><strong>{stats.overdue}</strong><span>Overdue</span></article>
        <article><CheckCircle /><strong>{stats.rules}</strong><span>Active rules</span></article>
      </section>

      <section className="planner-grid">
        <div className="planner-panel feeding-panel">
          <div className="planner-panel-header">
            <div>
              <p className="eyebrow">Feeding</p>
              <h2>Next 5 days</h2>
            </div>
            <span>{selectedPet ? selectedPet.name : `${pets.length} pets`}</span>
          </div>

          <div className="feeding-agenda">
            {feedingDays.map((day, index) => (
              <article className="feeding-day" key={dateKey(day.date)}>
                <div className="day-stamp">
                  <strong>{index === 0 ? 'Today' : day.date.toLocaleDateString([], { weekday: 'short' })}</strong>
                  <span>{day.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="meal-stack">
                  {day.meals.length ? day.meals.map((meal) => (
                    <div className={`meal-item state-${meal.status}`} key={meal.id}>
                      <div>
                        <strong>{formatTime(getEffectiveDate(meal))}</strong>
                        <span>{statusLabel[meal.status] || meal.status}</span>
                      </div>
                      {actionButtons(meal, true)}
                    </div>
                  )) : <p>No meals scheduled</p>}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="planner-panel">
          <div className="planner-panel-header">
            <div>
              <p className="eyebrow">Vaccines</p>
              <h2>Timeline</h2>
            </div>
          </div>

          <div className="vaccine-timeline">
            {vaccineSchedule.length ? vaccineSchedule.map((vaccine) => (
              <article className={`vaccine-task state-${vaccine.status}`} key={vaccine.id}>
                <div className="timeline-dot" />
                <div>
                  <strong>{vaccine.title}</strong>
                  <p>{new Date(vaccine.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <span>{statusLabel[vaccine.status] || vaccine.status}</span>
                </div>
                {actionButtons(vaccine)}
              </article>
            )) : (
              <div className="planner-empty">
                <ShieldPlus />
                <strong>No vaccine schedule yet</strong>
                <p>Generate the plan to create vaccine tasks from species, age, and history.</p>
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="planner-grid lower-grid">
        <div className="planner-panel">
          <div className="planner-panel-header">
            <div>
              <p className="eyebrow">Care tasks</p>
              <h2>Next actions</h2>
            </div>
          </div>

          <div className="task-list-clean">
            {otherTasks.length ? otherTasks.map((task) => (
              <article className={`task-row-clean state-${task.status}`} key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.type} · {getEffectiveDate(task).toLocaleString()}</p>
                </div>
                <span>{statusLabel[task.status] || task.status}</span>
                {actionButtons(task)}
              </article>
            )) : (
              <div className="planner-empty compact">
                <CheckCircle />
                <strong>No open secondary tasks</strong>
                <p>Grooming, medication, flea/tick, and appointment tasks appear here.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="planner-panel">
          <div className="planner-panel-header">
            <div>
              <p className="eyebrow">Rules</p>
              <h2>Recurring setup</h2>
            </div>
          </div>
          <div className="rules-list-clean">
            {templates.map((template) => (
              <article key={template.id}>
                <strong>{template.title}</strong>
                <p>{template.type} · {template.recurrence_rule?.frequency || 'none'} · {(template.preferred_times || []).join(', ') || 'No fixed time'}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="planner-panel history-panel">
        <div className="planner-panel-header">
          <div>
            <p className="eyebrow">History</p>
            <h2>Recent schedule activity</h2>
          </div>
        </div>
        <div className="history-list-clean">
          {history.length ? history.map((item) => (
            <article className={`history-row state-${item.status}`} key={`history-${item.id}`}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.type} · {getEffectiveDate(item).toLocaleString()}</p>
              </div>
              <span>{statusLabel[item.status] || item.status}</span>
            </article>
          )) : (
            <div className="planner-empty compact">
              <CheckCircle />
              <strong>No completed care yet</strong>
              <p>Completed, skipped, and snoozed tasks will appear here.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default Scheduler
