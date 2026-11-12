import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'size-4 rounded border-border bg-surface-raised accent-signal',
        'focus-visible:border-signal',
        className,
      )}
      {...props}
    />
  ),
)

Checkbox.displayName = 'Checkbox'
