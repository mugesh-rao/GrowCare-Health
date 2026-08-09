/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { ScribeWidget } from '../Clinic'

/** App shell — dark sidebar + consistent header + scrollable content. */
export default function DashboardLayout() {
  const { pathname } = useLocation()
  const isPatientDetail = pathname.startsWith('/dashboard/patients/') && pathname !== '/dashboard/patients/new'
  const isScribeWorkspace = pathname.endsWith('/scribe')
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

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header actions={actions} />
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
        {!isScribeWorkspace && <ScribeWidget />}
      </div>
    </div>
  )
}
