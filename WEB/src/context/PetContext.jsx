import { useCallback, useEffect, useMemo, useState } from 'react'
import { careApi } from '../api'
import { useAuth } from '../auth/useAuth'
import { PetContext } from './pet-context'

export function PetProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const [pets, setPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadPets = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError('')
    try {
      const data = await careApi.listPets()
      setPets(data.pets || [])
      setSelectedPetId((current) => current || data.pets?.[0]?.id || null)
    } catch (err) {
      setError(err.message || 'Failed to load pets')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    queueMicrotask(loadPets)
  }, [loadPets, user?.id])

  const selectedPet = pets.find((pet) => pet.id === selectedPetId) || pets[0] || null

  const value = useMemo(() => ({
    pets,
    selectedPet,
    selectedPetId: selectedPet?.id || selectedPetId,
    setSelectedPetId,
    loading,
    error,
    refreshPets: loadPets,
    setPets
  }), [pets, selectedPet, selectedPetId, loading, error, loadPets])

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>
}
