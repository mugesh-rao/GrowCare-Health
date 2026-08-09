# GrowCare — Technical Architecture

Local-first Tauri desktop app. A bundled Node.js server does all the real work (WhatsApp/Baileys, workflow engine, clinical API, local SQLite); Rust only owns the window and process lifecycle. No cloud dependency — everything below assumes a single PC or a handful of PCs on the same LAN/hotspot with no internet required.

```text
React + Vite (webview)
        │  Tauri IPC (window controls, config only)
        ▼
Rust (src-tauri) ── spawns/kills ──▶ Node server (server/)
        │                                  │
        │                          HTTP + WS on 127.0.0.1:17842
        ▼                                  ▼
   window/OS only                 node:sqlite (growcare.sqlite3)
                                   Baileys / workflow engine / clinical API
```

## 1. How the Node "sidecar" actually works here

This app does **not** use Tauri's official `externalBin` sidecar recipe (a single compiled binary per target-triple, launched via the shell plugin). It uses a simpler variant that fits an app with real `node_modules` (native deps like Baileys' crypto bindings) instead of one that can be `pkg`/`bun`-compiled into a single file:

- `scripts/prepare-tauri-resources.mjs` runs before every `dev`/`build`. It copies `server/` (minus `node_modules`, `.data`, logs) into `src-tauri/resources/server`, copies the full `server/node_modules` in once, and drops a copy of the current `node.exe`/`node` binary into `src-tauri/resources/node`.
- `tauri.conf.json` bundles `resources/node` and `resources/server` as plain **resources**, not `externalBin`. No shell-plugin permissions are declared (`capabilities/default.json` only has `core:default`) because Rust never asks Tauri to run the process — it does it directly.
- `src-tauri/src/lib.rs` (`start_local_server`) resolves the resource dir, then runs `Command::new(node).arg(entrypoint)` itself with `std::process::Command`, passing `APP_DATA_DIR` (Tauri's `app_data_dir()`) and a fixed `PORT=17842`. stdout/stderr are piped to log files in the app data dir.
- On startup, Rust polls `127.0.0.1:17842` until the server answers, then shows the (initially hidden) window. On `ExitRequested`, it kills the child process so no orphaned `node.exe` survives the app closing.
- End result for the customer: no separate Node install, no npm — the installer ships a real `node.exe` next to the app and everything talks over loopback HTTP/WS.

## 2. Local storage

**Structured data — implemented.** `server/src/services/core/store.js` uses Node's **built-in `node:sqlite`** (`DatabaseSync`) — zero extra dependency, no native module to rebuild per Electron/Tauri target. It keeps a single `documents` table (`path`, `collection_path`, `id`, `data` JSON) that mirrors the old Firestore-style `collection/doc` API the routes were written against, so the whole app moved off Firebase without touching route code. DB file: `${APP_DATA_DIR}/growcare.sqlite3`, `PRAGMA journal_mode = WAL`.

> Stability: unflagged since Node 22.13/23.4, Release Candidate as of Node 24. Fine here — single local writer, no distributed access.

**Images & documents — current state, needs to change.** `routes/clinical.js` (`POST /patients/:id/artifacts`) currently stores uploaded files as a **base64 string inside the same JSON `data` column** (`fileData`, capped at ~14,000,000 chars ≈ 14 MB decoded). That works but doesn't scale for a clinic uploading scans/PDFs: base64 adds ~33% size overhead, bloats the `.sqlite3` file and its WAL, slows `VACUUM`/backup, and gives no de-dup.

**Database decision.** SQLite remains GrowCare's source of truth; we will not move primary records to NeDB. Patients, encounters, observations, scribe sessions, appointments, messages, workflows, and scheduled actions need reliable IDs, indexes, relationships, and atomic multi-write updates. The current document-shaped adapter is an application-layer convenience, not a limitation of SQLite. Existing routes keep their path API while explicit indexes/tables are added only for proven query needs and flexible clinical details stay in JSON fields.

**Storage decision.** GrowCare is local-only. There is no S3, cloud replication, presigned URL, or cloud-storage package. Files remain on the clinic PC for offline-first access and are never uploaded by the app.

Selected local-file implementation (not yet implemented):
- Write the raw bytes to disk under `${APP_DATA_DIR}/documents/<patientId>/<sha256>-<fileName>` instead of embedding them in JSON.
- Keep only metadata in the existing `documents` table row (`fileName`, `kind`, `mimeType`, `filePath`, `sizeBytes`, `sha256`, `createdAt`) — same table, just drop the giant base64 field.
- Hash-on-write gives free de-dup and integrity checks, which matters for clinical documents.
- The local Node server streams uploads to a temporary file, calculates SHA-256 while writing, validates the file, then atomically renames it into the patient directory. Fetches stream from local disk and support HTTP range requests for PDF, image, audio, and video previews.
- Backups must include both `growcare.sqlite3` and the `documents/` tree. Use Windows user-profile/app-data protection and full-disk encryption such as BitLocker for clinic deployments.

## 3. LAN/hotspot device pairing (planned, not yet implemented)

Goal: one PC creates a Wi-Fi hotspot (or later, a real router/AP), other clinic PCs join it, and GrowCare instances find and message each other with no internet and no manual IP entry.

- Windows has no reliable OS-level API for listing hotspot clients — the Mobile Hotspot UI only shows a count, `arp -a`/`Get-NetTCPConnection` give raw IP/MAC with no names, and the old `netsh wlan show hostednetwork` path is deprecated since Win10. **Don't build device detection against the OS hotspot layer.**
- Do it at the application layer instead: each GrowCare instance advertises itself over mDNS/local UDP broadcast; a device that wants in sends a pairing request to the elected local server, and a logged-in staff member accepts/denies it (simple "Doctor Room 2 is requesting to connect — Accept / Busy" prompt). Accepted devices go on an allow-list stored in `growcare.sqlite3` and then talk over the same local WebSocket the app already uses internally.
- Treat the hotspot as nothing but the network cable — the server already binds to a fixed host/port (`127.0.0.1:17842` today, would become `0.0.0.0:17842` for LAN mode), so swapping a phone/laptop hotspot for a proper router later needs no app changes.

## Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Desktop shell | Tauri v2 (Rust) | window lifecycle, spawns/kills the Node server, no shell-plugin sidecar |
| Frontend | React + Vite | `client/` |
| Local server | Node.js + Express, bundled as a resource (not `externalBin`) | `server/`, port 17842 |
| WhatsApp | Baileys | inside the Node server |
| Local DB | `node:sqlite` (built-in) | JSON-document store, WAL mode |
| File storage | Filesystem under `APP_DATA_DIR` (recommended, not yet built) | keyed by sha256, metadata in SQLite |
| LAN pairing | mDNS/UDP broadcast + app-level accept flow (planned) | OS hotspot APIs unreliable, so this stays app-layer |

## Service-domain layout

`server/src/services/` is now organized by product capability:

```text
core/       SQLite store, realtime hub, local LAN pairing
whatsapp/   Baileys, QR/auth, payloads, templates, safety, scheduling
workflow/   Flow execution engine
clinical/   Local file vault and clinical intelligence pipeline
ai/         Shared OpenAI key/model resolution and general AI helpers
```

Clinical sources are saved as local files under `${APP_DATA_DIR}/documents/<patientId>/` and their metadata/extracted JSON is saved in SQLite. `clinical/intelligence.js` owns source processing, structured extraction, patient context, and grounded record chat. Future clinical agents must be added under `clinical/agents/` by responsibility, leaving routes as small HTTP orchestrators.
