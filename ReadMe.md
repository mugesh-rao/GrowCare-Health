# GrowCare

GrowCare is a local-first clinic desktop application. It combines patient records, consultations, appointments, WhatsApp, workflows, and optional AI assistance in one Tauri application.

## Local-only architecture

- **Desktop shell:** Tauri v2
- **Frontend:** React, Vite, Tailwind CSS, Lucide icons, React Flow
- **Local server:** Node.js + Express, started automatically by Tauri
- **Application database:** SQLite through Node's built-in `node:sqlite` module
- **Realtime:** local WebSocket connection on the loopback interface
- **Documents:** application data stays in the GrowCare app-data directory

GrowCare does not use Firebase, Firestore, Firebase Authentication, Google OAuth, or any cloud database. The app opens directly into the local workspace. Profile details, patients, consultations, appointments, WhatsApp session state, workflows, templates, and settings are stored locally in `growcare.sqlite3`.

Optional integrations are explicit: connecting WhatsApp communicates with WhatsApp, and enabling an OpenAI feature sends only the consented request data to OpenAI using the API key stored in the local workspace. Neither integration changes where GrowCare stores its own data.

## Running the desktop application

Prerequisites:

- Node.js 22.5 or later
- Rust toolchain and the Windows build tools required by Tauri

Install project dependencies, then run:

```bash
npm run dev
```

This single command prepares the embedded Node resources, starts the Vite frontend, opens the Tauri desktop application, and starts the local Node server automatically. The server listens only on `127.0.0.1`; its default port is `2238` and GrowCare remembers a locally selected port if it changes.

The packaged desktop build is created with:

```bash
npm run build
```

## Main areas

- **Dashboard:** local clinic snapshot and activity.
- **Patients:** create, filter, open, and manage patient records.
- **Scribe:** patient-specific consultation recording, transcript, and clinician-review draft.
- **WhatsApp:** QR pairing, inbox, templates, and number-safety settings.
- **Workflows:** create, edit, save, and publish React Flow automation journeys.
- **Bookings:** create and manage appointments independently of workflows.
- **Settings:** My Information, WhatsApp pairing and safety, shared local AI settings, and local network pairing.

## Local data and backup

The desktop app stores its workspace in the operating system's GrowCare app-data directory. Back up the SQLite database together with the application document directory while GrowCare is closed. Use full-disk encryption or equivalent Windows protection for machines that contain patient data.

## Optional AI configuration

In **Settings → AI**, provide an OpenAI API key and choose a default model. The key is stored locally and is write-only in the user interface: it is never returned to the browser after saving. Workflow AI actions use the shared local key. Scribe drafting remains local unless the "Use for scribe drafts" option is turned on; that option clearly discloses the external OpenAI request and retains the local draft fallback.
