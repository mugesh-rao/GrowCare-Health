const { runStructuredAgent } = require('./runtime')

const medicineSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    purpose: { type: 'string' },
    dose: { type: 'string' },
    timing: { type: 'string' },
    duration: { type: 'string' },
    instructions: { type: 'string' },
  },
  required: ['name', 'purpose', 'dose', 'timing', 'duration', 'instructions'],
}

const afterVisitPlanSchema = {
  type: 'json_schema',
  name: 'after_visit_plan',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      plainLanguageSummary: { type: 'string' },
      findings: { type: 'array', items: { type: 'string' } },
      changesToday: { type: 'array', items: { type: 'string' } },
      medicines: { type: 'array', items: medicineSchema },
      testsToComplete: { type: 'array', items: { type: 'string' } },
      foodsOrActivitiesToAvoid: { type: 'array', items: { type: 'string' } },
      warningSigns: { type: 'array', items: { type: 'string' } },
      nextAppointment: { type: 'string' },
      questionsAsked: { type: 'array', items: { type: 'string' } },
      clinicianNote: { type: 'string' },
    },
    required: [
      'title', 'plainLanguageSummary', 'findings', 'changesToday', 'medicines',
      'testsToComplete', 'foodsOrActivitiesToAvoid', 'warningSigns',
      'nextAppointment', 'questionsAsked', 'clinicianNote',
    ],
  },
}

function draftAfterVisitPlan({ apiKey, model, patient, encounter, targetLanguage = 'English' }) {
  return runStructuredAgent({
    apiKey,
    model,
    name: 'After-visit plan agent',
    outputType: afterVisitPlanSchema,
    instructions: [
      'Create a patient-friendly after-visit plan for clinician review.',
      `Write patient-facing explanations in ${targetLanguage}. Keep medicine names in their source language so a pharmacist can identify them.`,
      'Use only facts present in the clinician-approved encounter. Do not infer a diagnosis, treatment, restriction, warning sign, test, or appointment.',
      'When information is absent, use an empty array or the phrase "Not documented" instead of inventing content.',
      'Use short sentences suitable for patients and caregivers. Do not replace clinical judgment or provide new medical advice.',
    ].join(' '),
    input: JSON.stringify({
      patient: { name: patient.name, age: patient.age, gender: patient.gender, specialty: patient.specialty },
      encounter: { title: encounter.title, occurredAt: encounter.occurredAt, note: encounter.note || {} },
      targetLanguage,
    }),
  })
}

function translateAfterVisitPlan({ apiKey, model, patient, plan, targetLanguage }) {
  return runStructuredAgent({
    apiKey,
    model,
    name: 'After-visit plan translation agent',
    outputType: afterVisitPlanSchema,
    instructions: [
      `Translate this clinician-reviewed after-visit plan into ${targetLanguage}.`,
      'Preserve every fact, number, dose, unit, timing, duration, warning, and uncertainty exactly.',
      'Keep medicine names recognizable and do not add clinical information.',
      'Use clear patient-friendly language. Return the same structured fields.',
    ].join(' '),
    input: JSON.stringify({ patient: { name: patient.name }, sourcePlan: plan, targetLanguage }),
  })
}

module.exports = { afterVisitPlanSchema, draftAfterVisitPlan, translateAfterVisitPlan }
