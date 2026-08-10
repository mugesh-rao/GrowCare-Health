import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  CirclePause,
  ClipboardCheck,
  FileText,
  FileHeart,
  FolderOpen,
  Mic,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Send,
  Sparkles,
  Square,
  Stethoscope,
  Volume2,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card } from '../../components/atoms'
import { AuroraMicVisual } from '../../components/Clinic'
import useHeaderActions from '../../hooks/useHeaderActions'
import { clinicalApi } from '../../services/clinicalApi'

const languages = [
  { label: 'English (India)', value: 'en-IN' },
  { label: 'Hindi / Hinglish', value: 'hi-IN' },
  { label: 'Tamil', value: 'ta-IN' },
]

const tabs = [
  { id: 'context', label: 'Context', Icon: Stethoscope },
  { id: 'transcript', label: 'Transcript', Icon: Mic },
  { id: 'note', label: 'Create note', Icon: FileText },
]

const formatDuration = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

function buildPatientSummary(note, patient) {
  const medicines = (note.prescriptions || []).map((item) => `- ${item.drug} ${item.dose} — ${item.frequency}`).join('\n')
  return `Hi ${patient.name.split(' ')[0]}, here is your clinician-approved visit summary.\n\nAssessment: ${note.diagnosis}\n\nMedicines:\n${medicines || 'As discussed with your clinician.'}\n\nFollow-up: ${note.followUp}\n\nContact the clinic if symptoms worsen or you have questions.`
}

export default function PatientScribePage() {
  const navigate = useNavigate()
  const { patientId } = useParams()
  const mediaRecorderRef = useRef(null)
  const mediaChunksRef = useRef([])
  const mediaStreamRef = useRef(null)
  const chunkPendingRef = useRef(false)
  const saveTimerRef = useRef(null)
  const recordingRef = useRef(false)
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('transcript')
  const [sourcesOpen, setSourcesOpen] = useState(true)
  const [language, setLanguage] = useState('en-IN')
  const [contextNote, setContextNote] = useState('')
  const [savingContext, setSavingContext] = useState(false)
  const [consent, setConsent] = useState(false)
  const [session, setSession] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [draft, setDraft] = useState(null)
  const [status, setStatus] = useState('idle')
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState('')

  useHeaderActions(
    <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(`/dashboard/patients/${patientId}`)}>
      Back to patient
    </Button>,
    [patientId],
  )

  useEffect(() => {
    let active = true
    clinicalApi.getPatient(patientId)
      .then((record) => { if (active) setPatient(record) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [patientId])

  useEffect(() => {
    if (status !== 'recording') return undefined
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1000)
    return () => window.clearInterval(timer)
  }, [status])

  useEffect(() => () => {
    recordingRef.current = false
    clearTimeout(saveTimerRef.current)
    mediaRecorderRef.current?.stop?.()
    mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop())
  }, [])

  const saveTranscript = (nextTranscript) => {
    if (!session) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      clinicalApi.updateScribe(patientId, session.id, nextTranscript).catch((requestError) => setNotice(`Transcript save paused: ${requestError.message}`))
    }, 600)
  }

  const updateTranscript = (nextTranscript) => {
    setTranscript(nextTranscript)
    saveTranscript(nextTranscript)
  }

  const appendTranscript = (addition) => {
    setTranscript((current) => {
      const next = `${current}${current ? ' ' : ''}${addition}`.trim()
      saveTranscript(next)
      return next
    })
  }

  const sendAudioChunk = (blob, sessionId) => new Promise((resolve) => {
    if (chunkPendingRef.current || !blob.size) { resolve(); return }
    chunkPendingRef.current = true
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const text = await clinicalApi.transcribeScribeChunk(patientId, sessionId, { audioData: reader.result, audioMimeType: blob.type || 'audio/webm' })
        if (text) appendTranscript(text)
      } catch (requestError) { setNotice(`OpenAI live transcription paused: ${requestError.message}`) } finally { chunkPendingRef.current = false; resolve() }
    }
    reader.onerror = () => { chunkPendingRef.current = false; resolve() }
    reader.readAsDataURL(blob)
  })

  const startLocalAudioCapture = async (sessionId) => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNotice('OpenAI transcription will use the live transcript because local audio capture is unavailable in this WebView.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined })
      mediaChunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size) { mediaChunksRef.current.push(event.data); void sendAudioChunk(event.data, sessionId) } }
      recorder.start(4000)
      mediaRecorderRef.current = recorder
      mediaStreamRef.current = stream
    } catch {
      setNotice('Microphone audio could not be captured. You can continue with the live transcript or type the note.')
    }
  }

  const finishLocalAudioCapture = () => new Promise((resolve) => {
    const recorder = mediaRecorderRef.current
    const stream = mediaStreamRef.current
    const cleanUp = () => stream?.getTracks?.().forEach((track) => track.stop())
    if (!recorder || recorder.state === 'inactive') { cleanUp(); resolve(null); return }
    recorder.onstop = () => {
      const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      cleanUp()
      if (!blob.size) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = () => resolve({ audioData: reader.result, audioMimeType: blob.type || 'audio/webm' })
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    }
    recorder.stop()
  })

  const startConsultation = async () => {
    if (!patient) return
    if (!consent) {
      setNotice('Confirm the patient’s consent before starting ambient capture.')
      return
    }
    try {
      setNotice('')
      const nextSession = await clinicalApi.startScribe(patient.id, { language, consentConfirmed: true })
      setSession(nextSession)
      setTranscript('')
      setInterim('')
      setDraft(null)
      setSeconds(0)
      setStatus('recording')
      setActiveTab('transcript')
      recordingRef.current = true
      void startLocalAudioCapture(nextSession.id)
    } catch (requestError) {
      setNotice(requestError.message)
    }
  }

  const togglePause = () => {
    if (status === 'recording') {
      recordingRef.current = false
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.pause()
      setStatus('paused')
      return
    }
    if (status === 'paused') {
      recordingRef.current = true
      setStatus('recording')
      if (mediaRecorderRef.current?.state === 'paused') mediaRecorderRef.current.resume()
    }
  }

  const finishConsultation = async () => {
    if (!session) return
    clearTimeout(saveTimerRef.current)
    recordingRef.current = false
    setStatus('preparing')
    try {
      const audio = await finishLocalAudioCapture()
      const finished = await clinicalApi.stopScribe(patientId, session.id, transcript, audio || {})
      setSession(finished)
      setDraft(finished.draft)
      setActiveTab('note')
      setStatus('review')
    } catch (requestError) {
      setNotice(requestError.message)
      setStatus('paused')
    }
  }

  const approveNote = async () => {
    if (!draft || !session || !patient) return
    setStatus('approving')
    try {
      await clinicalApi.approveScribe(patientId, session.id, { note: draft, summary: buildPatientSummary(draft, patient), language })
      window.dispatchEvent(new CustomEvent('growcare:patient-updated', { detail: { patientId } }))
      setStatus('approved')
      setNotice('The visit is saved locally and a patient-friendly after-visit draft is ready for clinician review.')
    } catch (requestError) {
      setNotice(requestError.message)
      setStatus('review')
    }
  }

  const saveContext = async () => {
    setSavingContext(true)
    try { await clinicalApi.saveContextNote(patientId, contextNote); setNotice('Clinical context saved locally. Refresh patient context from Intelligence to include it in the AI brief.') } catch (requestError) { setNotice(requestError.message) } finally { setSavingContext(false) }
  }

  if (loading) return <Card className="h-full"><Card.Body className="flex h-full items-center justify-center text-sm text-muted">Loading patient consultation workspace</Card.Body></Card>
  if (!patient || error) return <Card className="h-full"><Card.Body className="flex h-full flex-col items-center justify-center gap-3 text-center"><p className="font-semibold text-ink">Patient consultation could not be opened</p><p className="text-sm text-muted">{error || 'Patient not found.'}</p><Button onClick={() => navigate('/dashboard/patients')}>Return to patients</Button></Card.Body></Card>

  const isLive = status === 'recording' || status === 'paused'
  const consultationTitle = status === 'idle' ? 'New consultation' : status === 'approved' ? 'Consultation complete' : 'Patient consultation'

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-line bg-white">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <p className="text-xs text-muted">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{consultationTitle}</h1>
          <div className="mt-3 flex items-center gap-4 text-sm">
            {tabs.map(({ id, label, Icon }) => (
              <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex items-center gap-1.5 border-b-2 pb-2 transition ${activeTab === id ? 'border-brand-600 font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full bg-canvas px-3 py-2 text-xs font-semibold text-muted sm:flex"><Stethoscope className="h-3.5 w-3.5 text-brand-600" />{patient.name}</span>
          <button type="button" onClick={() => setSourcesOpen((current) => !current)} className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted transition hover:bg-canvas hover:text-ink" title={sourcesOpen ? 'Hide visit sources' : 'Show visit sources'}>
            {sourcesOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
          {status === 'idle' && <Button leftIcon={<Play className="h-4 w-4" />} onClick={() => (consent ? startConsultation() : setActiveTab('context'))}>Start consultation</Button>}
          {isLive && <Button leftIcon={<Square className="h-4 w-4" />} onClick={finishConsultation}>Finish and create note</Button>}
          {status === 'approved' && <Button leftIcon={<FileHeart className="h-4 w-4" />} onClick={() => navigate(`/dashboard/patients/${patientId}/care`)}>Review patient plan</Button>}
        </div>
      </header>

      {notice && <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800"><Volume2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />{notice}</div>}

      <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {activeTab === 'context' && (
          <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-line bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Clinical context</p>
              <textarea value={contextNote} onChange={(event) => setContextNote(event.target.value)} rows={8} className="mt-4 w-full resize-none border-0 bg-transparent p-0 text-sm leading-7 text-ink outline-none placeholder:text-muted" placeholder="Paste referral notes, previous history, symptoms, medications, or anything the scribe should know. This is saved locally and used when you refresh the AI clinical context." />
              <div className="mt-3 flex justify-end"><Button variant="secondary" loading={savingContext} onClick={saveContext}>Save context locally</Button></div>
              <div className="my-5 border-t border-line" />
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700"><Stethoscope className="h-5 w-5" /></span><div><p className="font-semibold text-ink">{patient.name}</p><p className="text-xs text-muted">{patient.mrn} · {patient.specialty} · {patient.doctor}</p></div></div>
              <p className="mt-5 text-sm leading-6 text-muted">{patient.summary}</p>
              <dl className="mt-5 grid gap-3 sm:grid-cols-3"><div><dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Status</dt><dd className="mt-1 text-sm font-semibold text-ink">{patient.status}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Last visit</dt><dd className="mt-1 text-sm font-semibold text-ink">{patient.lastVisit}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Risk</dt><dd className="mt-1 text-sm font-semibold text-ink">{patient.risk}</dd></div></dl>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-muted">Before you begin</p><label className="mt-4 flex items-start gap-3 text-sm leading-5 text-ink"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />I have confirmed this patient’s consent for this consultation to be transcribed locally.</label><label className="mt-5 block text-xs font-bold uppercase tracking-wide text-muted">Conversation language<select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={status !== 'idle'} className="input-base mt-2 w-full normal-case tracking-normal">{languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><p className="mt-4 text-xs leading-5 text-muted">A clinician reviews the generated note before it is saved to the patient timeline.</p></div>
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center py-5 text-center">
            {status === 'idle' ? <>
              <div className="relative h-72 w-72 overflow-hidden rounded-full bg-brand-50 ring-8 ring-brand-100">
                <AuroraMicVisual className="opacity-80" />
                <span className="absolute inset-0 m-auto grid h-20 w-20 place-items-center rounded-full bg-white/80 text-brand-700 backdrop-blur-sm"><Mic className="h-8 w-8" /></span>
              </div>
              <h2 className="mt-7 text-2xl font-bold tracking-tight text-ink">Ready for the record</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">Start a local, patient-linked consultation for {patient.name}. The transcript stays editable and the final note requires clinician approval.</p>
              <button type="button" onClick={() => (consent ? startConsultation() : setActiveTab('context'))} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-night-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"><Play className="h-4 w-4" />{consent ? 'Start recording' : 'Review consent to begin'}</button>
            </> : <>
              <div className={`relative grid h-64 w-64 place-items-center overflow-hidden rounded-full ring-8 ${status === 'recording' ? 'bg-brand-50 ring-brand-100 shadow-[0_0_80px_rgba(39,139,132,0.28)]' : 'bg-amber-50 ring-amber-100'}`}>
                <AuroraMicVisual listening={status === 'recording'} className={status === 'paused' ? 'opacity-35 grayscale' : 'opacity-100'} />
                <div className="absolute inset-0 grid place-items-center"><div><p className="text-3xl font-bold tabular-nums text-ink">{formatDuration(seconds)}</p><p className="mt-1 text-sm font-medium text-ink">{status === 'recording' ? 'Listening locally' : status === 'paused' ? 'Recording paused' : 'Preparing your draft'}</p><button type="button" disabled={status === 'preparing'} onClick={togglePause} className="mx-auto mt-5 grid h-14 w-14 place-items-center rounded-full bg-night-900 text-white transition hover:bg-brand-700 disabled:opacity-50">{status === 'recording' ? <CirclePause className="h-6 w-6" /> : <Play className="h-6 w-6" />}</button></div></div>
              </div>
              <div className="mt-7 w-full text-left"><label className="text-xs font-bold uppercase tracking-wide text-muted">Live transcript<textarea value={transcript} onChange={(event) => updateTranscript(event.target.value)} disabled={status === 'preparing'} rows={8} className="mt-2 w-full resize-none rounded-2xl border border-line bg-canvas p-4 text-sm leading-6 text-ink outline-none focus:border-brand-400 disabled:opacity-60" placeholder="Transcript appears here. You can type clinical details at any time." /></label>{interim && <p className="mt-2 text-sm italic text-muted">{interim}</p>}</div>
            </>}
          </div>
        )}

        {activeTab === 'note' && (
          <div className="mx-auto max-w-4xl">
            {!draft && <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-canvas px-8 py-16 text-center"><ClipboardCheck className="h-9 w-9 text-brand-600" /><p className="mt-4 text-lg font-semibold text-ink">Your draft will appear here</p><p className="mt-2 max-w-md text-sm text-muted">Finish the consultation to create a structured draft from the saved transcript.</p></div>}
            {draft && <div className="space-y-4"><div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900"><Sparkles className="h-4 w-4 shrink-0" />Review each field before saving this consultation to {patient.name}'s timeline.</div><article className="rounded-2xl border border-line bg-white px-7 py-8 sm:px-10"><header className="border-b border-line pb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Clinical consultation note</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">{patient.name}</h2><p className="mt-2 text-sm text-muted">{patient.mrn} · {patient.specialty} · Prepared from local consultation transcript</p></header><div className="divide-y divide-line">{[['Chief complaint', 'chiefComplaint'], ['Examination', 'examination'], ['Assessment / diagnosis', 'diagnosis'], ['Follow-up plan', 'followUp']].map(([label, key]) => <section key={key} className="py-6"><h3 className="text-sm font-bold text-ink">{label}</h3><textarea rows={3} value={draft[key] || ''} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} disabled={status === 'approving' || status === 'approved'} className="mt-2 w-full resize-y border-0 bg-transparent p-0 text-sm leading-7 text-ink outline-none placeholder:text-muted focus:ring-0 disabled:text-muted" /></section>)}</div></article><div className="flex flex-wrap justify-end gap-3 pt-2">{status === 'approved' ? <Button leftIcon={<FileHeart className="h-4 w-4" />} onClick={() => navigate(`/dashboard/patients/${patientId}/care`)}>Review after-visit plan</Button> : <Button disabled={status === 'approving'} leftIcon={<Check className="h-4 w-4" />} onClick={approveNote}>{status === 'approving' ? 'Saving to patient record' : 'Approve and save visit note'}</Button>}</div></div>}
          </div>
        )}
      </div>

      {sourcesOpen && (
        <aside className="hidden w-72 shrink-0 border-l border-line bg-canvas/70 xl:flex xl:flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-brand-600" /><p className="text-sm font-semibold text-ink">Visit sources</p></div>
            <button type="button" onClick={() => setSourcesOpen(false)} className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-white hover:text-ink" title="Hide visit sources"><PanelRightClose className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <section><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Patient context</p><div className="mt-2 rounded-xl border border-line bg-white px-3 py-3"><p className="text-sm font-semibold text-ink">{patient.name}</p><p className="mt-1 text-xs leading-5 text-muted">{patient.specialty} · {patient.mrn}</p></div></section>
            <section><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Attached sources</p><div className="mt-2 space-y-2">{(patient.documents || []).length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white px-3 py-4 text-xs leading-5 text-muted">No files attached to this patient yet.</p> : patient.documents.map((document, index) => <div key={`${document.name}-${index}`} className="flex gap-2 rounded-xl border border-line bg-white px-3 py-3"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">{document.name}</p><p className="mt-1 text-[10px] text-muted">{document.type} · {document.uploadedAt}</p></div></div>)}</div></section>
            <section><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Previous visits</p><div className="mt-2 space-y-2">{(patient.visits || []).length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white px-3 py-4 text-xs text-muted">No previous visits.</p> : patient.visits.slice(0, 4).map((visit) => <div key={visit.id || `${visit.title}-${visit.date}`} className="rounded-xl border border-line bg-white px-3 py-3"><p className="text-xs font-semibold text-ink">{visit.title}</p><p className="mt-1 text-[10px] text-muted">{visit.date}</p></div>)}</div></section>
          </div>
        </aside>
      )}
      </div>

      {activeTab === 'transcript' && status !== 'preparing' && (
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-6 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted"><span className="rounded-full bg-canvas px-3 py-2">Template: General consultation</span><span className="rounded-full bg-canvas px-3 py-2">Microphone: Default input</span></div>
          {isLive && <Button leftIcon={<Send className="h-4 w-4" />} onClick={finishConsultation}>Finish and create note</Button>}
        </footer>
      )}
    </section>
  )
}
