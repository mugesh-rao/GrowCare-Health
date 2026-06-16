/**
 * Visual report cards shown in the Progression canvas.
 * Keyed by patientId → visitIndex (0 = most recent visit).
 * Each entry is an array of card objects rendered as visual blocks.
 *
 * Card types:
 *   lab         — extracted lab values table with status indicators
 *   imaging     — visual scan representation + annotated values
 *   prescription— current medication list with safety flags
 *   note        — plain clinical note text
 */

export const reportCardsByPatient = {

  // ── Aarav Mehta · Endocrinology · Diabetes + Renal ───────────────
  'p-1001': {
    0: [
      {
        type: 'lab',
        title: 'Lab panel — May 2026',
        values: [
          { name: 'HbA1c',          value: '8.4%',         status: 'high' },
          { name: 'Creatinine',     value: '1.4 mg/dL',    status: 'elevated' },
          { name: 'Fasting glucose',value: '186 mg/dL',    status: 'high' },
          { name: 'eGFR',           value: '54 mL/min',    status: 'elevated' },
          { name: 'Potassium',      value: '4.1 mEq/L',    status: 'normal' },
        ],
      },
      {
        type: 'note',
        title: 'Visit note — Jun 02',
        text: 'Medication escalated — Metformin increased to 1g. Nephrology referral discussed and approved by patient. Contrast allergy documentation requested urgently before next imaging.',
      },
    ],
    1: [
      {
        type: 'lab',
        title: 'HbA1c + Renal panel — uploaded by family',
        values: [
          { name: 'HbA1c',      value: '8.1%',      status: 'high' },
          { name: 'Creatinine', value: '1.3 mg/dL', status: 'elevated' },
          { name: 'Urea',       value: '42 mg/dL',  status: 'elevated' },
          { name: 'Potassium',  value: '4.2 mEq/L', status: 'normal' },
        ],
      },
    ],
    2: [
      {
        type: 'note',
        title: 'Visit note — Apr 21',
        text: 'Poor adherence noted — patient forgot medications on 3–4 days/week. Diet review recommended. Repeat labs in 3 weeks.',
      },
      {
        type: 'prescription',
        title: 'Prescriptions at this visit',
        drugs: [
          { drug: 'Metformin 500mg', dose: '1-0-1', warning: false },
          { drug: 'Amlodipine 5mg',  dose: '0-0-1', warning: false },
        ],
      },
    ],
  },

  // ── Kavya Nair · Ophthalmology · Retina / Glaucoma ───────────────
  'p-1002': {
    0: [
      {
        type: 'imaging',
        title: 'OCT — Right eye (Jun 08)',
        imageType: 'oct',
        condition: 'Retinal nerve fibre layer thinning — glaucoma suspect',
        values: [
          { name: 'RNFL',    value: '78 µm',   status: 'elevated' },
          { name: 'IOP',     value: '19 mmHg', status: 'normal' },
          { name: 'Vision',  value: '6/9',     status: 'normal' },
          { name: 'Cup/disc','value': '0.7',   status: 'elevated' },
        ],
      },
      {
        type: 'note',
        title: 'Visit note — Jun 08',
        text: 'OCT reviewed by Dr. Jose. RNFL decline confirmed. Annotated comparison with Jan scan requested before next visit.',
      },
    ],
    1: [
      {
        type: 'imaging',
        title: 'OCT + referral note from outside centre (May)',
        imageType: 'oct',
        condition: 'Baseline comparison — prior facility scan',
        values: [
          { name: 'RNFL',  value: '80 µm',   status: 'elevated' },
          { name: 'IOP',   value: '18 mmHg', status: 'normal' },
          { name: 'Vision','value': '6/9',   status: 'normal' },
        ],
      },
    ],
  },

  // ── Rehan Ali · Oncology ─────────────────────────────────────────
  'p-1003': {
    0: [
      {
        type: 'lab',
        title: 'Tumor marker + markers — Jun 10',
        values: [
          { name: 'CA 19-9 (marker)', value: '42 U/mL',  status: 'high' },
          { name: 'Weight',           value: '67 kg',     status: 'low' },
          { name: 'Haemoglobin',      value: '10.8 g/dL', status: 'elevated' },
          { name: 'ECOG score',       value: '1',         status: 'normal' },
        ],
      },
      {
        type: 'note',
        title: 'Treatment review — Jun 10',
        text: 'Symptoms stable but tumor marker continuing to rise. Outside imaging summary not yet normalised. Patient reports less appetite — possible Capecitabine side-effect.',
      },
    ],
    1: [
      {
        type: 'note',
        title: 'Discharge summary — outside centre',
        text: 'Summary uploaded by caregiver. Contains imaging and prior chemo cycle notes. Pending normalisation into the structured record.',
      },
      {
        type: 'prescription',
        title: 'Active prescriptions',
        drugs: [
          { drug: 'Capecitabine 500mg', dose: '2-0-2 · Cycle 6', warning: true },
          { drug: 'Ondansetron 4mg',    dose: 'As needed',        warning: false },
          { drug: 'Omeprazole 20mg',    dose: '1-0-0',            warning: false },
        ],
      },
    ],
  },

  // ── Meera Iyer · Cardiology · Prevention ─────────────────────────
  'p-1004': {
    0: [
      {
        type: 'lab',
        title: 'Lipid + cardiac profile — Jun 12',
        values: [
          { name: 'LDL cholesterol', value: '126 mg/dL', status: 'elevated' },
          { name: 'HDL',             value: '58 mg/dL',  status: 'normal' },
          { name: 'Triglycerides',   value: '142 mg/dL', status: 'normal' },
          { name: 'BP',              value: '128/82',    status: 'normal' },
        ],
      },
      {
        type: 'imaging',
        title: 'ECG — Jun 12',
        imageType: 'ecg',
        condition: 'Normal sinus rhythm — no acute changes',
        values: [
          { name: 'Rhythm',   value: 'Normal sinus', status: 'normal' },
          { name: 'Rate',     value: '72 bpm',       status: 'normal' },
          { name: 'Axis',     value: 'Normal',       status: 'normal' },
          { name: 'ST / T',   value: 'No change',    status: 'normal' },
        ],
      },
    ],
  },

  // ── Divya Krishnan · Neurology · Migraine ────────────────────────
  'p-1005': {
    0: [
      {
        type: 'note',
        title: 'Visit note — Jun 03',
        text: 'Episode frequency improved (9 → 4/mo). Topiramate titrated to 75mg. Vestibular rehab exercises prescribed and demonstrated.',
      },
      {
        type: 'prescription',
        title: 'Prescriptions at this visit',
        drugs: [
          { drug: 'Topiramate 75mg',  dose: '0-0-1',           warning: false },
          { drug: 'Sumatriptan 50mg', dose: 'Max 2/week rescue', warning: true },
        ],
      },
    ],
    1: [
      {
        type: 'note',
        title: 'Visit note — Apr 28',
        text: 'Good response to Topiramate 50mg — episodes reduced from 9 to 6/month. Vestibular symptoms less frequent. Continue preventive plan.',
      },
    ],
    2: [
      {
        type: 'imaging',
        title: 'MRI Brain — Mar 12',
        imageType: 'mri',
        condition: 'No structural abnormality — chronic migraine pattern',
        values: [
          { name: 'White matter',  value: 'Normal',         status: 'normal' },
          { name: 'Cerebellum',    value: 'Normal',         status: 'normal' },
          { name: 'Sinus pattern', value: 'Mild changes',   status: 'elevated' },
          { name: 'Conclusion',    value: 'No acute lesion', status: 'normal' },
        ],
      },
      {
        type: 'prescription',
        title: 'Prescriptions — initial visit',
        drugs: [
          { drug: 'Topiramate 50mg',  dose: '0-0-1',            warning: false },
          { drug: 'Sumatriptan 50mg', dose: 'Max 2/week rescue', warning: true },
        ],
      },
    ],
  },

  // ── Sanjay Patel · Cardiology · Post-MI ──────────────────────────
  'p-1006': {
    0: [
      {
        type: 'imaging',
        title: 'Echo report — Jun 06',
        imageType: 'echo',
        condition: 'Dilated cardiomyopathy — EF stable at 38%',
        values: [
          { name: 'Ejection fraction', value: '38%',     status: 'elevated' },
          { name: 'LV size',           value: 'Mildly dilated', status: 'elevated' },
          { name: 'Wall motion',       value: 'Hypokinesis',    status: 'elevated' },
          { name: 'Pericardium',       value: 'Normal',         status: 'normal' },
        ],
      },
      {
        type: 'lab',
        title: 'Electrolytes + renal — Jun 06',
        values: [
          { name: 'Sodium',     value: '133 mEq/L', status: 'low' },
          { name: 'Potassium',  value: '4.6 mEq/L', status: 'elevated' },
          { name: 'Creatinine', value: '1.1 mg/dL', status: 'normal' },
          { name: 'BNP',        value: '420 pg/mL', status: 'high' },
        ],
      },
    ],
    1: [
      {
        type: 'lab',
        title: 'Follow-up labs — May 09',
        values: [
          { name: 'Sodium',    value: '135 mEq/L', status: 'elevated' },
          { name: 'Potassium', value: '4.4 mEq/L', status: 'normal' },
          { name: 'Creatinine','value': '1.0 mg/dL',status: 'normal' },
          { name: 'BNP',       value: '380 pg/mL', status: 'high' },
        ],
      },
    ],
    2: [
      {
        type: 'prescription',
        title: 'Prescriptions — updated Apr 12',
        drugs: [
          { drug: 'Carvedilol 12.5mg',   dose: '1-0-1', warning: false },
          { drug: 'Lisinopril 5mg',      dose: '1-0-0', warning: true },
          { drug: 'Furosemide 40mg',     dose: '1-0-0', warning: true },
          { drug: 'Spironolactone 25mg', dose: '0-1-0', warning: true },
          { drug: 'Aspirin 75mg',        dose: '1-0-0', warning: false },
          { drug: 'Atorvastatin 40mg',   dose: '0-0-1', warning: false },
        ],
      },
    ],
  },

  // ── Preethi Suresh · Dermatology · Atopic Dermatitis ─────────────
  'p-1007': {
    0: [
      {
        type: 'imaging',
        title: 'Skin photographs — Jun 11',
        imageType: 'skin',
        condition: 'Atopic dermatitis — widespread lesions, flexural involvement',
        values: [
          { name: 'Distribution',  value: 'Widespread',    status: 'high' },
          { name: 'Flexural',      value: 'Present',       status: 'elevated' },
          { name: 'Lichenification','value': 'Mild-mod', status: 'elevated' },
          { name: 'IgE',           value: 'Elevated',      status: 'high' },
        ],
      },
      {
        type: 'note',
        title: 'New patient note — Jun 11',
        text: 'First visit. Widespread eczema with flexural involvement. Prescribed bland emollient. Advised to avoid soap and known allergens. Allergy panel and patch test to be ordered.',
      },
    ],
  },

  // ── Anand Raj · General Medicine · Thyroid + Diabetes ────────────
  'p-1008': {
    0: [
      {
        type: 'lab',
        title: 'Thyroid + diabetes panel — Jun 04',
        values: [
          { name: 'TSH',            value: '2.8 mIU/L',  status: 'normal' },
          { name: 'Free T4',        value: '1.2 ng/dL',  status: 'normal' },
          { name: 'HbA1c',          value: '7.1%',       status: 'elevated' },
          { name: 'Fasting glucose','value': '126 mg/dL', status: 'elevated' },
          { name: 'Creatinine',     value: '0.9 mg/dL',  status: 'normal' },
        ],
      },
    ],
    1: [
      {
        type: 'lab',
        title: 'Follow-up panel — Apr 30',
        values: [
          { name: 'TSH',   value: '3.2 mIU/L',  status: 'normal' },
          { name: 'HbA1c', value: '7.3%',        status: 'elevated' },
          { name: 'FBS',   value: '134 mg/dL',   status: 'elevated' },
        ],
      },
    ],
    2: [
      {
        type: 'note',
        title: 'Visit note — Mar 05',
        text: 'HbA1c 7.8% — initiated Metformin 500mg. Thyroid stable on Levothyroxine. Diet and lifestyle counselling given. Recheck in 8 weeks.',
      },
      {
        type: 'prescription',
        title: 'Prescriptions — initiated Mar 05',
        drugs: [
          { drug: 'Levothyroxine 75mcg', dose: '1-0-0 (30 min before food)', warning: false },
          { drug: 'Metformin 500mg',     dose: '0-1-1',                      warning: false },
        ],
      },
    ],
  },
}
