import { Link } from 'react-router-dom'
import { ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Logo } from '../atoms'

const highlights = [
  { Icon: Zap, text: 'Automate WhatsApp campaigns in minutes' },
  { Icon: ShieldCheck, text: 'Bank-grade security & end-to-end encryption' },
  { Icon: Sparkles, text: 'Smart flows, broadcasts & live analytics' },
]

/**
 * AuthLayout organism — premium split-screen shell for auth pages.
 * Left: form (children). Right: branded gradient panel.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <Link to="/" className="inline-flex">
          <Logo />
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
                {title}
              </h1>
              {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
            </div>
            {children}
            {footer && (
              <div className="mt-6 text-center text-sm text-muted">{footer}</div>
            )}
          </div>
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-night-900 via-night-800 to-brand-900 lg:block">
        {/* Glow blobs */}
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-10 h-[28rem] w-[28rem] rounded-full bg-brand-400/30 blur-3xl" />
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <span className="badge w-fit bg-white/15 text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Premium platform
          </span>
          <h2 className="mt-6 font-display text-4xl font-extrabold leading-tight">
            The smartest way to run WhatsApp at scale.
          </h2>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Join thousands of teams automating conversations, broadcasts, and
            support — all from one beautiful workspace.
          </p>

          <ul className="mt-10 space-y-4">
            {highlights.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
