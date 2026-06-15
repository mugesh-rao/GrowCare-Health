import { Badge } from '../atoms'

const riskTone = {
  High: 'danger',
  Medium: 'warning',
  Low: 'success',
}

const statusTone = {
  Active: 'brand',
  Monitoring: 'warning',
  New: 'success',
  Completed: 'neutral',
  Booked: 'brand',
  Scheduled: 'warning',
  'Report added': 'neutral',
}

export default function PatientBadge({ value, kind = 'status' }) {
  const tone = kind === 'risk' ? riskTone[value] : statusTone[value]
  return <Badge tone={tone || 'neutral'}>{value}</Badge>
}
