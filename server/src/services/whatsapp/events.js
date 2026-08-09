function hasValue(value) {
  return String(value ?? '').trim() !== ''
}

function parseDateInput(value) {
  if (!hasValue(value)) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseNumberInput(value) {
  if (!hasValue(value)) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function validateEvent(event) {
  if (event == null) return []

  if (!event || typeof event !== 'object') {
    return ['Event configuration is invalid.']
  }

  const errors = []
  if (!hasValue(event.name)) {
    errors.push('Event name is required.')
  }

  const startDate = parseDateInput(event.startDate)
  if (!startDate) {
    errors.push('Event start date is invalid.')
  }

  const endDate = parseDateInput(event.endDate)
  if (hasValue(event.endDate) && !endDate) {
    errors.push('Event end date is invalid.')
  }

  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    errors.push('Event end date must be after the start date.')
  }

  if (hasValue(event.callType) && !['audio', 'video'].includes(String(event.callType).trim())) {
    errors.push('Event call type must be audio or video.')
  }

  const hasLatitude = hasValue(event.latitude)
  const hasLongitude = hasValue(event.longitude)
  if (hasLatitude !== hasLongitude) {
    errors.push('Event location needs both latitude and longitude.')
  }

  const latitude = parseNumberInput(event.latitude)
  const longitude = parseNumberInput(event.longitude)
  if (hasLatitude && latitude == null) {
    errors.push('Event latitude is invalid.')
  }
  if (hasLongitude && longitude == null) {
    errors.push('Event longitude is invalid.')
  }

  return errors
}

function buildEventMessage(event = {}) {
  const payload = {
    name: String(event.name || '').trim(),
    startDate: parseDateInput(event.startDate),
  }

  const description = String(event.description || '').trim()
  if (description) payload.description = description

  const endDate = parseDateInput(event.endDate)
  if (endDate) payload.endDate = endDate

  const callType = String(event.callType || '').trim()
  if (callType) payload.call = callType

  if (event.extraGuestsAllowed) payload.extraGuestsAllowed = true
  if (event.isCancelled) payload.isCancelled = true
  if (event.isScheduleCall) payload.isScheduleCall = true

  const latitude = parseNumberInput(event.latitude)
  const longitude = parseNumberInput(event.longitude)
  if (latitude != null && longitude != null) {
    payload.location = {
      degreesLatitude: latitude,
      degreesLongitude: longitude,
    }
    const name = String(event.locationName || '').trim()
    const address = String(event.locationAddress || '').trim()
    if (name) payload.location.name = name
    if (address) payload.location.address = address
  }

  return payload
}

module.exports = { validateEvent, buildEventMessage }
