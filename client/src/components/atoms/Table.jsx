import { cn } from '../../lib/cn'

/**
 * Table atom — a thin, styled wrapper around native table elements.
 * Usage:
 *   <Table>
 *     <Table.Head><Table.Row><Table.Th>Name</Table.Th>...</Table.Row></Table.Head>
 *     <Table.Body><Table.Row><Table.Td>...</Table.Td></Table.Row></Table.Body>
 *   </Table>
 */
export default function Table({ className, children, ...props }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className={cn('w-full text-left text-sm', className)} {...props}>
          {children}
        </table>
      </div>
    </div>
  )
}

Table.Head = function Head({ children, ...props }) {
  return (
    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500" {...props}>
      {children}
    </thead>
  )
}

Table.Body = function Body({ children, ...props }) {
  return (
    <tbody className="divide-y divide-line" {...props}>
      {children}
    </tbody>
  )
}

Table.Row = function Row({ className, children, ...props }) {
  return (
    <tr className={cn('transition hover:bg-slate-50/60', className)} {...props}>
      {children}
    </tr>
  )
}

Table.Th = function Th({ className, children, ...props }) {
  return (
    <th className={cn('px-5 py-3 font-semibold', className)} {...props}>
      {children}
    </th>
  )
}

Table.Td = function Td({ className, children, ...props }) {
  return (
    <td className={cn('px-5 py-3.5 text-ink', className)} {...props}>
      {children}
    </td>
  )
}
