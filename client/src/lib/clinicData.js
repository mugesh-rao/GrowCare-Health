export const clinicPatients = [
  {
    id: 'p-1001',
    mrn: 'GC-1001',
    name: 'Aarav Mehta',
    age: 58,
    gender: 'Male',
    phone: '+91 98765 43210',
    email: 'aarav.mehta@example.com',
    city: 'Chennai',
    specialty: 'Endocrinology',
    doctor: 'Dr. Nivedita Rao',
    status: 'Active',
    risk: 'High',
    condition: 'Type 2 diabetes with renal review pending',
    totalVisits: 12,
    totalReports: 8,
    nextAppointment: 'Jun 19, 2026 · 10:30 AM',
    lastVisit: 'Jun 02, 2026',
    lastVisitIso: '2026-06-02',
    summary:
      'Three-year diabetes history with worsening HbA1c trend, delayed nephrology review, and incomplete contrast allergy capture before imaging.',
    tags: ['Diabetes', 'Renal monitoring', 'Medication review'],
    alerts: [
      { tone: 'danger', title: 'No HbA1c recorded for 9 months before latest upload.' },
      { tone: 'warning', title: 'Contrast allergy history is still missing.' },
      { tone: 'info', title: 'Medication changed twice in the last 6 months.' },
    ],
    metrics: [
      { label: 'HbA1c', value: '8.4%', change: '+1.3% YoY', tone: 'danger' },
      { label: 'Creatinine', value: '1.4 mg/dL', change: 'Needs review', tone: 'warning' },
      { label: 'BP', value: '144/92', change: 'Above baseline', tone: 'warning' },
    ],
    trendSeries: [
      { label: 'Jan', value: 7.1 },
      { label: 'Feb', value: 7.4 },
      { label: 'Mar', value: 7.6 },
      { label: 'Apr', value: 7.8 },
      { label: 'May', value: 8.1 },
      { label: 'Jun', value: 8.4 },
    ],
    reportIssues: [
      {
        title: 'Renal trend deterioration',
        detail: 'Creatinine has moved up across the last three reports and needs contextual review.',
      },
      {
        title: 'Missing allergy confirmation',
        detail: 'Procedure planning note references contrast, but no contrast allergy is documented.',
      },
    ],
    visits: [
      {
        date: 'Jun 02, 2026',
        title: 'Follow-up review',
        detail: 'Medication escalated to improve glycemic control. Nephrology referral discussed.',
        badge: 'Completed',
      },
      {
        date: 'May 11, 2026',
        title: 'Lab result upload',
        detail: 'HbA1c and renal panel uploaded through WhatsApp by patient family member.',
        badge: 'Report added',
      },
      {
        date: 'Apr 21, 2026',
        title: 'Consultation',
        detail: 'Clinician noted poor adherence and recommended diet review and repeat testing.',
        badge: 'Completed',
      },
    ],
    appointments: [
      {
        date: 'Jun 19, 2026',
        title: 'In-person consult',
        detail: '30-minute follow-up with endocrinology desk.',
        badge: 'Booked',
      },
      {
        date: 'Jul 03, 2026',
        title: 'Lab reminder',
        detail: 'Repeat HbA1c and renal function test reminder sent to patient.',
        badge: 'Scheduled',
      },
    ],
    documents: [
      { name: 'Lab panel - May 2026.pdf', type: 'Lab report', uploadedAt: 'Jun 02, 2026' },
      { name: 'Renal summary note.docx', type: 'Clinical summary', uploadedAt: 'May 14, 2026' },
      { name: 'Prescription photo.jpg', type: 'Prescription', uploadedAt: 'Apr 21, 2026' },
    ],
    chat: [
      { role: 'user', text: 'What changed since the previous visit?' },
      {
        role: 'assistant',
        text: 'HbA1c increased from 7.8% to 8.4%, creatinine worsened slightly, and the plan now includes nephrology review.',
      },
      { role: 'user', text: 'What is still missing before the next procedure?' },
      {
        role: 'assistant',
        text: 'Contrast allergy history is missing, and the chart should include the most recent nephrology review.',
      },
    ],
  },
  {
    id: 'p-1002',
    mrn: 'GC-1002',
    name: 'Kavya Nair',
    age: 44,
    gender: 'Female',
    phone: '+91 99887 66554',
    email: 'kavya.nair@example.com',
    city: 'Bengaluru',
    specialty: 'Ophthalmology',
    doctor: 'Dr. Nitin Jose',
    status: 'Monitoring',
    risk: 'Medium',
    condition: 'Retina follow-up with OCT progression tracking',
    totalVisits: 9,
    totalReports: 11,
    nextAppointment: 'Jun 21, 2026 · 04:00 PM',
    lastVisit: 'Jun 08, 2026',
    lastVisitIso: '2026-06-08',
    summary:
      'Retinal follow-up case with multiple OCT uploads, trend review required, and a clean medication history but delayed image comparison note.',
    tags: ['OCT', 'Retina', 'Progression watch'],
    alerts: [
      { tone: 'warning', title: 'Latest OCT report lacks comparison comment to prior scan.' },
      { tone: 'info', title: 'Next visit should include pressure re-check.' },
    ],
    metrics: [
      { label: 'IOP', value: '19 mmHg', change: 'Stable', tone: 'success' },
      { label: 'RNFL', value: '78 um', change: '-3 um', tone: 'warning' },
      { label: 'Vision', value: '6/9', change: 'Stable', tone: 'success' },
    ],
    trendSeries: [
      { label: 'Jan', value: 84 },
      { label: 'Feb', value: 83 },
      { label: 'Mar', value: 82 },
      { label: 'Apr', value: 80 },
      { label: 'May', value: 79 },
      { label: 'Jun', value: 78 },
    ],
    reportIssues: [
      {
        title: 'Comparative review gap',
        detail: 'The current OCT upload is present, but the summary does not compare it against the prior visit.',
      },
    ],
    visits: [
      {
        date: 'Jun 08, 2026',
        title: 'Retina review',
        detail: 'OCT reviewed; clinician requested annotated comparison at next check-in.',
        badge: 'Completed',
      },
      {
        date: 'May 06, 2026',
        title: 'Imaging upload',
        detail: 'Two OCT scans and one referral note attached from outside center.',
        badge: 'Report added',
      },
    ],
    appointments: [
      {
        date: 'Jun 21, 2026',
        title: 'OCT + review',
        detail: 'Repeat imaging and retina consult.',
        badge: 'Booked',
      },
    ],
    documents: [
      { name: 'OCT right eye.dcm', type: 'Imaging', uploadedAt: 'Jun 08, 2026' },
      { name: 'Retina follow-up note.pdf', type: 'Clinical summary', uploadedAt: 'Jun 08, 2026' },
    ],
    chat: [
      { role: 'user', text: 'Summarize the imaging progression.' },
      {
        role: 'assistant',
        text: 'RNFL thickness has gradually declined across the last six uploads. The main gap is the missing comparative interpretation note.',
      },
    ],
  },
  {
    id: 'p-1003',
    mrn: 'GC-1003',
    name: 'Rehan Ali',
    age: 63,
    gender: 'Male',
    phone: '+91 91234 00881',
    email: 'rehan.ali@example.com',
    city: 'Hyderabad',
    specialty: 'Oncology',
    doctor: 'Dr. Shreya Mukherjee',
    status: 'Active',
    risk: 'High',
    condition: 'Oncology follow-up with delayed tumor marker update',
    totalVisits: 16,
    totalReports: 14,
    nextAppointment: 'Jun 24, 2026 · 09:15 AM',
    lastVisit: 'Jun 10, 2026',
    lastVisitIso: '2026-06-10',
    summary:
      'Longitudinal oncology follow-up with mixed documentation sources, pending tumor marker refresh, and multiple outside reports needing consolidation.',
    tags: ['Oncology', 'Tumor marker', 'Outside reports'],
    alerts: [
      { tone: 'danger', title: 'Tumor marker update is overdue by 6 weeks.' },
      { tone: 'warning', title: 'Outside imaging summary is attached but not normalized yet.' },
    ],
    metrics: [
      { label: 'Marker', value: '42 U/mL', change: '+8 U/mL', tone: 'danger' },
      { label: 'Weight', value: '67 kg', change: '-1.2 kg', tone: 'warning' },
      { label: 'ECOG', value: '1', change: 'Stable', tone: 'success' },
    ],
    trendSeries: [
      { label: 'Jan', value: 18 },
      { label: 'Feb', value: 22 },
      { label: 'Mar', value: 24 },
      { label: 'Apr', value: 30 },
      { label: 'May', value: 34 },
      { label: 'Jun', value: 42 },
    ],
    reportIssues: [
      {
        title: 'Marker trend escalation',
        detail: 'Tumor marker trajectory is rising and should be highlighted during next review.',
      },
      {
        title: 'Normalization pending',
        detail: 'Outside imaging summary remains attached as PDF only and is not structured yet.',
      },
    ],
    visits: [
      {
        date: 'Jun 10, 2026',
        title: 'Treatment review',
        detail: 'Latest symptoms stable, but pending marker update and outside report review.',
        badge: 'Completed',
      },
      {
        date: 'May 02, 2026',
        title: 'Discharge summary upload',
        detail: 'Outside center summary attached by caregiver over chat.',
        badge: 'Report added',
      },
    ],
    appointments: [
      {
        date: 'Jun 24, 2026',
        title: 'Oncology follow-up',
        detail: 'Needs tumor marker and imaging summary review before consult.',
        badge: 'Booked',
      },
    ],
    documents: [
      { name: 'Tumor marker trend.xlsx', type: 'Lab report', uploadedAt: 'Jun 10, 2026' },
      { name: 'Outside discharge summary.pdf', type: 'Discharge summary', uploadedAt: 'May 02, 2026' },
    ],
    chat: [
      { role: 'user', text: 'What should the doctor review first?' },
      {
        role: 'assistant',
        text: 'Review the rising tumor marker trend first, then compare the outside imaging summary against the last in-house visit note.',
      },
    ],
  },
  {
    id: 'p-1004',
    mrn: 'GC-1004',
    name: 'Meera Iyer',
    age: 51,
    gender: 'Female',
    phone: '+91 90012 22244',
    email: 'meera.iyer@example.com',
    city: 'Coimbatore',
    specialty: 'Cardiology',
    doctor: 'Dr. Harish Menon',
    status: 'New',
    risk: 'Low',
    condition: 'New cardiac prevention intake with imported lab history',
    totalVisits: 3,
    totalReports: 5,
    nextAppointment: 'Jun 18, 2026 · 11:45 AM',
    lastVisit: 'Jun 12, 2026',
    lastVisitIso: '2026-06-12',
    summary:
      'New patient intake with historical lipid profile uploads, early prevention plan, and one pending family history form.',
    tags: ['Cardiology', 'Prevention', 'New intake'],
    alerts: [
      { tone: 'info', title: 'Family history form is still pending.' },
    ],
    metrics: [
      { label: 'LDL', value: '126 mg/dL', change: 'Needs lifestyle plan', tone: 'warning' },
      { label: 'BP', value: '128/82', change: 'Near target', tone: 'success' },
      { label: 'ECG', value: 'Normal', change: 'No issue', tone: 'success' },
    ],
    trendSeries: [
      { label: 'Jan', value: 138 },
      { label: 'Feb', value: 136 },
      { label: 'Mar', value: 133 },
      { label: 'Apr', value: 131 },
      { label: 'May', value: 129 },
      { label: 'Jun', value: 126 },
    ],
    reportIssues: [
      {
        title: 'Family history missing',
        detail: 'Risk intake is otherwise complete, but hereditary context has not been attached yet.',
      },
    ],
    visits: [
      {
        date: 'Jun 12, 2026',
        title: 'New intake',
        detail: 'Vitals recorded and lipid history uploaded from prior clinic reports.',
        badge: 'Completed',
      },
    ],
    appointments: [
      {
        date: 'Jun 18, 2026',
        title: 'Preventive consult',
        detail: 'Family history form to be completed before visit.',
        badge: 'Booked',
      },
    ],
    documents: [
      { name: 'Lipid history.pdf', type: 'Lab report', uploadedAt: 'Jun 12, 2026' },
      { name: 'ECG scan.jpg', type: 'Imaging', uploadedAt: 'Jun 12, 2026' },
    ],
    chat: [
      { role: 'user', text: 'What is still missing in intake?' },
      {
        role: 'assistant',
        text: 'Family history is still pending. Core labs, ECG, and baseline vitals are already attached.',
      },
    ],
  },
]

export const specialtyOptions = ['All specialties', 'Endocrinology', 'Ophthalmology', 'Oncology', 'Cardiology']
export const riskOptions = ['All risks', 'High', 'Medium', 'Low']
export const statusOptions = ['All statuses', 'Active', 'Monitoring', 'New']

export const clinicSummaryStats = [
  {
    id: 'total',
    label: 'Total patients',
    value: clinicPatients.length,
    detail: 'Across all active sample records',
  },
  {
    id: 'active',
    label: 'Active treatment',
    value: clinicPatients.filter((patient) => patient.status === 'Active').length,
    detail: 'Patients with ongoing care plans',
  },
  {
    id: 'flagged',
    label: 'Flagged records',
    value: clinicPatients.filter((patient) => patient.alerts.some((alert) => alert.tone === 'danger')).length,
    detail: 'Need clinician attention or missing data review',
  },
  {
    id: 'reports',
    label: 'Linked documents',
    value: clinicPatients.reduce((total, patient) => total + patient.totalReports, 0),
    detail: 'Reports, prescriptions, and imaging uploads',
  },
]

export function filterClinicPatients(patients, filters) {
  const query = filters.query.trim().toLowerCase()

  return patients.filter((patient) => {
    const matchesQuery =
      !query ||
      patient.name.toLowerCase().includes(query) ||
      patient.mrn.toLowerCase().includes(query) ||
      patient.condition.toLowerCase().includes(query) ||
      patient.specialty.toLowerCase().includes(query)

    const matchesStatus =
      !filters.status || filters.status === 'All statuses' || patient.status === filters.status

    return matchesQuery && matchesStatus
  })
}

export function getClinicPatientById(patientId) {
  return clinicPatients.find((patient) => patient.id === patientId)
}
