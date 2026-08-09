import api from './api'

export const clinicalApi = {
  listPatients: () => api.get('/api/clinical/patients').then((response) => response.data.patients),
  getPatient: (patientId) => api.get(`/api/clinical/patients/${patientId}`).then((response) => response.data.patient),
  createPatient: (payload) => api.post('/api/clinical/patients', payload).then((response) => response.data.patient),
  updatePatient: (patientId, payload) => api.patch(`/api/clinical/patients/${patientId}`, payload).then((response) => response.data.patient),
  addArtifact: (patientId, payload) => api.post(`/api/clinical/patients/${patientId}/artifacts`, payload).then((response) => response.data),
  askRecord: (patientId, question) => api.post(`/api/clinical/patients/${patientId}/chat`, { question }).then((response) => response.data.answer),
  startScribe: (patientId, payload) => api.post(`/api/clinical/patients/${patientId}/scribe/start`, payload).then((response) => response.data.session),
  updateScribe: (patientId, sessionId, transcript) => api.patch(`/api/clinical/patients/${patientId}/scribe/${sessionId}`, { transcript }).then((response) => response.data.session),
  stopScribe: (patientId, sessionId, transcript) => api.post(`/api/clinical/patients/${patientId}/scribe/${sessionId}/stop`, { transcript }).then((response) => response.data.session),
  approveScribe: (patientId, sessionId, payload) => api.post(`/api/clinical/patients/${patientId}/scribe/${sessionId}/approve`, payload).then((response) => response.data),
}
