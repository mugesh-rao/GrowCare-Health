import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '../../lib/cn'

const tones = {
  error: { wrap: 'bg-red-50 text-red-700 border-red-100', Icon: AlertCircle },
  success: {
    wrap: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Icon: CheckCircle2,
  },
  info: { wrap: 'bg-brand-50 text-brand-700 border-brand-100', Icon: Info },
}

/** Alert atom — inline feedback (form errors, success messages). */
export default function Alert({ tone = 'info', children, className }) {
  const { wrap, Icon } = tones[tone]
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
        wrap,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
