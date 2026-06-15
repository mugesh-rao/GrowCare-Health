The PRD describes a large healthcare platform, but the current codebase is a WhatsApp automation product with
  dashboard, inbox, workflows, bookings, bulk messaging, templates, and settings, not yet a clinical data OS. You can
  see that in client/src/App.jsx:35, client/src/components/layout/Sidebar.jsx:20, and the existing API target in client/
  src/services/api.js:11. The strongest signal is that you already have a clinic-specific workflow template plus
  workflow nodes for booking, reminders, API sync, AI routing, and human handoff in client/src/lib/
  workflowTemplates.js:124, client/src/pages/WorkflowPage.jsx:69, and server/src/services/workflowEngine.js:428.

  So the right BRD for phase 1 is:

  GrowCare = a WhatsApp-based patient engagement and clinic front-desk automation platform for small and mid-size
  clinics.

  It should solve these immediate business problems:

  - missed appointments and no-shows
  - overloaded reception/front-desk staff
  - slow patient response on WhatsApp
  - weak follow-up and recall workflows
  - poor handoff between bot and human staff

  Top 4 Crucial Features To Implement First

  1. AI Appointment Booking + FAQ Router
     Solves: manual appointment handling, repeated patient questions, missed leads.
     What to build: patients ask on WhatsApp, AI answers basic clinic FAQs, offers slots, confirms appointments, and
     hands sensitive cases to staff.
     Why first: this already matches your booking, router, and handoff architecture.

  2. Pre-Visit Intake and Case Capture
     Solves: front desk collecting the same details repeatedly and doctors getting incomplete visit context.
     What to build: before appointment confirmation, collect reason for visit, symptoms, doctor preference, old
     prescription/report upload, and push structured data to clinic software or Google Sheet/API.
     Why first: you already support API actions and field-setting in workflows.

  3. Automated Follow-Up and Reminder Journeys
     Solves: no-shows, drop-offs after consultation, missed lab/review reminders.
     What to build: appointment reminders, post-visit care instructions, medicine/lab reminders, and follow-up nudges
     based on visit type.
     Why first: your engine already supports scheduled follow-ups and booking reminders.

  4. Shared Patient Inbox for Staff
     Solves: scattered WhatsApp chats, no ownership, poor escalation handling.
     What to build: a clinic team inbox with patient status, notes, tags, bot pause/resume, and manual reply flow, based
     on the current inbox in client/src/pages/dashboard/Inbox.jsx:11.
     Why first: this is already largely present and only needs healthcare-specific adaptation.

  Priority Call

  Do not start with OCR, FHIR, patient timeline, ICD coding, or full clinical intelligence yet. I found no real
  implementation of those PRD modules in the repo, so they are phase 2 or phase 3. Phase 1 should be the clinic
  communication and workflow layer, because that is what the current product can ship fastest.

  If you want, I can turn this into a clean MVP / V1 / V2 roadmap next