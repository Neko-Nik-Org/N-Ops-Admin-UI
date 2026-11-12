import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ hasError, className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-md border border-border bg-surface-raised px-3 py-2.5 text-sm text-text',
      'placeholder:text-text-muted transition-colors duration-150',
      'focus-visible:border-signal',
      hasError && 'border-danger',
      className,
    )}
    {...props}
  />
))

Input.displayName = 'Input'
