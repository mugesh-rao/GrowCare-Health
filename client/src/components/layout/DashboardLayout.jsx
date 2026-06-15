/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const meta = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Clinic operations, appointments, and workflow automation' },
  '/dashboard/whatsapp': { title: 'WhatsApp', subtitle: 'Inbox, broadcasts, templates, and settings in one workspace' },
  '/dashboard/patients': { title: 'Patients', subtitle: 'Patient list, records, uploads, and longitudinal context views' },
  '/dashboard/patients/new': { title: 'Create Patient', subtitle: 'Add patient details, intake context, and attached documents' },
}

function getCurrentMeta(pathname) {
  if (pathname.startsWith('/dashboard/patients/') && pathname !== '/dashboard/patients/new') {
    return {
      title: 'Patient Record',
      subtitle: 'Review the patient timeline, report intelligence, documents, and contextual summary',
    }
  }

  return meta[pathname] || { title: 'GrowCare' }
}

/** App shell — dark sidebar + consistent header + scrollable content. */
export default function DashboardLayout() {
  const { pathname } = useLocation()
  const isPatientDetail = pathname.startsWith('/dashboard/patients/') && pathname !== '/dashboard/patients/new'
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

  useEffect(() => {
    if (!isPatientDetail) return
    setCollapsed(true)
    localStorage.setItem('wa_sidebar_collapsed', '1')
  }, [isPatientDetail])

  const current = getCurrentMeta(pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={current.title} subtitle={current.subtitle} actions={actions} />
        <main className={`flex-1 ${isPatientDetail ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div
            className={
              isPatientDetail
                ? 'h-full px-3 py-3'
                : 'mx-auto max-w-full px-6 py-7 sm:px-8'
            }
          >
            <Outlet context={{ setActions }} />
          </div>
        </main>
      </div>
    </div>
  )
}
