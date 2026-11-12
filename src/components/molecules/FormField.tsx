import type { ReactNode } from 'react'

interface FormFieldProps {
  id: string
  label: string
  /** Rendered on the same row, right-aligned — e.g. a "Forgot password?" link. */
  labelExtra?: ReactNode
  error?: string
  children: ReactNode
}

export const FormField = ({ id, label, labelExtra, error, children }: FormFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-sm text-text-muted">
        {label}
      </label>
      {labelExtra}
    </div>
    {children}
    {error && (
      <p className="text-sm text-danger" role="alert">
        {error}
      </p>
    )}
  </div>
)
