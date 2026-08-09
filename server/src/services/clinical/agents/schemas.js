const extraction = {
  type: 'json_schema', name: 'clinical_source_extraction', strict: true,
  schema: { type: 'object', additionalProperties: false, properties: {
    summary: { type: 'string' }, documentDate: { type: 'string' }, sourceType: { type: 'string' }, diagnoses: { type: 'array', items: { type: 'string' } },
    medications: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, dose: { type: 'string' }, frequency: { type: 'string' }, status: { type: 'string' } }, required: ['name', 'dose', 'frequency', 'status'] } },
    allergies: { type: 'array', items: { type: 'string' } }, observations: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, value: { type: 'string' }, unit: { type: 'string' }, status: { type: 'string' }, referenceRange: { type: 'string' } }, required: ['name', 'value', 'unit', 'status', 'referenceRange'] } },
    careGaps: { type: 'array', items: { type: 'string' } }, clinicianQuestions: { type: 'array', items: { type: 'string' } },
  }, required: ['summary', 'documentDate', 'sourceType', 'diagnoses', 'medications', 'allergies', 'observations', 'careGaps', 'clinicianQuestions'] },
}

const context = {
  type: 'json_schema', name: 'patient_clinical_context', strict: true,
  schema: { type: 'object', additionalProperties: false, properties: {
    summary: { type: 'string' }, activeProblems: { type: 'array', items: { type: 'string' } }, medications: { type: 'array', items: { type: 'string' } }, allergies: { type: 'array', items: { type: 'string' } }, careGaps: { type: 'array', items: { type: 'string' } }, questionsForClinician: { type: 'array', items: { type: 'string' } },
  }, required: ['summary', 'activeProblems', 'medications', 'allergies', 'careGaps', 'questionsForClinician'] },
}

module.exports = { extraction, context }
