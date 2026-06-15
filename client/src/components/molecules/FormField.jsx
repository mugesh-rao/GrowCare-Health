import { Input, Label } from '../atoms'

/**
 * FormField molecule — Label + Input + error/hint message.
 * Composes atoms so pages never wire them up by hand.
 */
export default function FormField({
  id,
  label,
  required,
  error,
  hint,
  ...inputProps
}) {
  return (
    <div>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      <Input id={id} error={error} aria-invalid={!!error} {...inputProps} />
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
