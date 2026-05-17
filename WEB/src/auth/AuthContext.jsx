import { useEffect, useMemo, useState } from 'react'
import { authApi, tokenStorage } from '../api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const restoreSession = async () => {
      const tokens = tokenStorage.get()
      if (!tokens?.accessToken) {
        setLoading(false)
        return
      }

      try {
        const data = await authApi.profile()
        if (mounted) {
          setUser(data.user)
        }
      } catch {
        tokenStorage.clear()
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      mounted = false
    }
  }, [])

  const login = async (credentials) => {
    const data = await authApi.login(credentials)
    tokenStorage.set(data.tokens)
    setUser(data.user)
    return data.user
  }

  const signup = async (payload) => {
    const data = await authApi.register(payload)
    tokenStorage.set(data.tokens)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      tokenStorage.clear()
      setUser(null)
    }
  }

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    logout
  }), [user, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
