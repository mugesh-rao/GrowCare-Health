const addDaysInput = (days, hour = 10, minute = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const SAMPLES = [
  {
    id: 'appointment-buttons',
    name: 'Appointment Actions',
    type: 'buttons',
    description: 'Quick actions for booking, rescheduling, and speaking with reception.',
    payload: {
      name: 'Appointment actions',
      sendMode: 'buttons',
      title: 'Need help with your visit?',
      text: 'Choose one of the options below.',
      footer: 'GrowCare Clinic',
      buttons: [
        { type: 'quick_reply', label: 'Book visit', id: 'book_visit' },
        { type: 'quick_reply', label: 'Reschedule', id: 'reschedule_visit' },
        { type: 'cta_call', label: 'Call reception', phoneNumber: '+911234567890' },
      ],
    },
  },
  {
    id: 'visit-list',
    name: 'Visit Options List',
    type: 'list',
    description: 'Send a structured menu of common clinic actions and departments.',
    payload: {
      name: 'Visit options list',
      sendMode: 'list',
      text: 'Pick what you need help with.',
      footer: 'Select one option',
      list: {
        title: 'Clinic menu',
        buttonText: 'Choose option',
        sections: [
          {
            title: 'Appointments',
            rows: [
              { title: 'Book appointment', description: 'Choose a consultation time', rowId: 'book_visit' },
              { title: 'Reschedule visit', description: 'Change an existing appointment', rowId: 'reschedule_visit' },
            ],
          },
          {
            title: 'Support',
            rows: [
              { title: 'Prescription help', description: 'Ask about medicines or follow-up instructions', rowId: 'prescription_help' },
              { title: 'Talk to reception', description: 'Request human support from the clinic team', rowId: 'agent' },
            ],
          },
        ],
      },
    },
  },
  {
    id: 'health-camp-event',
    name: 'Health Camp Event',
    type: 'event',
    description: 'WhatsApp event invite for a vaccination drive or clinic camp.',
    payload: {
      name: 'Health camp invite',
      sendMode: 'event',
      event: {
        name: 'Diabetes Screening Camp',
        description: 'Join us for a free screening and doctor Q&A session.',
        startDate: addDaysInput(7, 11, 0),
        endDate: addDaysInput(7, 13, 0),
        callType: 'video',
        locationName: '',
        locationAddress: '',
        latitude: '',
        longitude: '',
        extraGuestsAllowed: true,
        isCancelled: false,
        isScheduleCall: false,
      },
    },
  },
  {
    id: 'followup-carousel',
    name: 'Follow-Up Carousel',
    type: 'carousel',
    description: 'Three follow-up cards for prep, reports, and billing actions.',
    payload: {
      name: 'Follow-up carousel',
      sendMode: 'carousel',
      text: 'Choose what you want to do next.',
      footer: 'GrowCare Clinic',
      carousel: {
        cards: [
          {
            caption: 'Upload reports',
            footer: 'Share test results before your visit',
            imageUrl: 'https://picsum.photos/seed/growcare-reports/640/480',
            imageDataUrl: '',
            buttons: [
              { type: 'cta_url', label: 'Upload now', url: 'https://example.com/reports' },
              { type: 'quick_reply', label: 'Need help', id: 'report_help' },
            ],
          },
          {
            caption: 'Visit preparation',
            footer: 'Bring old prescriptions and test files',
            imageUrl: 'https://picsum.photos/seed/growcare-prep/640/480',
            imageDataUrl: '',
            buttons: [
              { type: 'cta_url', label: 'Open checklist', url: 'https://example.com/checklist' },
              { type: 'quick_reply', label: 'Ask question', id: 'prep_help' },
            ],
          },
          {
            caption: 'Billing support',
            footer: 'Review consultation charges and receipts',
            imageUrl: 'https://picsum.photos/seed/growcare-billing/640/480',
            imageDataUrl: '',
            buttons: [
              { type: 'cta_url', label: 'View receipt', url: 'https://example.com/billing' },
              { type: 'quick_reply', label: 'Talk to desk', id: 'billing_help' },
            ],
          },
        ],
      },
    },
  },
  {
    id: 'callback-buttons',
    name: 'Callback Buttons',
    type: 'buttons',
    description: 'Simple CTA buttons for callback and patient support flows.',
    payload: {
      name: 'Callback actions',
      sendMode: 'buttons',
      text: 'How can we help you today?',
      footer: '',
      buttons: [
        { type: 'quick_reply', label: 'Book appointment', id: 'book_visit' },
        { type: 'quick_reply', label: 'Lab reports', id: 'lab_reports' },
        { type: 'quick_reply', label: 'Talk to desk', id: 'support' },
      ],
    },
  },
  {
    id: 'hydrated-intake',
    name: 'Hydrated Intake Template',
    type: 'template',
    description: 'Image header with buttons for completing pre-visit intake.',
    payload: {
      name: 'Pre-visit intake template',
      sendMode: 'template',
      template: {
        title: 'Complete your intake',
        text: 'Hi {{name}}, please share your symptoms and any previous reports before the visit.',
        footer: 'Tap a button to continue',
        imageUrl: 'https://picsum.photos/seed/growcare-template/640/480',
        imageDataUrl: '',
        buttons: [
          { type: 'quick_reply', label: 'Share symptoms', id: 'share_symptoms' },
          { type: 'cta_url', label: 'Upload reports', url: 'https://example.com/intake' },
        ],
      },
    },
  },
]

const clone = (value) => JSON.parse(JSON.stringify(value))

export const sampleTemplateList = () =>
  SAMPLES.map((sample) => ({
    id: sample.id,
    name: sample.name,
    type: sample.type,
    description: sample.description,
    payload: clone(sample.payload),
  }))
