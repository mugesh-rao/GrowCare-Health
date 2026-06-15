import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const config = {
  apiKey: 'AIzaSyC0RdU2rIDOYEbpkh0bqhfjtyWicoODOsw',
  authDomain: 'nirai-designer.firebaseapp.com',
  projectId: 'nirai-designer',
  storageBucket: 'nirai-designer.firebasestorage.app',
  messagingSenderId: '879499091795',
  appId: '1:879499091795:web:19d9c754ee25244922cba6',
}

export const firebaseEnabled = true

export const app = initializeApp(config)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export async function getIdToken() {
  if (!auth?.currentUser) return null
  return auth.currentUser.getIdToken()
}