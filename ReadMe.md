# GrowCare

WhatsApp AI automation platform built for clinics. Connects real WhatsApp numbers to a visual workflow builder, patient records workspace, broadcast engine, and AI-powered message routing — all in one dashboard.

---

## What it does

| Area | What you get |
|---|---|
| **Patient records** | Create patients, view visit history, upload documents, run AI chat over the full record |
| **WhatsApp inbox** | Unified conversation view with notes, status tags, and staff handoffs |
| **Workflow builder** | Drag-and-drop node editor that runs automated patient journeys when messages arrive |
| **Broadcasts** | Bulk messaging with templates for reminders, follow-ups, and campaigns |
| **Appointments** | Booking slots inside workflows with auto-reminders |
| **AI routing** | GPT-powered router nodes that classify intent and branch the flow |
| **Anti-ban** | Human typing simulation, spintax, warmup periods, and per-day rate limits |

---

## Tech stack

### Frontend — `client/`
- **React 18 + Vite** — app shell and build
- **React Router v6** — client-side routing
- **Tailwind CSS** — utility-first styling
- **React Flow** — visual node-based workflow editor canvas
- **Firebase Auth** — Google OAuth, session management
- **Lucide React** — icons

### Backend — `server/`
- **Node.js + Express** — REST API server on port 5000
- **Firebase Admin + Firestore** — auth verification and all data storage
- **Baileys** — WhatsApp Web protocol (QR scan, sessions, send/receive)
- **OpenAI API** — AI node completions, router intent classification
- **WebSocket (`ws`)** — real-time push to the frontend via `/ws`
- **Scheduler** — in-process cron for drip messages and appointment reminders

---

## Project structure

```
GrowCare/
├── client/                      # React + Vite frontend
│   └── src/
│       ├── App.jsx              # Route tree
│       ├── components/
│       │   ├── atoms/           # Button, Card, Input, Badge, Modal, Table …
│       │   ├── layout/          # DashboardLayout, Sidebar, Header
│       │   ├── Clinic/          # Patient-specific components
│       │   └── workflow/        # Node panels, edge types, canvas toolbar
│       ├── pages/
│       │   ├── dashboard/       # DashboardHub, WhatsAppHub, Workflows, Inbox …
│       │   ├── Clinic/          # PatientsPage, PatientDetailPage, NewPatientPage
│       │   └── WorkflowPage.jsx # Full-screen workflow editor
│       ├── services/            # API clients (flowService, waService, aiService …)
│       ├── lib/
│       │   ├── clinicData.js    # Static patient sample data
│       │   ├── workflowTemplates.js  # 6 built-in clinic flow templates
│       │   └── firebase.js      # Firebase client init
│       └── context/
│           └── AuthContext.jsx  # Auth state + login/logout
│
└── server/                      # Express backend
    └── src/
        ├── index.js             # Entry — Express, CORS, routes, WS, scheduler
        ├── config/
        │   ├── firebase.js      # Firebase Admin init
        │   └── ai.js            # OpenAI client
        ├── middleware/
        │   └── auth.js          # Firebase ID token verification
        ├── routes/
        │   ├── user.js          # /api/user — profile, onboarding, stats, anti-ban
        │   ├── wa.js            # /api/wa   — sessions, QR, send
        │   ├── flows.js         # /api/flows — CRUD + publish
        │   ├── templates.js     # /api/templates
        │   ├── inbox.js         # /api/inbox
        │   ├── bookings.js      # /api/bookings
        │   ├── products.js      # /api/products
        │   └── ai.js            # /api/ai
        └── services/
            ├── whatsappService.js   # Baileys session manager, message handler
            ├── workflowEngine.js    # Executes flow nodes on incoming messages
            ├── antiBan.js           # Number-safety enforcement
            ├── realtime.js          # WebSocket hub
            ├── scheduler.js         # Cron — drip messages, reminders
            ├── store.js             # Firestore read/write abstraction
            └── aiService.js         # OpenAI completions
```

---

## Pages and routes

| Route | Page | Description |
|---|---|---|
| `/dashboard` | Dashboard Hub | Clinic Snapshot · Appointments · Workflows tabs |
| `/dashboard/whatsapp` | WhatsApp Hub | Inbox · Broadcasts · Templates · Settings tabs |
| `/dashboard/patients` | Patients | Searchable patient list with status + specialty filters |
| `/dashboard/patients/new` | Create Patient | Side-by-side form — identity, department, risk, documents |
| `/dashboard/patients/:id` | Patient Detail | 3-column workspace — visits panel · chat · summary sidebar |
| `/workflow/:id` | Workflow Editor | Full-screen React Flow canvas with node palette |
| `/onboarding` | Onboarding | First-run profile setup |
| `/login` | Login | Google OAuth via Firebase |

---

## Dashboard Hub tabs

- **Clinic Snapshot** — live stats: messages in/out, connected WhatsApp numbers, published workflows, active contacts
- **Appointments** — upcoming bookings created by workflow booking nodes
- **Workflows** — list of all flows (draft / live), create from scratch or from a clinic template

## WhatsApp Hub tabs

- **Inbox** — all conversations, assign status, add notes, hand off to staff
- **Broadcasts** — send templated messages to a contact list in bulk
- **Templates** — save and manage reusable message templates
- **Settings** — connect WhatsApp numbers (QR scan), manage anti-ban config

---

## Patient workspace (3-column layout)

Inspired by a research notebook layout. Each column scrolls independently.

| Column | Contents |
|---|---|
| **Left — Visits & Sources** | Collapsible. Expandable visit cards, upcoming appointments, attached documents |
| **Center — Chat workspace** | Full-height. Tabs: **Chat** (AI over full record) · **Visit-wise** (timeline + issue flags) · **Progression** (trend chart + metric cards) |
| **Right — Summary** | Collapsible. Patient name/MRN/specialty at top, then collapsible sections: Summary · Signals (key metrics) · Active flags |

---

## Workflow engine

When a WhatsApp message arrives `workflowEngine` finds the matching published flow for that user and runs the next node. Node types:

| Node | What it does |
|---|---|
| `trigger` | Entry point — starts the flow on any inbound message |
| `condition` | Keyword match (contains / equals / starts-with) |
| `router` | GPT classifies intent into named routes with a confidence threshold |
| `send` | Send text, buttons, list, template, or media |
| `ai` | GPT reply using a custom system prompt |
| `booking` | Offer appointment slots; saves the chosen slot, sends confirmation |
| `schedule` | Delay a follow-up message by N seconds |
| `handoff` | Flag the conversation for staff review with a reason and note |
| `api` | HTTP POST to an external endpoint with a body template |
| `set` | Save a named variable onto the contact record |
| `payment` | Send a payment link with a CTA button |

### Built-in clinic templates

1. **Book Visit + Urgent Help** — smart router → booking / urgent triage / reschedule / fees / AI fallback
2. **Smart Front Desk** — sorts messages into billing, booking, department help, handoff, or FAQ
3. **Tests + Reports Desk** — upload reports, book diagnostic slots, check result status
4. **After Visit Follow-Up** — recovery questions, worsening symptoms, report upload, follow-up booking
5. **Review + Refill Care Flow** — chronic care reviews, prescription refills, home vitals collection
6. **Procedure Prep + Safety Check** — prep checklist, payment link, safety red-flag handoff, reschedule

---

## Anti-ban system

Protects connected WhatsApp numbers from being flagged or banned.

- **Human typing simulation** — randomised typing delay proportional to message length
- **Spintax** — `{Hi|Hello|Hey}` message variations to avoid identical sends
- **Warmup mode** — gradually increases volume for new numbers
- **Presets** — Conservative / Balanced / Aggressive delay profiles
- **Per-day cap** — configurable maximum messages per number per day

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/user/me` | Current user profile (creates on first call) |
| PATCH | `/api/user/me` | Update name, businessType, goal |
| POST | `/api/user/onboarding` | Complete onboarding |
| GET | `/api/user/stats` | Dashboard counts (messages, contacts, numbers, flows) |
| GET/PUT | `/api/user/antiban` | Read / update anti-ban config |
| GET/POST | `/api/wa/sessions` | List or create WhatsApp sessions |
| GET | `/api/wa/sessions/:id/qr` | QR code for scanning |
| POST | `/api/wa/send` | Send a message immediately |
| GET/POST | `/api/flows` | List or create workflows |
| GET/PUT/DELETE | `/api/flows/:id` | Read, update, or delete a flow |
| POST | `/api/flows/:id/publish` | Toggle live / draft |
| GET/POST | `/api/templates` | Message templates |
| GET | `/api/inbox` | Conversation list |
| GET/POST | `/api/bookings` | Appointment slots |
| POST | `/api/ai/complete` | Direct AI completion |
| GET/HEAD | `/health` | Health check |

---

## Getting started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore enabled
- A Google service account key (`serviceAccountKey.json`)
- An OpenAI API key

### Environment variables

**`server/.env`**
```
PORT=5000
OPENAI_API_KEY=sk-...
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
SKIP_WA_BOOT=1   # set to skip WhatsApp reconnect on local boot
```

**`client/.env`**
```
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000/ws
```

Firebase client config lives in `client/src/lib/firebase.js`. Set `firebaseEnabled = false` there to use dev bypass auth (localStorage flag `wa_dev_authed`).

### Run locally

```bash
# Backend
cd server
npm install
node src/index.js

# Frontend (separate terminal)
cd client
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:5000`.

---

## Auth flow

1. User visits `/dashboard` → `ProtectedRoute` checks `isAuthenticated` and `onboardingCompleted`
2. If not signed in → `/login` (Google OAuth popup via Firebase)
3. After sign-in, `onAuthStateChanged` fires → backend `/api/user/me` creates the profile record
4. If `onboardingCompleted = false` → `/onboarding` to fill name and clinic type
5. On completion → `/dashboard`
