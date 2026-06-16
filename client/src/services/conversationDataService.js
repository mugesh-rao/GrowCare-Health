import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const BATCH_LIMIT = 450

function currentUid() {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Please sign in again before deleting a conversation.')
  return uid
}

async function commitDeletes(refs) {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}

const conversationDataService = {
  async deleteConversation(phone) {
    const uid = currentUid()
    const contactRef = doc(db, 'users', uid, 'contacts', phone)
    const notesRef = collection(db, 'users', uid, 'contacts', phone, 'notes')
    const messagesRef = collection(db, 'users', uid, 'messages')

    const [notesSnap, messagesSnap] = await Promise.all([
      getDocs(notesRef),
      getDocs(query(messagesRef, where('contactId', '==', phone))),
    ])

    const refs = [
      ...notesSnap.docs.map((snap) => snap.ref),
      ...messagesSnap.docs.map((snap) => snap.ref),
    ]

    await commitDeletes(refs)
    await deleteDoc(contactRef)
  },
}

export default conversationDataService
