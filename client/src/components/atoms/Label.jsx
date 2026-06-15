import { cn } from '../../lib/cn'

/** Label atom. */
export default function Label({ children, className, required, ...props }) {
  return (
    <label
      className={cn('mb-1.5 block text-sm font-medium text-ink', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  )
}
