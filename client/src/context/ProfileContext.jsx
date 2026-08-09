import { createContext, useContext, useEffect, useState } from 'react'
import userService from '../services/userService'

const ProfileContext = createContext(null)

/** Application profile state. There is no sign-in or authentication flow. */
export function ProfileProvider({ children }) {
  const [user, setUser] = useState(null)

  const refreshProfile = async () => {
    const profile = await userService.me()
    setUser(profile)
    return profile
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshProfile().catch(() => {})
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ProfileContext.Provider value={{ user, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) throw new Error('useProfile must be used within a ProfileProvider')
  return context
}
