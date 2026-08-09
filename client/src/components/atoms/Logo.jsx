import { cn } from '../../lib/cn'
import brandMark from '../../assets/brand/growcare-mark.png'
import brandWordmark from '../../assets/brand/growcare-wordmark.png'

/** The generated GrowCare mark and wordmark used throughout the desktop shell. */
export default function Logo({ className, showText = true, invert = false }) {
  const source = showText ? brandWordmark : brandMark

  return (
    <div className={cn('flex items-center', className)}>
      <img
        src={source}
        alt="GrowCare"
        className={cn(
          'block w-auto object-contain',
          showText ? 'h-8 max-w-[9.5rem]' : 'h-8 max-w-9',
          invert && 'brightness-0 invert',
        )}
      />
    </div>
  )
}
