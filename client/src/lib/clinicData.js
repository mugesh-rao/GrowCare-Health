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
    primaryMetricName: 'HbA1c (%)',
    progressionSignal: '🔴 HbA1c has risen from 7.1% to 8.4% over 6 months — upward trajectory suggests current treatment is insufficient. Creatinine also trending up. Medical review and possible dose change recommended.',
    reportIssues: [
      { title: 'Renal trend deterioration', detail: 'Creatinine has moved up across the last three reports and needs contextual review.' },
      { title: 'Missing allergy confirmation', detail: 'Procedure planning note references contrast, but no contrast allergy is documented.' },
    ],
    briefingCard: {
      flagLevel: 'red',
      visitDaysAgo: 14,
      aiSummary: 'Aarav Mehta — 12th visit for Type 2 Diabetes. HbA1c at 8.4%, up from 7.8% at last visit. Creatinine now 1.4 mg/dL — approaching Metformin safety threshold. Medication refill reminder sent 6 days ago — no response. Contrast allergy history still undocumented before planned imaging.',
      medicationCompliance: 'uncertain',
      labStatus: 'Creatinine 1.4 mg/dL — above target',
      recommendedFocus: 'Confirm contrast allergy status before imaging. Discuss nephrology referral. Consider reducing Metformin dose given Creatinine trend.',
    },
    betweenVisitAlerts: [
      { checkInDay: 'Day 3', question: 'Are you taking your medicines as prescribed?', patientResponse: 'YES', flagged: false, date: 'Jun 05, 2026' },
      { checkInDay: 'Day 7', question: 'Any dizziness or unusual symptoms since your last visit?', patientResponse: 'Yes — some swelling in legs at night', flagged: true, date: 'Jun 09, 2026' },
      { checkInDay: 'Day 14', question: 'Have you completed your lab tests? Please upload the report.', patientResponse: 'No response', flagged: false, date: 'Jun 16, 2026' },
    ],
    prescriptions: [
      { drug: 'Metformin 500mg', route: 'Oral', dose: '1-0-1', duration: 'Ongoing', since: 'Mar 2023', warning: '⚠️ Creatinine 1.4 mg/dL is near safety threshold — consider dose reduction or switch.' },
      { drug: 'Amlodipine 5mg', route: 'Oral', dose: '0-0-1', duration: 'Ongoing', since: 'Jan 2024', warning: null },
      { drug: 'Telmisartan 40mg', route: 'Oral', dose: '1-0-0', duration: 'Ongoing', since: 'Apr 2026', warning: '⚠️ ARB class + elevated Creatinine — monitor renal function. Get nephrologist input before increasing dose.' },
    ],
    visits: [
      { date: 'Jun 02, 2026', title: 'Follow-up review', detail: 'Medication escalated to improve glycemic control. Nephrology referral discussed.', badge: 'Completed' },
      { date: 'May 11, 2026', title: 'Lab result upload', detail: 'HbA1c and renal panel uploaded through WhatsApp by patient family member.', badge: 'Report added' },
      { date: 'Apr 21, 2026', title: 'Consultation', detail: 'Clinician noted poor adherence and recommended diet review and repeat testing.', badge: 'Completed' },
    ],
    appointments: [
      { date: 'Jun 19, 2026', title: 'In-person consult', detail: '30-minute follow-up with endocrinology desk.', badge: 'Booked' },
      { date: 'Jul 03, 2026', title: 'Lab reminder', detail: 'Repeat HbA1c and renal function test reminder sent to patient.', badge: 'Scheduled' },
    ],
    documents: [
      { name: 'Lab panel - May 2026.pdf', type: 'Lab report', uploadedAt: 'Jun 02, 2026' },
      { name: 'Renal summary note.docx', type: 'Clinical summary', uploadedAt: 'May 14, 2026' },
      { name: 'Prescription photo.jpg', type: 'Prescription', uploadedAt: 'Apr 21, 2026' },
    ],
    chat: [
      { role: 'user', text: 'What changed since the previous visit?' },
      { role: 'assistant', text: 'HbA1c increased from 7.8% to 8.4%, creatinine worsened slightly, and the plan now includes nephrology review.' },
      { role: 'user', text: 'What is still missing before the next procedure?' },
      { role: 'assistant', text: 'Contrast allergy history is missing, and the chart should include the most recent nephrology review.' },
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
    summary: 'Retinal follow-up case with multiple OCT uploads, trend review required, and a clean medication history but delayed image comparison note.',
    tags: ['OCT', 'Retina', 'Progression watch'],
    alerts: [
      { tone: 'warning', title: 'Latest OCT report lacks comparison comment to prior scan.' },
      { tone: 'info', title: 'Next visit should include pressure re-check.' },
    ],
    metrics: [
      { label: 'IOP', value: '19 mmHg', change: 'Stable', tone: 'success' },
      { label: 'RNFL', value: '78 µm', change: '-3 µm', tone: 'warning' },
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
    primaryMetricName: 'RNFL Thickness (µm)',
    progressionSignal: '🟡 RNFL thickness declining gradually (84 → 78 µm over 6 months). Pattern consistent with slow progression. Compare against normative database and consider pressure management review.',
    reportIssues: [
      { title: 'Comparative review gap', detail: 'The current OCT upload is present, but the summary does not compare it against the prior visit.' },
    ],
    briefingCard: {
      flagLevel: 'amber',
      visitDaysAgo: 8,
      aiSummary: 'Kavya Nair — 9th visit for retinal follow-up. RNFL at 78µm, down from 84µm six months ago. IOP stable at 19mmHg. Latest OCT uploaded but not compared against prior scan — this comparison is the key gap before today\'s visit. Medication history clean, no compliance issues.',
      medicationCompliance: 'compliant',
      labStatus: 'RNFL 78µm — gradual decline trend',
      recommendedFocus: 'Review OCT against prior January scan. Confirm IOP reading. Ask about visual disturbances, floaters, or changes in peripheral vision since last visit.',
    },
    betweenVisitAlerts: [
      { checkInDay: 'Day 5', question: 'Any change in your vision or new floaters?', patientResponse: 'No change, all fine', flagged: false, date: 'Jun 13, 2026' },
    ],
    prescriptions: [
      { drug: 'Latanoprost 0.005%', route: 'Eye drops', dose: '1 drop at night', duration: 'Ongoing', since: 'Feb 2025', warning: null },
    ],
    visits: [
      { date: 'Jun 08, 2026', title: 'Retina review', detail: 'OCT reviewed; clinician requested annotated comparison at next check-in.', badge: 'Completed' },
      { date: 'May 06, 2026', title: 'Imaging upload', detail: 'Two OCT scans and one referral note attached from outside center.', badge: 'Report added' },
    ],
    appointments: [
      { date: 'Jun 21, 2026', title: 'OCT + review', detail: 'Repeat imaging and retina consult.', badge: 'Booked' },
    ],
    documents: [
      { name: 'OCT right eye.dcm', type: 'Imaging', uploadedAt: 'Jun 08, 2026' },
      { name: 'Retina follow-up note.pdf', type: 'Clinical summary', uploadedAt: 'Jun 08, 2026' },
    ],
    chat: [
      { role: 'user', text: 'Summarize the imaging progression.' },
      { role: 'assistant', text: 'RNFL thickness has gradually declined across the last six uploads. The main gap is the missing comparative interpretation note on the latest OCT.' },
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
    summary: 'Longitudinal oncology follow-up with mixed documentation sources, pending tumor marker refresh, and multiple outside reports needing consolidation.',
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
    primaryMetricName: 'Tumor Marker (U/mL)',
    progressionSignal: '🔴 Tumor marker rising sharply — 18 to 42 U/mL in 6 months, with accelerating trajectory. This trend warrants urgent clinical review and possible protocol reassessment before the next visit.',
    reportIssues: [
      { title: 'Marker trend escalation', detail: 'Tumor marker trajectory is rising steeply and should be highlighted during next review.' },
      { title: 'Normalization pending', detail: 'Outside imaging summary remains attached as PDF only and is not structured yet.' },
    ],
    briefingCard: {
      flagLevel: 'red',
      visitDaysAgo: 6,
      aiSummary: 'Rehan Ali — 16th visit, Oncology follow-up. Tumor marker up from 34 to 42 U/mL — trajectory is accelerating and update is 6 weeks overdue. Outside imaging summary attached but not normalized. Weight down 1.2kg from last visit. Patient functional (ECOG 1).',
      medicationCompliance: 'uncertain',
      labStatus: 'Tumor marker 42 U/mL — rising 134% since January',
      recommendedFocus: 'Review tumor marker trajectory urgently. Normalize and compare outside imaging before prescribing. Ask about weight loss — rule out treatment-related nausea or appetite loss.',
    },
    betweenVisitAlerts: [
      { checkInDay: 'Day 3', question: 'Any nausea, fatigue, or pain since last treatment?', patientResponse: 'Some fatigue, manageable', flagged: false, date: 'Jun 13, 2026' },
      { checkInDay: 'Day 7', question: 'Have you been eating well? Any weight changes?', patientResponse: 'Eating less than usual, some nausea in the morning', flagged: true, date: 'Jun 17, 2026' },
    ],
    prescriptions: [
      { drug: 'Capecitabine 500mg', route: 'Oral', dose: '2-0-2', duration: 'Cycle 6', since: 'Jan 2026', warning: '⚠️ Hand-foot syndrome possible — ask patient to check palms and soles for redness or peeling.' },
      { drug: 'Ondansetron 4mg', route: 'Oral', dose: 'As needed', duration: 'During treatment', since: 'Jan 2026', warning: null },
      { drug: 'Omeprazole 20mg', route: 'Oral', dose: '1-0-0', duration: 'Ongoing', since: 'Feb 2026', warning: null },
    ],
    visits: [
      { date: 'Jun 10, 2026', title: 'Treatment review', detail: 'Latest symptoms stable, but pending marker update and outside report review.', badge: 'Completed' },
      { date: 'May 02, 2026', title: 'Discharge summary upload', detail: 'Outside center summary attached by caregiver over chat.', badge: 'Report added' },
    ],
    appointments: [
      { date: 'Jun 24, 2026', title: 'Oncology follow-up', detail: 'Needs tumor marker and imaging summary review before consult.', badge: 'Booked' },
    ],
    documents: [
      { name: 'Tumor marker trend.xlsx', type: 'Lab report', uploadedAt: 'Jun 10, 2026' },
      { name: 'Outside discharge summary.pdf', type: 'Discharge summary', uploadedAt: 'May 02, 2026' },
    ],
    chat: [
      { role: 'user', text: 'What should the doctor review first?' },
      { role: 'assistant', text: 'Review the rising tumor marker trend first, then compare the outside imaging summary against the last in-house visit note.' },
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
    summary: 'New patient intake with historical lipid profile uploads, early prevention plan, and one pending family history form.',
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
    primaryMetricName: 'LDL Cholesterol (mg/dL)',
    progressionSignal: '🟢 LDL cholesterol showing consistent downward trend — 138 to 126 mg/dL over 6 months. Statin therapy appears effective. Continue current plan and review at next visit.',
    reportIssues: [
      { title: 'Family history missing', detail: 'Risk intake is otherwise complete, but hereditary context has not been attached yet.' },
    ],
    briefingCard: {
      flagLevel: 'green',
      visitDaysAgo: 4,
      aiSummary: 'Meera Iyer — 3rd visit, Cardiology prevention intake. LDL at 126 mg/dL, trending down steadily from 138 in January. BP near target at 128/82. ECG normal. Family history form is the only outstanding item before risk stratification is complete.',
      medicationCompliance: 'compliant',
      labStatus: 'LDL 126 mg/dL — trending down (target <100)',
      recommendedFocus: 'Collect family history form before visit starts. Discuss lifestyle plan for LDL reduction. No medication change needed at this stage.',
    },
    betweenVisitAlerts: [],
    prescriptions: [
      { drug: 'Rosuvastatin 10mg', route: 'Oral', dose: '0-0-1', duration: 'Ongoing', since: 'Jan 2026', warning: null },
      { drug: 'Aspirin 75mg', route: 'Oral', dose: '1-0-0', duration: 'Ongoing', since: 'Jan 2026', warning: null },
    ],
    visits: [
      { date: 'Jun 12, 2026', title: 'New intake', detail: 'Vitals recorded and lipid history uploaded from prior clinic reports.', badge: 'Completed' },
    ],
    appointments: [
      { date: 'Jun 18, 2026', title: 'Preventive consult', detail: 'Family history form to be completed before visit.', badge: 'Booked' },
    ],
    documents: [
      { name: 'Lipid history.pdf', type: 'Lab report', uploadedAt: 'Jun 12, 2026' },
      { name: 'ECG scan.jpg', type: 'Imaging', uploadedAt: 'Jun 12, 2026' },
    ],
    chat: [
      { role: 'user', text: 'What is still missing in intake?' },
      { role: 'assistant', text: 'Family history is still pending. Core labs, ECG, and baseline vitals are already attached.' },
    ],
  },

  {
    id: 'p-1005',
    mrn: 'GC-1005',
    name: 'Divya Krishnan',
    age: 35,
    gender: 'Female',
    phone: '+91 88990 11223',
    email: 'divya.krishnan@example.com',
    city: 'Pune',
    specialty: 'Neurology',
    doctor: 'Dr. Suresh Balaji',
    status: 'Monitoring',
    risk: 'Medium',
    condition: 'Chronic migraine with aura — preventive therapy, vestibular vertigo episodes',
    totalVisits: 6,
    totalReports: 4,
    nextAppointment: 'Jun 22, 2026 · 02:30 PM',
    lastVisit: 'Jun 03, 2026',
    lastVisitIso: '2026-06-03',
    summary: 'Chronic migraine patient with vestibular component. Episode frequency has decreased since Topiramate, but a breakthrough episode was reported post-visit and is undocumented.',
    tags: ['Migraine', 'Vestibular', 'Preventive therapy'],
    alerts: [
      { tone: 'warning', title: 'Breakthrough migraine on Day 5 post-visit — not yet documented.' },
      { tone: 'info', title: 'Vestibular rehab exercise compliance unconfirmed.' },
    ],
    metrics: [
      { label: 'Episodes/mo', value: '4', change: '↓ from 9/mo', tone: 'success' },
      { label: 'Severity (VAS)', value: '6.2', change: 'Mod-severe', tone: 'warning' },
      { label: 'Vertigo days', value: '2', change: 'Stable', tone: 'success' },
    ],
    trendSeries: [
      { label: 'Jan', value: 9 },
      { label: 'Feb', value: 8 },
      { label: 'Mar', value: 7 },
      { label: 'Apr', value: 5 },
      { label: 'May', value: 4 },
      { label: 'Jun', value: 4 },
    ],
    primaryMetricName: 'Migraine Episodes / Month',
    progressionSignal: '🟢 Migraine frequency halved since starting Topiramate (9 → 4 per month). Preventive therapy is working. Main concern is a breakthrough episode reported on Day 5 that is not yet documented in the chart.',
    reportIssues: [
      { title: 'Breakthrough episode undocumented', detail: 'Patient replied YES to Day 5 check-in. Episode severity, duration, and triggers not recorded.' },
    ],
    briefingCard: {
      flagLevel: 'amber',
      visitDaysAgo: 13,
      aiSummary: 'Divya Krishnan — 6th visit for chronic migraine with aura. Frequency down from 9 to 4 episodes/month since starting Topiramate in March. However, a severe breakthrough migraine (10 hours) was reported on Day 5 and is not yet documented. Vestibular rehab compliance uncertain.',
      medicationCompliance: 'uncertain',
      labStatus: null,
      recommendedFocus: 'Document the Day 5 breakthrough — severity, duration, triggers. Review vestibular exercise diary. Consider titrating Topiramate if pain score stays above 6.',
    },
    betweenVisitAlerts: [
      { checkInDay: 'Day 3', question: 'Are you doing your vestibular exercises daily?', patientResponse: 'Mostly, skipped 2 days', flagged: false, date: 'Jun 06, 2026' },
      { checkInDay: 'Day 5', question: 'Any new migraine episode since your last visit?', patientResponse: 'Yes — severe one yesterday, lasted 10 hours with vomiting', flagged: true, date: 'Jun 08, 2026' },
    ],
    prescriptions: [
      { drug: 'Topiramate 75mg', route: 'Oral', dose: '0-0-1', duration: 'Ongoing', since: 'Apr 2026', warning: null },
      { drug: 'Sumatriptan 50mg', route: 'Oral', dose: 'Max 2/week (rescue)', duration: 'As needed', since: 'Mar 2026', warning: '⚠️ Monitor usage frequency — >8 days/month raises medication overuse headache risk.' },
    ],
    visits: [
      { date: 'Jun 03, 2026', title: 'Neurology review', detail: 'Topiramate dose increased to 75mg. Vestibular rehabilitation exercises prescribed.', badge: 'Completed' },
      { date: 'Apr 28, 2026', title: 'Follow-up', detail: 'Episodes down from 9 to 6/month. Continued preventive plan.', badge: 'Completed' },
      { date: 'Mar 10, 2026', title: 'New patient intake', detail: 'Presented with 3-year migraine history worsening. Started Topiramate 50mg.', badge: 'Completed' },
    ],
    appointments: [
      { date: 'Jun 22, 2026', title: 'Neurology review', detail: 'Episode frequency, vestibular progress, and dose review.', badge: 'Booked' },
    ],
    documents: [
      { name: 'MRI brain - Mar 2026.pdf', type: 'Imaging', uploadedAt: 'Mar 12, 2026' },
      { name: 'Migraine diary - May 2026.pdf', type: 'Patient diary', uploadedAt: 'Jun 03, 2026' },
    ],
    chat: [
      { role: 'user', text: 'What is the trend in migraine frequency?' },
      { role: 'assistant', text: 'Episodes have halved from 9/month to 4/month since March. The main outstanding item is the breakthrough episode on Day 5 that is undocumented.' },
    ],
  },

  {
    id: 'p-1006',
    mrn: 'GC-1006',
    name: 'Sanjay Patel',
    age: 72,
    gender: 'Male',
    phone: '+91 97700 55566',
    email: 'sanjay.patel@example.com',
    city: 'Ahmedabad',
    specialty: 'Cardiology',
    doctor: 'Dr. Harish Menon',
    status: 'Active',
    risk: 'High',
    condition: 'Post-MI cardiac management — reduced EF, complex polypharmacy, electrolyte watch',
    totalVisits: 22,
    totalReports: 18,
    nextAppointment: 'Jun 20, 2026 · 09:00 AM',
    lastVisit: 'Jun 06, 2026',
    lastVisitIso: '2026-06-06',
    summary: 'Post-MI patient on 6 medications. EF stable at 38%. Sodium trending low. Three active drug interaction flags. 6-minute walk test overdue since March.',
    tags: ['Post-MI', 'Heart failure', 'Polypharmacy', 'Electrolyte watch'],
    alerts: [
      { tone: 'danger', title: '3 drug interaction flags on current 6-medication regimen.' },
      { tone: 'danger', title: 'Sodium at 133 mEq/L — below normal, review diuretic dose.' },
      { tone: 'warning', title: '6-minute walk test not completed since March 2026.' },
    ],
    metrics: [
      { label: 'EF (Echo)', value: '38%', change: 'Stable', tone: 'warning' },
      { label: 'Sodium', value: '133 mEq/L', change: 'Low', tone: 'danger' },
      { label: 'BP', value: '118/76', change: 'Controlled', tone: 'success' },
    ],
    trendSeries: [
      { label: 'Jan', value: 36 },
      { label: 'Feb', value: 37 },
      { label: 'Mar', value: 37 },
      { label: 'Apr', value: 38 },
      { label: 'May', value: 38 },
      { label: 'Jun', value: 38 },
    ],
    primaryMetricName: 'Ejection Fraction (%)',
    progressionSignal: '🟡 Ejection fraction stable at 38% across 3 consecutive readings — no improvement but no worsening. Sodium trending downward — likely diuretic-related. Review Furosemide dose urgently.',
    reportIssues: [
      { title: 'Drug interaction risk', detail: 'Spironolactone + Lisinopril combination requires potassium monitoring at every visit. Currently unchecked.' },
      { title: 'Sodium below threshold', detail: 'Sodium at 133 — likely diuretic-related. Review Furosemide dose against sodium trend before continuing.' },
    ],
    briefingCard: {
      flagLevel: 'red',
      visitDaysAgo: 10,
      aiSummary: 'Sanjay Patel — 22nd visit, post-MI cardiac management. EF stable at 38% across 3 visits. Sodium at 133 mEq/L — low, likely diuretic-related. Weight gained 1.5kg in 2 days (patient reported). 6MW test 3 months overdue. Six-drug regimen has 3 active interaction flags.',
      medicationCompliance: 'compliant',
      labStatus: 'Sodium 133 mEq/L — below normal range',
      recommendedFocus: 'Review sodium and recent weight gain against diuretic dose. Check potassium before any RAAS adjustment. Order 6-minute walk test. Review drug interaction flags before adding any new prescription.',
    },
    betweenVisitAlerts: [
      { checkInDay: 'Day 3', question: 'Any chest pain, breathlessness, or leg swelling?', patientResponse: 'No chest pain. Mild breathlessness going up stairs.', flagged: true, date: 'Jun 09, 2026' },
      { checkInDay: 'Day 7', question: 'Have you weighed yourself daily? Any sudden weight gain?', patientResponse: 'Yes — gained 1.5 kg in 2 days', flagged: true, date: 'Jun 13, 2026' },
    ],
    prescriptions: [
      { drug: 'Carvedilol 12.5mg', route: 'Oral', dose: '1-0-1', duration: 'Ongoing', since: 'Jan 2025', warning: null },
      { drug: 'Lisinopril 5mg', route: 'Oral', dose: '1-0-0', duration: 'Ongoing', since: 'Jan 2025', warning: '⚠️ Lisinopril + Spironolactone — hyperkalemia risk. Monitor potassium every 6 weeks.' },
      { drug: 'Furosemide 40mg', route: 'Oral', dose: '1-0-0', duration: 'Ongoing', since: 'Jan 2025', warning: '⚠️ Sodium at 133 — review dose. Furosemide may be contributing to hyponatremia and recent weight changes.' },
      { drug: 'Spironolactone 25mg', route: 'Oral', dose: '0-1-0', duration: 'Ongoing', since: 'Feb 2025', warning: '⚠️ Dual RAAS blockade with Lisinopril — monitor creatinine and potassium at each visit.' },
      { drug: 'Aspirin 75mg', route: 'Oral', dose: '1-0-0', duration: 'Ongoing', since: 'Jan 2025', warning: null },
      { drug: 'Atorvastatin 40mg', route: 'Oral', dose: '0-0-1', duration: 'Ongoing', since: 'Jan 2025', warning: null },
    ],
    visits: [
      { date: 'Jun 06, 2026', title: 'Cardiac review', detail: 'Echo done — EF stable at 38%. Sodium noted low. Dietary sodium restriction discussed.', badge: 'Completed' },
      { date: 'May 09, 2026', title: 'Follow-up + labs', detail: 'Stable creatinine but sodium declining. Furosemide dose under review.', badge: 'Completed' },
      { date: 'Apr 12, 2026', title: 'Medication review', detail: 'Carvedilol titrated. Patient tolerating well with no new symptoms.', badge: 'Completed' },
    ],
    appointments: [
      { date: 'Jun 20, 2026', title: 'Cardiac review + 6MW test', detail: '6-minute walk test and full electrolyte review.', badge: 'Booked' },
    ],
    documents: [
      { name: 'Echo report - Jun 2026.pdf', type: 'Imaging', uploadedAt: 'Jun 06, 2026' },
      { name: 'Lab panel - May 2026.pdf', type: 'Lab report', uploadedAt: 'May 09, 2026' },
      { name: 'Discharge summary - Jan 2025.pdf', type: 'Discharge summary', uploadedAt: 'Jan 14, 2025' },
    ],
    chat: [
      { role: 'user', text: 'What are the drug interaction flags on this patient?' },
      { role: 'assistant', text: 'Three flags: (1) Spironolactone + Lisinopril — hyperkalemia risk; (2) Furosemide + low sodium — review dose; (3) Carvedilol — reassess if BP drops further below 115.' },
    ],
  },

  {
    id: 'p-1007',
    mrn: 'GC-1007',
    name: 'Preethi Suresh',
    age: 28,
    gender: 'Female',
    phone: '+91 95553 77889',
    email: 'preethi.suresh@example.com',
    city: 'Madurai',
    specialty: 'Dermatology',
    doctor: 'Dr. Anitha Prabhu',
    status: 'New',
    risk: 'Low',
    condition: 'Chronic atopic dermatitis — new intake, allergy panel and SCORAD pending',
    totalVisits: 1,
    totalReports: 2,
    nextAppointment: 'Jun 25, 2026 · 03:30 PM',
    lastVisit: 'Jun 11, 2026',
    lastVisitIso: '2026-06-11',
    summary: 'New intake for atopic dermatitis. Widespread lesions, seasonal flare pattern. IgE elevated. Food allergy panel and patch test pending before starting treatment.',
    tags: ['Atopic dermatitis', 'Allergy work-up', 'New patient'],
    alerts: [
      { tone: 'info', title: 'Allergy panel and patch test not yet ordered.' },
      { tone: 'info', title: 'Baseline SCORAD and DLQI scores pending.' },
    ],
    metrics: [
      { label: 'SCORAD', value: 'Pending', change: 'Not scored', tone: 'warning' },
      { label: 'IgE total', value: 'Elevated', change: 'Allergy pending', tone: 'warning' },
      { label: 'Flares/yr', value: '4–5', change: 'Seasonal', tone: 'neutral' },
    ],
    trendSeries: [{ label: 'Week 1', value: 0 }],
    primaryMetricName: 'SCORAD Score',
    progressionSignal: '⚪ Insufficient data — only 1 visit recorded. Complete baseline SCORAD and IgE allergy panel at next visit to establish tracking baselines.',
    reportIssues: [
      { title: 'Baseline scores missing', detail: 'SCORAD and DLQI need to be recorded at intake to track treatment response over time.' },
    ],
    briefingCard: {
      flagLevel: 'green',
      visitDaysAgo: 5,
      aiSummary: 'Preethi Suresh — 1st visit (new patient), Dermatology intake. Chronic atopic dermatitis with widespread lesions, seasonal flare pattern. IgE elevated — allergen trigger possible. No ongoing medications from outside. Allergy panel and SCORAD not done yet — both needed today.',
      medicationCompliance: 'compliant',
      labStatus: 'IgE elevated — allergy panel not yet ordered',
      recommendedFocus: 'Complete SCORAD and DLQI at this visit for baseline. Order allergy panel and patch test. Discuss emollient-first approach before considering topical steroids.',
    },
    betweenVisitAlerts: [],
    prescriptions: [
      { drug: 'Cetaphil moisturising cream', route: 'Topical', dose: 'Twice daily', duration: '4 weeks (review)', since: 'Jun 2026', warning: null },
    ],
    visits: [
      { date: 'Jun 11, 2026', title: 'New patient intake', detail: 'History taken. Widespread eczema noted. Bland emollient prescribed. Advised to avoid soap.', badge: 'Completed' },
    ],
    appointments: [
      { date: 'Jun 25, 2026', title: 'Allergy review', detail: 'Patch test results + SCORAD baseline assessment.', badge: 'Booked' },
    ],
    documents: [
      { name: 'Skin photos - Jun 2026.jpg', type: 'Imaging', uploadedAt: 'Jun 11, 2026' },
      { name: 'Prior clinic prescription.pdf', type: 'Prescription', uploadedAt: 'Jun 11, 2026' },
    ],
    chat: [
      { role: 'user', text: 'What is the treatment plan for this patient?' },
      { role: 'assistant', text: 'Currently emollient only. Awaiting allergy panel and SCORAD baseline to determine if topical steroids or systemic treatment is needed.' },
    ],
  },

  {
    id: 'p-1008',
    mrn: 'GC-1008',
    name: 'Anand Raj',
    age: 54,
    gender: 'Male',
    phone: '+91 96660 44455',
    email: 'anand.raj@example.com',
    city: 'Tirunelveli',
    specialty: 'General Medicine',
    doctor: 'Dr. Vijay Kumar',
    status: 'Active',
    risk: 'Medium',
    condition: 'Hypothyroidism with incidental Type 2 diabetes — dual management',
    totalVisits: 8,
    totalReports: 7,
    nextAppointment: 'Jun 26, 2026 · 10:00 AM',
    lastVisit: 'Jun 04, 2026',
    lastVisitIso: '2026-06-04',
    summary: 'Thyroid and diabetes dual management. TSH normalised on Levothyroxine. HbA1c borderline but improving since Metformin was started 3 months ago.',
    tags: ['Hypothyroidism', 'Diabetes', 'Dual management'],
    alerts: [
      { tone: 'warning', title: 'HbA1c at 7.1% — borderline, lifestyle plan not documented.' },
      { tone: 'info', title: 'Thyroid panel repeat due this month.' },
    ],
    metrics: [
      { label: 'TSH', value: '2.8 mIU/L', change: 'Normal', tone: 'success' },
      { label: 'HbA1c', value: '7.1%', change: 'Borderline', tone: 'warning' },
      { label: 'Fasting glucose', value: '126 mg/dL', change: '↓ from 148', tone: 'success' },
    ],
    trendSeries: [
      { label: 'Jan', value: 7.8 },
      { label: 'Feb', value: 7.6 },
      { label: 'Mar', value: 7.4 },
      { label: 'Apr', value: 7.3 },
      { label: 'May', value: 7.2 },
      { label: 'Jun', value: 7.1 },
    ],
    primaryMetricName: 'HbA1c (%)',
    progressionSignal: '🟡 HbA1c improving since Metformin was started (7.8% → 7.1% over 6 months). TSH normalised. Continue current plan and add a structured lifestyle programme to accelerate glycemic improvement.',
    reportIssues: [
      { title: 'Lifestyle plan missing', detail: 'HbA1c is borderline — a structured diet and exercise plan would significantly improve outcomes but has not been documented.' },
    ],
    briefingCard: {
      flagLevel: 'amber',
      visitDaysAgo: 12,
      aiSummary: 'Anand Raj — 8th visit, thyroid + diabetes dual management. TSH normalised at 2.8 mIU/L on Levothyroxine. HbA1c borderline at 7.1% but trending down since Metformin was started in March. Fasting glucose improved from 148 to 126. Lifestyle plan not documented. Thyroid panel repeat is due this month.',
      medicationCompliance: 'compliant',
      labStatus: 'HbA1c 7.1% — borderline target range',
      recommendedFocus: 'Document a formal diet and exercise plan for diabetes. Order repeat thyroid panel (TSH + T4). Review if Levothyroxine dose needs any fine-tuning.',
    },
    betweenVisitAlerts: [
      { checkInDay: 'Day 7', question: 'Are you taking your thyroid tablet 30 min before food every morning?', patientResponse: 'Yes, mostly — sometimes forget on weekends', flagged: false, date: 'Jun 11, 2026' },
    ],
    prescriptions: [
      { drug: 'Levothyroxine 75mcg', route: 'Oral', dose: '1-0-0 (30 min before food)', duration: 'Ongoing', since: 'Oct 2024', warning: null },
      { drug: 'Metformin 500mg', route: 'Oral', dose: '0-1-1', duration: 'Ongoing', since: 'Mar 2026', warning: null },
    ],
    visits: [
      { date: 'Jun 04, 2026', title: 'Dual management review', detail: 'Thyroid stable. Diabetes borderline — Metformin dose increased. Lifestyle counselling given.', badge: 'Completed' },
      { date: 'Apr 30, 2026', title: 'Lab review', detail: 'TSH 3.2 — within range. HbA1c 7.3% improving. Continued current plan.', badge: 'Completed' },
      { date: 'Mar 05, 2026', title: 'Metformin initiation', detail: 'HbA1c 7.8% — started Metformin 500mg. Diet plan discussed.', badge: 'Completed' },
    ],
    appointments: [
      { date: 'Jun 26, 2026', title: 'Thyroid + diabetes review', detail: 'Repeat TSH, T4, HbA1c, and fasting glucose.', badge: 'Booked' },
    ],
    documents: [
      { name: 'Lab panel - Jun 2026.pdf', type: 'Lab report', uploadedAt: 'Jun 05, 2026' },
      { name: 'Thyroid history.pdf', type: 'Clinical summary', uploadedAt: 'Mar 08, 2026' },
    ],
    chat: [
      { role: 'user', text: 'How is the dual management going?' },
      { role: 'assistant', text: 'TSH is normalised on Levothyroxine. HbA1c improving since Metformin was started but still borderline at 7.1%. Main gap is a formal lifestyle plan which is not documented.' },
    ],
  },
]

export const specialtyOptions = [
  'All specialties', 'Endocrinology', 'Ophthalmology', 'Oncology',
  'Cardiology', 'Neurology', 'Dermatology', 'General Medicine',
]
export const riskOptions = ['All risks', 'High', 'Medium', 'Low']
export const statusOptions = ['All statuses', 'Active', 'Monitoring', 'New']

export const clinicSummaryStats = [
  {
    id: 'total',
    label: 'Total patients',
    value: clinicPatients.length,
    detail: 'Across all active records',
  },
  {
    id: 'active',
    label: 'Active treatment',
    value: clinicPatients.filter((p) => p.status === 'Active').length,
    detail: 'Patients with ongoing care plans',
  },
  {
    id: 'flagged',
    label: 'Flagged records',
    value: clinicPatients.filter((p) => p.alerts.some((a) => a.tone === 'danger')).length,
    detail: 'Need clinician attention',
  },
  {
    id: 'between_visit',
    label: 'Between-visit alerts',
    value: clinicPatients.reduce((total, p) => total + (p.betweenVisitAlerts?.filter((a) => a.flagged).length ?? 0), 0),
    detail: 'Flagged patient check-in responses',
  },
]

export function filterClinicPatients(patients, filters) {
  const query = filters.query.trim().toLowerCase()
  return patients.filter((p) => {
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.mrn.toLowerCase().includes(query) ||
      p.condition.toLowerCase().includes(query) ||
      p.specialty.toLowerCase().includes(query)
    const matchesStatus =
      !filters.status || filters.status === 'All statuses' || p.status === filters.status
    const matchesSpecialty =
      !filters.specialty || filters.specialty === 'All specialties' || p.specialty === filters.specialty
    return matchesQuery && matchesStatus && matchesSpecialty
  })
}

export function getClinicPatientById(patientId) {
  return clinicPatients.find((p) => p.id === patientId)
}
