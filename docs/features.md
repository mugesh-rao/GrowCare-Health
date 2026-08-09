# GrowCare / MedOS — Features & Build Plan

A working implementation map derived from `docs/PRD.md`. It lists every feature the product must include, what already exists in the codebase, what still needs to be built, and the order in which things should be built.

Target deployment: **local-first Tauri desktop app** — clinics/hospitals run their own server on their own machine (or LAN), with no cloud dependency.

---

## 1. Product thesis (one paragraph)

GrowCare is a Clinical Data Operating System for Indian hospitals, diagnostic chains, and specialty clinics. It is **not** an EMR replacement. It sits above existing EMR/HMIS/RIS/LIS and document workflows, and turns fragmented clinical artifacts (PDFs, scanned reports, prescriptions, WhatsApp images/voice notes, EMR exports) into:

- structured, machine-readable clinical data
- a longitudinal patient timeline
- visual trend / report intelligence
- AI-generated summaries
- missing-data alerts
- workflow, coding, compliance, and revenue-intelligence outputs

The core idea: hospitals don't lack data — they lack usable clinical context.

---

## 2. The 3-layer architecture

```text
Raw Medical Data
(PDFs, scans, prescriptions, voice, EMR exports, WhatsApp uploads)
        |
        v
Layer 1: Clinical Data Extraction Layer
(OCR + NLP + medical entity extraction + normalization)
        |
        v
Layer 2: Clinical Context Layer
(longitudinal patient understanding + summary + visualization)
        |
        v
Layer 3: Operational Intelligence Layer
(workflow automation + decision support + coding/compliance)
        |
        v
Applications
(doctor tools, hospital dashboards, billing, patient-facing comms)
```

- Layer 1 converts raw artifacts → structured data.
- Layer 2 converts structured data → longitudinal understanding.
- Layer 3 converts understanding → action, automation, and alerts.

---

## 3. Full feature inventory

### Layer 1 — Extraction

| Module | What it does | Status |
|---|---|---|
| 1. Clinical Data Ingestion Engine | Accept scanned PDFs, images, WhatsApp files, prescriptions, discharge summaries, lab reports, imaging reports, voice/dictated notes | Partial — artifact upload exists in `VisitsPanel`; no OCR/extraction |
| 2. Clinical Entity Extraction + Normalization | OCR for medical docs, multilingual extraction (English/Tamil/Hindi/Hinglish), medical NER, document-type detection, table extraction, medication/diagnosis/procedure/date extraction, unit + naming normalization, confidence scoring, source traceability, FHIR-compatible JSON output | **New** |
| 3. Patient Record Linking / Identity Resolution | Patient matching, encounter grouping, visit chronology, facility/provider association, duplicate artifact detection | **New** |

### Layer 2 — Context

| Module | What it does | Status |
|---|---|---|
| 4. Patient Timeline Engine | Unified chronological timeline of visits/prescriptions/labs/imaging/diagnoses, encounter clustering, event drill-down to source docs, "what changed since last visit" | Partial — VisitsPanel + Visit-wise tab exist |
| 5. Visual Trend & Report Intelligence | Trend graphs (glucose, HbA1c, BP, cholesterol, creatinine, kidney function), report-to-report comparison, abnormal-value highlighting, severity/trend labels | Partial — Progression tab exists; no report-value plotting |
| 6. Clinical Summary Engine | Auto-generate consultation notes, discharge summaries, follow-up summaries, referral letters, doctor pre-read summaries, patient-friendly explanations | Partial — summary sidebar exists |
| 7. Context-Aware Clinical Chat | Chat grounded in the patient record (not a generic chatbot): "what changed?", "explain abnormal values", "what's missing before surgery?", patient-friendly mode | **Done** — chat over patient record exists |
| 8. Missing Data Detection Engine | Flag outdated/missing labs, missing allergies, absent prior imaging, drug-interaction risk, incomplete documentation | Partial — flags exist, no rule engine |
| 9. Longitudinal Pattern Detection | Worsening glycemic control, kidney decline, tumor-marker progression, repeated abnormal trends, care-gap patterns | **New** |
| 10. Specialty Context Packs | Adapt summaries/visualizations per specialty (ophthalmology, cardiology, oncology, radiology) | **New** |

### Layer 3 — Operational Intelligence

| Module | What it does | Status |
|---|---|---|
| 11. Follow-Up & Reminder Intelligence | Follow-up reminders, test-due reminders, repeat-visit recommendations, patient communication triggers, staff task prompts | Partial — scheduler exists; no patient-facing triggers |
| 12. Coding & Compliance Engine | Auto-suggest ICD-10, SNOMED-CT mapping, CPT procedure suggestions, procedure-vs-diagnosis mismatch detection, documentation completeness checks | **New** |
| 13. Report Quality & Revenue Integrity | Missing-field checks, findings-vs-impression consistency, contrast-vs-procedure mismatch, missing pre-auth references, coding hints, payer-risk flags | **New** |
| 14. Clinical Documentation Automation | Consultation note drafts, discharge summaries, prescriptions, referral notes, follow-up notes, EMR-insert-ready output | Partial — Scribe covers notes; no SOAP/EMR output |
| 15. Ambient Consultation Assistant | Capture live consultation audio, multilingual transcription, structured SOAP note generation, doctor approves → pushed to record + WhatsApp summary | Partial — Scribe page exists |
| 16. Clinical Decision Support | Drug-interaction warnings, procedure-preparation checks, contrast risk checks, data-completeness checks. Starts as assistive guidance, NOT autonomous diagnosis | **New** |
| 17. Population Health Intelligence | Disease-prevalence dashboards, readmission-risk visibility, follow-up adherence tracking, documentation-quality analytics, gap-to-care reporting | **New** |

---

## 4. Doctor-first features (from the PRD's "doctor lens" section)

These are the user-facing feature descriptions. Each maps to one or more modules above.

| Feature | Plain-language benefit | Maps to |
|---|---|---|
| Pre-Visit AI Brief ("Doctor's Briefing Card") | "Walk in already knowing everything about the patient" — a 10-second card shown when a doctor opens a patient record: last visit, key values, medications, flags | Module 4, 6, 8 |
| Ambient AI Scribe (Tamil/Hindi/Hinglish-first) | "Stop typing. Just talk." — start visit, speak naturally, get a structured note, review + approve | Module 15 |
| Visit-Wise Progression View (visual health timeline) | "See if your treatment is actually working" — trend charts, visit cards, report intelligence, progression signal sentence | Module 4, 5, 9 |
| Between-Visit Patient Monitoring (WhatsApp check-ins) | "Know when something is wrong before the next visit" — auto check-ins on day 3/7/20, flagged concerns surface in dashboard | Module 11 |
| AI Prescription Safety Check | "Catch what you'd miss on a busy day" — silent drug/dose/renal warnings | Module 16 |
| Post-Visit WhatsApp Summary for Patients | "Patients actually follow what you said" — plain-language summary, red-flag symptoms, next visit | Module 6, 11, 14 |
| Doctor's End-of-Day Dashboard | "Know exactly what's pending before you go home" — seen/approved/pending/alerts/no-follow-up/refills | Module 17, 11 |
| Doctor's Daily Morning Briefing | Every morning: today's patients, flagged patients, new patients, routine follow-ups | Module 17, 11 |
| Chronic Patient Alert Engine | Diabetic/hypertensive patients past their follow-up cadence get personalized WhatsApp nudges | Module 11, 8 |
| Image & Document Intelligence | Uploaded lab/scan images get values extracted, plotted, color-coded, annotatable | Module 2, 5 |

---

## 5. Pages / screens

### Existing pages (keep, upgrade)

| Route | Page | Upgrade needed |
|---|---|---|
| `/dashboard` | Dashboard Hub (Clinic Snapshot / Appointments / Workflows tabs) | Add missing-data + follow-up alert counts; later the End-of-Day + Morning Briefing cards |
| `/dashboard/whatsapp` | WhatsApp Hub (Inbox / Broadcasts / Templates / Settings) | — |
| `/dashboard/patients` | Patients list | Add care-gap badges on chronic patients |
| `/dashboard/patients/new` | Create patient | — |
| `/dashboard/patients/:id` | Patient Detail (3-column workspace) | **Add Doctor Briefing Card at top; feed real trend charts** |
| `/dashboard/patients/:id/scribe` | Scribe (ambient visit capture) | Add drug-safety warnings + one-tap WhatsApp patient summary |
| `/dashboard/bookings` | Bookings | — |
| `/dashboard/workflows` | Workflow builder | — |
| `/dashboard/settings` | Settings | Add Specialty Packs section |
| `/onboarding` | First-run setup | — |

### New pages

| # | Page | Purpose | Modules |
|---|---|---|---|
| 1 | **Analytics / Population Health** | Disease prevalence, readmission risk, follow-up adherence, documentation-quality, gap-to-care reports | 17 |
| 2 | **Report QA & Revenue Integrity** | Per-report checklist: missing fields, findings-vs-impression mismatch, contrast checks, coding hints, payer-risk flags | 13 |
| 3 | **Coding & Compliance** | ICD-10/CPT suggestions, procedure-vs-diagnosis mismatch, pre-claim completeness checks | 12 |
| 4 | **Care Gaps / Missing Data Center** | All active alerts across patients: missing labs, allergies, outdated tests, drug risks | 8 |
| 5 | **Follow-Up Center** | Scheduled reminders, test-due alerts, patient comm triggers, staff task prompts | 11 |
| 6 | **Prescription Safety Check** (inline panel, not standalone) | Drug-interaction + dose warnings while prescribing | 16 |
| 7 | **Settings → Specialty Packs** | Configure context rules per specialty | 10 |

---

## 6. Backend / infrastructure work

| Area | What to do | Status |
|---|---|---|
| Entity extraction pipeline | OCR + medical NER + document-type detection + normalization; structured JSON out of raw artifacts | New |
| Data model | Normalized schema for patients, encounters, visits, medications, labs, diagnoses, procedures, artifacts; source traceability + confidence scores | New |
| Patient record linking | Match artifacts to patients; dedupe duplicates | New |
| File storage | Move artifact blobs out of SQLite JSON to files on disk keyed by sha256 (see `docs/Tech.md` §2) | Recommended |
| Rules engine for alerts | Care-gap rules (e.g. "Metformin patient, no HbA1c in 9 months"), follow-up cadence per patient tag | New |
| Coding/QA logic | ICD-10/CPT suggestion, mismatch detection, completeness checks | New |
| LAN mode | Bind server to `0.0.0.0` + pairing flow for multi-PC clinics (see `docs/Tech.md` §3) | Planned |
| Scheduler | Patient-facing follow-up triggers + daily/morning digests | Partial |
| WhatsApp patient comms | Plain-language post-visit summaries, check-ins, chronic-patient nudges | Partial |

---

## 7. Success metrics (from the PRD)

- Extraction accuracy > 95% on standard target documents
- Doctor reconstructs patient context in < 30 seconds (vs 3–5 min)
- Doctors approve AI summaries with < 20% edits in > 80% of cases
- Clinical documentation gaps reduced > 60% within 90 days
- Claim rejection rate reduced > 30% within 6 months
- Per-patient documentation time from 2–3 min to < 30 seconds (scribe)

---

## 8. Build order (priority)

1. **Extraction pipeline** (Module 2) — everything depends on it
2. **Patient timeline + visual trends** (Module 4, 5) — first doctor-facing value
3. **AI summary + context chat polish** (Module 6, 7) — already partially built
4. **Missing-data detection + follow-up intelligence** (Module 8, 11) — easiest measurable ROI
5. **Coding, compliance, revenue integrity** (Module 12, 13) — strongest commercial value
6. **Decision support + population health** (Module 16, 17) — later
7. **Ambient scribe hardening** (Module 15) — already exists, iterate on trust/correction UX

---

## 9. MVP definition (if building only one thing)

> Report ingestion → patient timeline → visual trends → AI summary → missing-data alerts

That is the cleanest version of the Clinical Data Operating System and leaves room for later expansion into compliance, revenue integrity, and ambient scribing.

---

## 10. Open decisions to make

1. **OCR engine** — Tesseract vs. a commercial cloud OCR vs. an LLM-based vision model (needs to handle handwriting + Tamil/Hindi)
2. **Medical entity extraction** — in-house rules + LLM, or a medical NLP library (e.g. cTAKES, spaCy biomedical models)
3. **Coding source** — ICD-10/CPT reference data: bundled static dataset vs. API
4. **LAN pairing** — when to build multi-PC clinic mode (see `docs/Tech.md` §3)
5. **Firebase removal** — confirm no remaining cloud calls; PRD wants fully local, hospital-owned servers
