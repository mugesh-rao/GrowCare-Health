import { FileText, Inbox, Send, Settings } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import BulkMessaging from './BulkMessaging'
import InboxPage from './Inbox'
import SettingsPage from './Settings'
import Templates from './Templates'

const tabs = [
  {
    id: 'inbox',
    label: 'Inbox',
    Icon: Inbox,
    blurb: 'Handle patient conversations, notes, statuses, and handoffs.',
  },
  {
    id: 'broadcasts',
    label: 'Broadcasts',
    Icon: Send,
    blurb: 'Send reminders, visit instructions, and follow-up campaigns at scale.',
  },
  {
    id: 'templates',
    label: 'Templates',
    Icon: FileText,
    blurb: 'Save reusable patient communication templates for the team and workflows.',
  },
  {
    id: 'settings',
    label: 'Settings',
    Icon: Settings,
    blurb: 'Manage clinic profile details, WhatsApp numbers, and connection safety.',
  },
]

const validTabs = new Set(tabs.map((tab) => tab.id))

export default function WhatsAppHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = validTabs.has(searchParams.get('tab')) ? searchParams.get('tab') : 'inbox'

  const renderTab = () => {
    if (activeTab === 'broadcasts') return <BulkMessaging />
    if (activeTab === 'templates') return <Templates />
    if (activeTab === 'settings') return <SettingsPage />
    return <InboxPage />
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
              onClick={() => setSearchParams(id === 'inbox' ? {} : { tab: id })}
              className={
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ' +
                (active
                  ? 'border-night-900 bg-night-900 text-white'
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
