import api from './api'

export const clinicalApi = {
  listPatients: () => api.get('/clinical/patients').then((response) => response.data.patients),
  getPatient: (patientId) => api.get(`/clinical/patients/${patientId}`).then((response) => response.data.patient),
  createPatient: (payload) => api.post('/clinical/patients', payload).then((response) => response.data.patient),
  updatePatient: (patientId, payload) => api.patch(`/clinical/patients/${patientId}`, payload).then((response) => response.data.patient),
  saveContextNote: (patientId, body) => api.post(`/clinical/patients/${patientId}/context-notes`, { body }).then((response) => response.data.contextNote),
  addArtifact: (patientId, payload) => api.post(`/clinical/patients/${patientId}/artifacts`, payload).then((response) => response.data),
  getIntelligence: (patientId) => api.get(`/clinical/patients/${patientId}/intelligence`).then((response) => response.data),
  processArtifact: (patientId, artifactId) => api.post(`/clinical/patients/${patientId}/artifacts/${artifactId}/process`, { consentConfirmed: true }).then((response) => response.data),
  refreshClinicalContext: (patientId) => api.post(`/clinical/patients/${patientId}/context/refresh`, { consentConfirmed: true }).then((response) => response.data.context),
  askRecord: (patientId, question) => api.post(`/clinical/patients/${patientId}/chat`, { question }).then((response) => response.data.answer),
  startScribe: (patientId, payload) => api.post(`/clinical/patients/${patientId}/scribe/start`, payload).then((response) => response.data.session),
  updateScribe: (patientId, sessionId, transcript) => api.patch(`/clinical/patients/${patientId}/scribe/${sessionId}`, { transcript }).then((response) => response.data.session),
  transcribeScribeChunk: (patientId, sessionId, audio) => api.post(`/clinical/patients/${patientId}/scribe/${sessionId}/transcribe`, audio).then((response) => response.data.text),
  stopScribe: (patientId, sessionId, transcript, audio = {}) => api.post(`/clinical/patients/${patientId}/scribe/${sessionId}/stop`, { transcript, ...audio }).then((response) => response.data.session),
  approveScribe: (patientId, sessionId, payload) => api.post(`/clinical/patients/${patientId}/scribe/${sessionId}/approve`, payload).then((response) => response.data),
}
