import { useEffect, useState } from 'react'
import {
  ArrowLeft, CheckCheck, ChevronDown, ChevronUp, ClipboardList,
  Dna, Eye, FlaskConical, HeartPulse, Mic, ScanLine, Send, Sparkles, Square, Stethoscope, TriangleAlert, X,
} from 'lucide-react'
import { Badge } from '../atoms'

const SPECIALTY_ICON = {
  Endocrinology: FlaskConical,
  Ophthalmology: Eye,
  Oncology: Dna,
  Cardiology: HeartPulse,
  Neurology: Sparkles,
  Dermatology: ScanLine,
  'General Medicine': Stethoscope,
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function buildMockNote(patient) {
  const primaryMetric = patient.metrics?.[0]
  return {
    chiefComplaint: `Follow-up review for ${patient.specialty}. Patient presents regarding ${
      patient.condition?.split('—')[0]?.split(' with')[0]?.trim() || 'ongoing condition'
    }. Reports some improvement since last visit.`,
    examination: `Patient alert and co-operative, no acute distress. ${
      patient.metrics?.map((m) => `${m.label}: ${m.value}`).join(', ') || 'Vitals within expected range'
    }. General examination unremarkable.`,
    diagnosis: patient.condition || 'Ongoing chronic condition management.',
    prescriptions: patient.prescriptions || [],
    followUp: `Repeat ${primaryMetric?.label || 'investigations'} before next visit. Review lifestyle plan. Follow-up in 4 weeks. WhatsApp post-visit summary will be sent to patient.`,
  }
}

function buildWaSummary(patient, note, lang) {
  const rx = note.prescriptions.slice(0, 3)
  if (lang === 'Hindi') {
    return `नमस्ते ${patient.name.split(' ')[0]}! यहाँ आपकी आज की विज़िट की समरी है:\n\nनिदान: ${note.diagnosis}\n\nदवाइयाँ:\n${rx.map((r) => `- ${r.drug} — ${r.dose}`).join('\n')}\n\nध्यान दें: यदि कोई नए लक्षण हों तो तुरंत क्लिनिक से संपर्क करें।\n\nअगली विज़िट: 4 हफ्ते बाद।\n\nकोई सवाल हो तो यहाँ reply करें।`
  }
  if (lang === 'Tamil') {
    return `வணக்கம் ${patient.name.split(' ')[0]}! இன்றைய உங்கள் விஜிட் சுருக்கம்:\n\nநோய் கண்டறிதல்: ${note.diagnosis}\n\nமருந்துகள்:\n${rx.map((r) => `- ${r.drug} — ${r.dose}`).join('\n')}\n\nகவனம்: புதிய அறிகுறிகள் தென்பட்டால் உடனே தொடர்பு கொள்ளுங்கள்.\n\nஅடுத்த விஜிட்: 4 வாரங்கள் பிறகு.\n\nஏதாவது கேள்வி இருந்தால் இங்கே பதில் அனுப்புங்கள்.`
  }
  return `Hi ${patient.name.split(' ')[0]} — here's your visit summary from ${patient.doctor} today:\n\nDiagnosis: ${note.diagnosis}\n\nMedicines:\n${rx.map((r) => `- ${r.drug} — ${r.dose}${r.duration !== 'Ongoing' ? ` for ${r.duration}` : ''}`).join('\n')}\n\nWatch for any new or worsening symptoms since today's visit.\n\n${note.followUp}\n\nReply here if you have any questions.`
}

/* ── Sub-views ────────────────────────────────────────────────────────────── */

function IdleView({ onStart, patient }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8 py-12 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-50 ring-4 ring-brand-100">
        <Mic className="h-9 w-9 text-brand-600" />
      </div>
      <div>
        <h3 className="font-display text-xl font-bold text-ink">Scribe ready</h3>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
          Tap to start recording. Speak naturally in English, Hindi, or Tamil — the AI will structure your note.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {['Chief complaint', 'Examination', 'Diagnosis', 'Prescription', 'Follow-up'].map((s) => (
          <span key={s} className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-muted">
            {s}
          </span>
        ))}
      </div>
      <button
        onClick={onStart}
        className="flex items-center gap-2 rounded-2xl bg-night-900 px-8 py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
      >
        <Mic className="h-4 w-4" />
        Start recording
      </button>
      <p className="text-xs text-muted">
        Patient: <span className="font-semibold text-ink">{patient.name}</span> · {patient.doctor}
      </p>
    </div>
  )
}

function RecordingView({ onStop, seconds }) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  const bars = [5, 9, 14, 10, 6, 12, 8, 16, 11, 7, 13, 9, 5, 11, 8, 14, 6, 10]

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8 py-12 text-center">
      {/* Waveform */}
      <div className="flex h-16 items-end justify-center gap-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-brand-500"
            style={{
              height: `${h * 3}px`,
              animation: `wave ${0.8 + (i % 4) * 0.15}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      <div>
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <span className="font-display text-2xl font-bold tabular-nums text-ink">
            {mins}:{secs}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">Recording in progress…</p>
      </div>

      <button
        onClick={onStop}
        className="flex items-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50 px-8 py-3.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
      >
        <Square className="h-4 w-4" />
        Stop &amp; generate note
      </button>
    </div>
  )
}

function GeneratingView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="grid h-16 w-16 animate-pulse place-items-center rounded-full bg-brand-50">
        <Sparkles className="h-7 w-7 text-brand-600" />
      </div>
      <div>
        <p className="font-display text-lg font-bold text-ink">Generating structured note…</p>
        <p className="mt-1 text-sm text-muted">Analysing speech · extracting clinical content · flagging safety checks</p>
      </div>
    </div>
  )
}

function ReviewingView({ note, onPreview, setNote }) {
  const warningRx = note.prescriptions.filter((r) => r.warning)

  const field = (label, key, rows = 2) => (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-muted">{label}</p>
      <textarea
        rows={rows}
        className="w-full resize-none rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm leading-6 text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        value={note[key]}
        onChange={(e) => setNote((n) => ({ ...n, [key]: e.target.value }))}
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-0">
      {/* Prescription safety check banner */}
      {warningRx.length > 0 && (
        <div className="mx-5 mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-bold text-amber-900">
              {warningRx.length} prescription safety flag{warningRx.length > 1 ? 's' : ''} detected
            </p>
          </div>
          <div className="mt-2 space-y-1.5">
            {warningRx.map((r) => (
              <p key={r.drug} className="text-xs leading-5 text-amber-800">
                <span className="font-semibold">{r.drug}</span> — {r.warning}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 overflow-y-auto px-5 py-5">
        {field('Chief complaint', 'chiefComplaint', 2)}
        {field('Examination notes', 'examination', 3)}
        {field('Diagnosis', 'diagnosis', 2)}

        {/* Prescription table */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-muted">
            Prescription safety check
          </p>
          <div className="overflow-hidden rounded-xl border border-line">
            {note.prescriptions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">No prescriptions on record.</p>
            ) : (
              note.prescriptions.map((rx, i) => (
                <div
                  key={i}
                  className={
                    'flex items-start gap-3 px-4 py-3 text-sm ' +
                    (i < note.prescriptions.length - 1 ? 'border-b border-line' : '') +
                    (rx.warning ? ' bg-amber-50' : ' bg-white')
                  }
                >
                  {rx.warning
                    ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="Prescription warning" />
                    : <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Prescription verified" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{rx.drug}</p>
                    <p className="text-xs text-muted">
                      {rx.route} · {rx.dose} · {rx.duration}
                    </p>
                    {rx.warning && (
                      <p className="mt-1 text-xs leading-4 text-amber-700">{rx.warning}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {field('Follow-up instructions', 'followUp', 2)}

        <button
          onClick={onPreview}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-night-900 py-3.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          <Send className="h-4 w-4" />
          Approve &amp; preview WhatsApp summary
        </button>
      </div>
    </div>
  )
}

function PreviewView({ note, patient, language, onLanguageChange, onSend, onBack }) {
  const summary = buildWaSummary(patient, note, language)

  return (
    <div className="flex flex-col gap-0 px-5 py-5">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink transition">
        <ArrowLeft className="h-4 w-4" /> Back to note
      </button>

      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.13em] text-muted">
        WhatsApp message preview
      </p>

      {/* Language selector */}
      <div className="mb-4 flex gap-2">
        {['English', 'Hindi', 'Tamil'].map((l) => (
          <button
            key={l}
            onClick={() => onLanguageChange(l)}
            className={
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ' +
              (language === l
                ? 'border-night-900 bg-night-900 text-white'
                : 'border-line bg-white text-muted hover:border-slate-400')
            }
          >
            {l}
          </button>
        ))}
      </div>

      {/* Preview bubble */}
      <div className="rounded-2xl border border-line bg-[#ecf0f1] p-4">
        <div className="inline-block max-w-full rounded-[18px] rounded-tl-md bg-white px-4 py-3 shadow-sm">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-ink">{summary}</pre>
        </div>
        <p className="mt-3 text-right text-[11px] text-slate-400">
          Sending to {patient.phone}
        </p>
      </div>

      <button
        onClick={onSend}
        className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700"
      >
        <Send className="h-4 w-4" />
        Send to patient
      </button>
    </div>
  )
}

function SentView({ patient, onClose }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50">
        <CheckCheck className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <h3 className="font-display text-xl font-bold text-ink">Visit note saved</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          The visit note has been saved and a WhatsApp summary was sent to{' '}
          <span className="font-semibold text-ink">{patient.phone}</span>.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2 rounded-2xl border border-line bg-canvas px-5 py-4 text-left">
        <div className="flex items-center gap-2 text-sm">
          <CheckCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-ink">Visit note saved to record</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CheckCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-ink">WhatsApp summary sent</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CheckCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-ink">Follow-up reminder scheduled</span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="rounded-2xl border border-line bg-white px-8 py-3 text-sm font-semibold text-ink transition hover:bg-canvas"
      >
        Back to patient record
      </button>
    </div>
  )
}

/* ── Left sidebar in visit panel ─────────────────────────────────────────── */

function VisitContextSidebar({ patient }) {
  const [rxOpen, setRxOpen] = useState(true)
  const SpecialtyIcon = SPECIALTY_ICON[patient.specialty] || Stethoscope

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col overflow-hidden rounded-[22px] border border-line bg-white">
      {/* Patient card */}
      <div className="shrink-0 border-b border-line px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-night-900 text-white">
            <SpecialtyIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-ink">{patient.name}</h3>
            <p className="text-xs text-muted">{patient.mrn} · {patient.age}y · {patient.gender}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {patient.metrics?.slice(0, 4).map((m) => (
            <div key={m.label} className="rounded-xl border border-line bg-canvas px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.11em] text-muted">{m.label}</p>
              <p className="mt-0.5 text-sm font-bold text-ink">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prescriptions */}
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={() => setRxOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 transition hover:bg-canvas"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-brand-600" />
            <span className="text-sm font-semibold text-ink">Current prescriptions</span>
          </div>
          {rxOpen ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </button>

        {rxOpen && (
          <div className="space-y-2 px-4 pb-4">
            {(patient.prescriptions || []).map((rx, i) => (
              <div
                key={i}
                className={
                  'rounded-2xl border px-4 py-3 ' +
                  (rx.warning ? 'border-amber-200 bg-amber-50' : 'border-line bg-canvas')
                }
              >
                <div className="flex items-start gap-2">
                  {rx.warning
                    ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="Prescription warning" />
                    : <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Prescription verified" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{rx.drug}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {rx.route} · {rx.dose}
                    </p>
                    {rx.warning && (
                      <p className="mt-1.5 text-xs leading-4 text-amber-700">{rx.warning}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!patient.prescriptions || patient.prescriptions.length === 0) && (
              <p className="text-sm text-muted">No prescriptions on record.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function StartVisitPanel({ patient, onClose }) {
  const [phase, setPhase] = useState('idle')
  const [seconds, setSeconds] = useState(0)
  const [note, setNote] = useState(null)
  const [language, setLanguage] = useState('English')

  // Recording timer
  useEffect(() => {
    if (phase !== 'recording') return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  const handleStop = () => {
    setPhase('generating')
    setTimeout(() => {
      setNote(buildMockNote(patient))
      setPhase('reviewing')
    }, 2000)
  }

  const handleSend = () => {
    setPhase('sent')
  }

  return (
    <div className="flex h-full w-full gap-3 overflow-hidden">
      {/* Left: patient context + prescriptions */}
      <VisitContextSidebar patient={patient} />

      {/* Right: scribe workflow */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-line bg-white">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-4">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">
              {phase === 'idle' ? 'Ready to record' : phase === 'recording' ? 'Recording in progress' : phase === 'generating' ? 'Generating note' : phase === 'reviewing' ? 'Review & approve note' : phase === 'preview' ? 'WhatsApp summary' : 'Visit complete'}
            </p>
            <p className="text-sm font-bold text-ink">
              {patient.name} · {patient.doctor}
            </p>
          </div>
          {phase === 'reviewing' && (
            <Badge tone="success">Note ready</Badge>
          )}
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-canvas hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {phase === 'idle' && <IdleView onStart={() => setPhase('recording')} patient={patient} />}
          {phase === 'recording' && <RecordingView onStop={handleStop} seconds={seconds} />}
          {phase === 'generating' && <GeneratingView />}
          {phase === 'reviewing' && note && (
            <ReviewingView
              note={note}
              onPreview={() => setPhase('preview')}
              setNote={setNote}
            />
          )}
          {phase === 'preview' && note && (
            <PreviewView
              note={note}
              patient={patient}
              language={language}
              onLanguageChange={setLanguage}
              onSend={handleSend}
              onBack={() => setPhase('reviewing')}
            />
          )}
          {phase === 'sent' && <SentView patient={patient} onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}
