import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn — merge conditional class names and dedupe conflicting
 * Tailwind utilities (e.g. `px-2 px-4` -> `px-4`).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
