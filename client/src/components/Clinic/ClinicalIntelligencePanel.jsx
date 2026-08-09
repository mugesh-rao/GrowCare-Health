import { useEffect, useState } from 'react'
import { BrainCircuit, CheckCircle2, FileSearch, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react'
import { clinicalApi } from '../../services/clinicalApi'

function Status({ value }) {
  const styles = value === 'ready' ? 'bg-emerald-50 text-emerald-700' : value === 'failed' ? 'bg-red-50 text-red-700' : value === 'processing' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${styles}`}>{String(value || 'not processed').replaceAll('_', ' ')}</span>
}

export default function ClinicalIntelligencePanel({ patient, onUpdated }) {
  const [data, setData] = useState(null)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try { setData(await clinicalApi.getIntelligence(patient.id)) } catch (requestError) { setError(requestError.message) }
  }
  useEffect(() => {
    let active = true
    clinicalApi.getIntelligence(patient.id)
      .then((next) => { if (active) setData(next) })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [patient.id])

  const process = async (artifactId) => {
    setBusyId(artifactId); setError('')
    try { await clinicalApi.processArtifact(patient.id, artifactId); await load(); onUpdated?.() } catch (requestError) { setError(requestError.message); await load() } finally { setBusyId('') }
  }
  const refresh = async () => {
    setBusyId('context'); setError('')
    try { await clinicalApi.refreshClinicalContext(patient.id); await load(); onUpdated?.() } catch (requestError) { setError(requestError.message) } finally { setBusyId('') }
  }

  return <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
      <div className="flex gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-night-900 text-white"><BrainCircuit className="h-4 w-4" /></span><div><h3 className="text-sm font-semibold text-ink">Clinical intelligence</h3><p className="mt-1 max-w-xl text-xs leading-5 text-muted">Local sources, structured draft extraction, and a longitudinal patient context. A clinician must review all AI output.</p></div></div>
      <button onClick={refresh} disabled={busyId === 'context'} className="inline-flex items-center gap-2 rounded-xl bg-night-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busyId === 'context' ? 'animate-spin' : ''}`} />Refresh context</button>
    </div>
    <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Processing or context refresh sends only the selected patient source/context to OpenAI through your configured local key. Files and the resulting JSON remain stored locally.</div>
    {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)]">
      <section className="overflow-hidden rounded-2xl border border-line"><div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-3"><FileSearch className="h-4 w-4 text-brand-600" /><h3 className="text-sm font-semibold text-ink">Raw sources</h3></div><div className="divide-y divide-line">
        {!data?.artifacts?.length && <p className="px-4 py-7 text-sm text-muted">Upload a PDF, image, audio recording, EMR export, CSV, or text report from Visits &amp; Sources.</p>}
        {data?.artifacts?.map((artifact) => <div key={artifact.id} className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{artifact.fileName}</p><p className="mt-1 text-xs text-muted">{artifact.mimeType || artifact.kind}{artifact.byteSize ? ` · ${(artifact.byteSize / 1024).toFixed(0)} KB` : ''}</p>{artifact.processingError && <p className="mt-1 text-xs text-red-600">{artifact.processingError}</p>}</div><div className="flex shrink-0 items-center gap-2"><Status value={artifact.extractionStatus} />{artifact.extractionStatus !== 'ready' && <button onClick={() => process(artifact.id)} disabled={busyId === artifact.id} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-50">{busyId === artifact.id ? 'Processing…' : 'Process'}</button>}</div></div>)}
      </div></section>
      <section className="overflow-hidden rounded-2xl border border-line"><div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-3"><Sparkles className="h-4 w-4 text-brand-600" /><h3 className="text-sm font-semibold text-ink">Patient context</h3></div><div className="space-y-4 p-4">
        {!data?.context && <p className="text-sm leading-6 text-muted">Process at least one local source, then refresh the context to create a usable longitudinal brief.</p>}
        {data?.context && <><p className="text-sm leading-6 text-ink">{data.context.summary}</p><ContextList label="Active problems" values={data.context.activeProblems} /><ContextList label="Care gaps" values={data.context.careGaps} /><ContextList label="Clinician questions" values={data.context.questionsForClinician} /></>}
      </div></section>
    </div>
    {!!data?.extractions?.length && <section className="mt-4 overflow-hidden rounded-2xl border border-line"><div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-3"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><h3 className="text-sm font-semibold text-ink">Structured extractions</h3></div><div className="grid gap-px bg-line md:grid-cols-2">{data.extractions.map((extraction) => <div key={extraction.id} className="bg-white p-4"><p className="text-sm font-semibold text-ink">{extraction.data?.summary || 'Clinical source'}</p><p className="mt-2 text-xs leading-5 text-muted">{(extraction.data?.diagnoses || []).join(' · ') || 'No diagnosis explicitly extracted.'}</p><div className="mt-3 flex flex-wrap gap-1.5">{(extraction.data?.observations || []).slice(0, 5).map((observation, index) => <span key={index} className="rounded-lg bg-canvas px-2 py-1 text-[11px] text-ink">{observation.name}: {observation.value} {observation.unit}</span>)}</div></div>)}</div></section>}
  </div>
}

function ContextList({ label, values = [] }) { if (!values?.length) return null; return <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-muted">{label}</p><ul className="space-y-1.5">{values.slice(0, 6).map((value, index) => <li key={index} className="text-xs leading-5 text-ink">{value}</li>)}</ul></div> }
