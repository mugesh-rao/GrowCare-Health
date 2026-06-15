import { Activity, CalendarClock, Workflow } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import Bookings from './Bookings'
import Overview from './Overview'
import Workflows from './Workflows'

const tabs = [
  {
    id: 'overview',
    label: 'Clinic Snapshot',
    Icon: Activity,
    blurb: 'Track patient conversations, connected numbers, and live care automation.',
  },
  {
    id: 'bookings',
    label: 'Appointments',
    Icon: CalendarClock,
    blurb: 'Review upcoming consultations, confirm visits, and manage cancellations.',
  },
  {
    id: 'workflows',
    label: 'Workflows',
    Icon: Workflow,
    blurb: 'Build and publish clinic journeys for booking, reminders, and follow-up.',
  },
]

const validTabs = new Set(tabs.map((tab) => tab.id))

export default function DashboardHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = validTabs.has(searchParams.get('tab')) ? searchParams.get('tab') : 'overview'

  const renderTab = () => {
    if (activeTab === 'bookings') return <Bookings />
    if (activeTab === 'workflows') return <Workflows />
    return <Overview />
  }

  return (
    <div className="space-y-6">
   

      <div className="flex flex-wrap gap-3">
        {tabs.map(({ id, label, Icon }) => {
          const active = id === activeTab
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSearchParams(id === 'overview' ? {} : { tab: id })}
              className={
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ' +
                (active
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50')
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          )
        })}
      </div>

      {renderTab()}
    </div>
  )
}
