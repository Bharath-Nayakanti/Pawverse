import { useCallback, useEffect, useState } from 'react'
import { FilePlus, Stethoscope } from 'lucide-react'
import { careApi } from '../api'
import { usePets } from '../context/usePets'
import './Platform.css'

function Records() {
  const { selectedPet } = usePets()
  const [records, setRecords] = useState([])
  const [title, setTitle] = useState('')

  const load = useCallback(async () => {
    const data = await careApi.listHealthRecords(selectedPet?.id)
    setRecords(data.records || [])
  }, [selectedPet?.id])

  useEffect(() => {
    queueMicrotask(() => {
      load().catch(() => {})
    })
  }, [load])

  const addRecord = async () => {
    if (!selectedPet || !title) return
    await careApi.createHealthRecord({
      petId: selectedPet.id,
      type: 'vet_visit',
      title,
      description: 'Added from PawVerse records dashboard.',
      occurredAt: new Date().toISOString(),
      severity: 'low',
      metadata: {}
    })
    setTitle('')
    await load()
  }

  return (
    <main className="platform-page">
      <section className="page-heading">
        <p className="eyebrow">Health records</p>
        <h1>Medical history and uploaded report hub</h1>
        <p>Track diagnoses, symptoms, treatments, surgeries, prescriptions, vet visits, reports, and medical images.</p>
      </section>

      <section className="care-card record-create">
        <Stethoscope />
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add vet visit, prescription, report, or symptom note" />
        <button className="primary-action" type="button" onClick={addRecord}><FilePlus /> Save record</button>
      </section>

      <section className="timeline">
        {records.map((record) => (
          <article key={record.id}>
            <span>{record.type}</span>
            <strong>{record.title}</strong>
            <p>{record.description}</p>
            <time>{new Date(record.occurred_at).toLocaleDateString()}</time>
          </article>
        ))}
      </section>
    </main>
  )
}

export default Records
