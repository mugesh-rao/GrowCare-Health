import { cn } from '../../lib/cn'

/** Card atom + composable subparts. */
export default function Card({ className, children, ...props }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('border-b border-line px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

Card.Body = function CardBody({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-5', className)} {...props}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('border-t border-line px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}
