# Server service domains

The service layer is organized by product capability. Routes validate HTTP input and then delegate to a domain or the shared core.

```text
services/
  core/       SQLite document store, realtime hub, local network pairing
  whatsapp/   Baileys sessions, QR/auth state, sending, templates, safety, scheduler
  workflow/   Workflow execution engine
  clinical/   Local file vault and clinical intelligence pipeline
  ai/         Shared local OpenAI credential resolution and general AI helpers
```

## Clinical

`files.js` owns the local patient source vault. `intelligence.js` owns OpenAI source processing, JSON-schema extraction, patient context, and grounded chat. Future clinical agents belong under `clinical/agents/`, one bounded responsibility per file. Keep file I/O and model prompts out of the route layer.

The local device remains the system of record. An explicit clinical action may send only the selected source/context to OpenAI through the one locally configured API key. The returned draft and structured data are saved back into local SQLite.
