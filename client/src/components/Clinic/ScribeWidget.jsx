import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Mic, Minus, Square, X } from 'lucide-react'
import { clinicalApi } from '../../services/clinicalApi'
import AuroraMicVisual from './AuroraMicVisual'

const languages = [
  { label: 'Auto / mixed', value: 'auto' },
  { label: 'English', value: 'en-IN' },
  { label: 'Hindi / Hinglish', value: 'hi-IN' },
  { label: 'Tamil', value: 'ta-IN' },
]

function plainSummary(note, patient) {
  const medicines = (note.prescriptions || []).map((item) => `• ${item.drug} ${item.dose} — ${item.frequency}`).join('\n')
  return `Hi ${patient.name.split(' ')[0]}, here is your clinician-approved visit summary.\n\nAssessment: ${note.diagnosis}\n\nMedicines:\n${medicines || 'As discussed with your clinician.'}\n\nFollow-up: ${note.followUp}\n\nContact the clinic if symptoms worsen or you have questions.`
}

/** A persistent, route-independent ambient capture widget for the desktop shell. */
export default function ScribeWidget() {
  const recognitionRef = useRef(null)
  const saveTimerRef = useRef(null)
  const recordingRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [patients, setPatients] = useState([])
  const [patientId, setPatientId] = useState('')
  const [language, setLanguage] = useState('auto')
  const [consent, setConsent] = useState(false)
  const [session, setSession] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [draft, setDraft] = useState(null)
  const [status, setStatus] = useState('idle')
  const [notice, setNotice] = useState('')

  const activePatient = patients.find((patient) => patient.id === patientId)

  const loadPatients = () => clinicalApi.listPatients()
    .then((records) => setPatients(records))
    .catch((error) => setNotice(error.message))

  useEffect(() => { loadPatients() }, [])

  useEffect(() => {
    const startForPatient = (event) => {
      const patient = event.detail?.patient
      if (patient) {
        setPatients((current) => current.some((record) => record.id === patient.id) ? current : [...current, patient])
        setPatientId(patient.id)
      }
      setOpen(true)
    }
    window.addEventListener('growcare:open-scribe', startForPatient)
    return () => window.removeEventListener('growcare:open-scribe', startForPatient)
  }, [])

  useEffect(() => () => {
    clearTimeout(saveTimerRef.current)
    recognitionRef.current?.stop?.()
  }, [])

  const saveTranscript = (next) => {
    if (!session || !patientId) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      clinicalApi.updateScribe(patientId, session.id, next).catch((error) => setNotice(`Transcript could not be saved: ${error.message}`))
    }, 700)
  }

  const appendTranscript = (addition) => {
    setTranscript((current) => {
      const next = `${current}${current ? ' ' : ''}${addition}`.trim()
      saveTranscript(next)
      return next
    })
  }

  const configureRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setNotice('Speech recognition is unavailable in this desktop WebView. You can still type or paste the consultation transcript.')
      return null
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language === 'auto' ? 'en-IN' : language
    recognition.onresult = (event) => {
      let finalText = ''
      let nextInterim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) finalText += result[0].transcript
        else nextInterim += result[0].transcript
      }
      if (finalText) appendTranscript(finalText)
      setInterim(nextInterim)
    }
    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') setNotice(`Microphone transcription: ${event.error}. You can continue by typing.`)
    }
    recognition.onend = () => {
      if (recordingRef.current) {
        try { recognition.start() } catch { /* Browser may still be stopping. */ }
      }
    }
    recognitionRef.current = recognition
    return recognition
  }

  const start = async () => {
    if (!patientId || !consent) {
      setNotice(!patientId ? 'Select the patient for this consultation.' : 'Confirm the patient’s consent before ambient capture.')
      return
    }
    try {
      setNotice('')
      const nextSession = await clinicalApi.startScribe(patientId, { language, consentConfirmed: consent })
      setSession(nextSession)
      setTranscript('')
      setDraft(null)
      setStatus('recording')
      recordingRef.current = true
      configureRecognition()?.start()
    } catch (error) {
      setNotice(error.message)
    }
  }

  const stop = async () => {
    if (!session) return
    clearTimeout(saveTimerRef.current)
    recordingRef.current = false
    recognitionRef.current?.stop?.()
    setStatus('generating')
    try {
      const finished = await clinicalApi.stopScribe(patientId, session.id, transcript)
      setSession(finished)
      setDraft(finished.draft)
      setStatus('review')
    } catch (error) {
      setNotice(error.message)
      setStatus('recording')
    }
  }

  const approve = async () => {
    if (!draft || !session || !activePatient) return
    setStatus('approving')
    try {
      await clinicalApi.approveScribe(patientId, session.id, { note: draft, summary: plainSummary(draft, activePatient), language })
      setStatus('approved')
      setNotice('Clinician-approved visit note and the queued patient summary are stored in local SQLite.')
      loadPatients()
      window.dispatchEvent(new CustomEvent('growcare:patient-updated', { detail: { patientId } }))
    } catch (error) {
      setNotice(error.message)
      setStatus('review')
    }
  }

  const reset = () => {
    recognitionRef.current?.stop?.()
    recordingRef.current = false
    clearTimeout(saveTimerRef.current)
    setSession(null); setTranscript(''); setInterim(''); setDraft(null); setStatus('idle'); setNotice(''); setConsent(false)
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(25rem,calc(100vw-2.5rem))]">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} title="Open local transcription widget" className="group relative ml-auto grid h-16 w-16 cursor-pointer place-items-center overflow-hidden rounded-full border border-brand-200 bg-brand-50 text-brand-800 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20">
          <AuroraMicVisual className="absolute inset-0 opacity-75" />
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white/80 backdrop-blur-sm"><Mic className="h-4 w-4" /></span>
          <span className="sr-only">Open local transcription widget</span>
        </button>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-2xl">
          <header className="flex items-center gap-3 bg-night-900 px-4 py-3 text-white">
            <span className={`grid h-8 w-8 place-items-center rounded-full ${status === 'recording' ? 'bg-red-500' : 'bg-brand-500'}`}><Mic className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><p className="font-display font-bold">ScribeAI</p><p className="text-[11px] text-slate-300">Local ambient consultation assistant</p></div>
            <button type="button" title="Minimise" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10"><Minus className="h-4 w-4" /></button>
            <button type="button" title="Close" onClick={() => { reset(); setOpen(false) }} className="rounded p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
          </header>
          <div className="space-y-3 p-4">
            {notice && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{notice}</p>}
            {status === 'idle' && <>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted">Patient
                <div className="relative mt-1"><select value={patientId} onChange={(event) => setPatientId(event.target.value)} className="input-base w-full appearance-none"><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.mrn}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted" /></div>
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted">Conversation language
                <select value={language} onChange={(event) => setLanguage(event.target.value)} className="input-base mt-1 w-full">{languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              </label>
              <label className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-xs leading-5 text-ink"><input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" className="mt-1" />I have obtained the patient’s consent to capture this consultation. The draft requires clinician review.</label>
              <button type="button" onClick={start} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700"><Mic className="h-4 w-4" /> Start ambient capture</button>
            </>}
            {status === 'recording' && <>
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />Listening in the background</div>
              <textarea value={transcript} onChange={(event) => { setTranscript(event.target.value); saveTranscript(event.target.value) }} rows={7} className="w-full resize-none rounded-xl border border-line bg-canvas p-3 text-sm leading-6 text-ink outline-none focus:border-brand-400" placeholder="Live transcript appears here. You can type clinical details if speech transcription is unavailable." />
              {interim && <p className="text-xs italic text-muted">{interim}</p>}
              <button type="button" onClick={stop} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 hover:bg-red-100"><Square className="h-4 w-4" /> Stop and prepare draft</button>
            </>}
            {status === 'generating' && <p className="rounded-xl bg-brand-50 px-3 py-6 text-center text-sm font-medium text-brand-800">Preparing a structured draft from the local transcript…</p>}
            {(status === 'review' || status === 'approving') && draft && <>
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">This is a draft, not an autonomous clinical decision. Check every field before approval.</p>
              {[['Chief complaint', 'chiefComplaint'], ['Examination', 'examination'], ['Assessment / diagnosis', 'diagnosis'], ['Follow-up', 'followUp']].map(([label, key]) => <label key={key} className="block text-xs font-bold uppercase tracking-wide text-muted">{label}<textarea rows={2} value={draft[key] || ''} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full resize-none rounded-xl border border-line bg-canvas p-2.5 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-brand-400" /></label>)}
              <button type="button" disabled={status === 'approving'} onClick={approve} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><Check className="h-4 w-4" /> {status === 'approving' ? 'Saving approval…' : 'Approve and save visit note'}</button>
            </>}
            {status === 'approved' && <><p className="rounded-xl bg-emerald-50 px-3 py-4 text-center text-sm font-semibold text-emerald-800">Visit note saved to this patient’s local clinical timeline.</p><button type="button" onClick={reset} className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-ink hover:bg-canvas">Start another consultation</button></>}
          </div>
        </section>
      )}
    </div>
  )
}
