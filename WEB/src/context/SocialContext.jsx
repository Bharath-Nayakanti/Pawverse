import { useCallback, useEffect, useMemo, useState } from 'react'
import { socialApi } from '../api'
import { SocialContext } from './social-context'

export function SocialProvider({ children }) {
  const [location, setLocation] = useState(null)
  const [nearbyUsers, setNearbyUsers] = useState([])
  const [nearbyPets, setNearbyPets] = useState([])
  const [connections, setConnections] = useState([])
  const [conversations, setConversations] = useState([])
  const [meetups, setMeetups] = useState([])
  const [groups, setGroups] = useState([])
  const [lostPetAlerts, setLostPetAlerts] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const refreshSummary = useCallback(async () => {
    const data = await socialApi.summary()
    setSummary(data.summary)
  }, [])

  const refreshNearby = useCallback(async (filters = {}) => {
    setLoading(true)
    try {
      const data = await socialApi.nearby(filters)
      setNearbyUsers(data.profiles || [])
      setNearbyPets(data.pets || [])
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshSocialLists = useCallback(async () => {
    const [connectionData, conversationData, meetupData, groupData, alertData] = await Promise.all([
      socialApi.listConnections(),
      socialApi.conversations(),
      socialApi.meetups(),
      socialApi.groups(),
      socialApi.lostPets()
    ])
    setConnections(connectionData.connections || [])
    setConversations(conversationData.conversations || [])
    setMeetups(meetupData.meetups || [])
    setGroups(groupData.groups || [])
    setLostPetAlerts(alertData.alerts || [])
  }, [])

  const saveLocation = useCallback(async (payload) => {
    const data = await socialApi.saveLocation(payload)
    setLocation(data.location)
    await refreshNearby()
    return data.location
  }, [refreshNearby])

  useEffect(() => {
    let mounted = true
    Promise.all([
      socialApi.getLocation().catch(() => ({ location: null })),
      socialApi.summary().catch(() => ({ summary: null }))
    ]).then(([locationData, summaryData]) => {
      if (!mounted) return
      setLocation(locationData.location)
      setSummary(summaryData.summary)
    })
    return () => {
      mounted = false
    }
  }, [])

  const value = useMemo(() => ({
    connections,
    conversations,
    groups,
    loading,
    location,
    lostPetAlerts,
    meetups,
    nearbyPets,
    nearbyUsers,
    refreshNearby,
    refreshSocialLists,
    refreshSummary,
    saveLocation,
    setConversations,
    setConnections,
    setGroups,
    setLostPetAlerts,
    setMeetups,
    summary
  }), [
    connections,
    conversations,
    groups,
    loading,
    location,
    lostPetAlerts,
    meetups,
    nearbyPets,
    nearbyUsers,
    refreshNearby,
    refreshSocialLists,
    refreshSummary,
    saveLocation,
    summary
  ])

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
}
