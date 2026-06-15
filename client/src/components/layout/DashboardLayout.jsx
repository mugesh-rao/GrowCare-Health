import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const meta = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Clinic operations, appointments, and workflow automation' },
  '/dashboard/whatsapp': { title: 'WhatsApp', subtitle: 'Inbox, broadcasts, templates, and settings in one workspace' },
}

/** App shell — dark sidebar + consistent header + scrollable content. */
export default function DashboardLayout() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('wa_sidebar_collapsed') === '1',
  )
  const [actions, setActions] = useState(null)

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('wa_sidebar_collapsed', next ? '1' : '0')
      return next
    })
  }

  const current = meta[pathname] || { title: 'GrowCare' }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={current.title} subtitle={current.subtitle} actions={actions} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-7 sm:px-8">
            <Outlet context={{ setActions }} />
          </div>
        </main>
      </div>
    </div>
  )
}
