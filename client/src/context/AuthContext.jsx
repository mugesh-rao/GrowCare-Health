import { createContext, useContext, useEffect, useState } from 'react'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider, firebaseEnabled } from '../lib/firebase'
import userService from '../services/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // server profile (has onboardingCompleted)
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadProfile = async () => {
    const profile = await userService.me()
    setUser(profile)
    return profile
  }

  // Firebase mode: react to auth state. Dev mode: restore local flag.
  useEffect(() => {
    if (firebaseEnabled) {
      const unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          setAuthed(true)
          try {
            await loadProfile()
          } catch {
            /* profile will be created on next call */
          }
        } else {
          setAuthed(false)
          setUser(null)
        }
        setLoading(false)
      })
      return unsub
    }

    // Dev mode
    if (localStorage.getItem('wa_dev_authed') === '1') {
      setAuthed(true)
      loadProfile()
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const loginWithGoogle = async () => {
    if (firebaseEnabled) {
      await signInWithPopup(auth, googleProvider)
      // onAuthStateChanged handles the rest.
    } else {
      localStorage.setItem('wa_dev_authed', '1')
      localStorage.setItem('wa_dev_uid', 'dev-user')
      setAuthed(true)
      await loadProfile()
    }
  }

  const logout = async () => {
    if (firebaseEnabled) await signOut(auth)
    else localStorage.removeItem('wa_dev_authed')
    setAuthed(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: authed,
        onboardingCompleted: !!user?.onboardingCompleted,
        loginWithGoogle,
        logout,
        refreshProfile: loadProfile,
        firebaseEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
