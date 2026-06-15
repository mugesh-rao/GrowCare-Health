import { cn } from '../../lib/cn'

const tones = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  neutral: 'bg-slate-100 text-slate-600',
}

/** Badge atom. */
export default function Badge({ children, tone = 'neutral', className, ...props }) {
  return (
    <span className={cn('badge', tones[tone], className)} {...props}>
      {children}
    </span>
  )
}
