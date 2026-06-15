import { HeartPulse } from 'lucide-react'
import { cn } from '../../lib/cn'

/** Logo atom - GrowCare brand mark + wordmark. */
export default function Logo({ className, showText = true, invert = false }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-night-900">
        <HeartPulse className="h-5 w-5" strokeWidth={2.25} />
      </span>
      {showText && (
        <span
          className={cn(
            'font-display text-lg font-extrabold tracking-tight',
            invert ? 'text-white' : 'text-ink',
          )}
        >
          Grow<span className="text-brand-500">Care</span>
        </span>
      )}
    </div>
  )
}
