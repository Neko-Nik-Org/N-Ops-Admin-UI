import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/utils/cn'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/** A row of single-digit boxes for a numeric code, with auto-advance, backspace and paste support. */
export const OtpInput = ({ length = 6, value, onChange, disabled }: OtpInputProps) => {
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  const setDigitAt = (index: number, digit: string) => {
    const digits = value.padEnd(length, ' ').split('')
    digits[index] = digit || ' '
    onChange(digits.join('').trimEnd())
  }

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    setDigitAt(index, digit)
    if (digit && index < length - 1) inputs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!digits) return
    event.preventDefault()
    onChange(digits)
    inputs.current[Math.min(digits.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-2">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el
          }}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1} of ${length}`}
          className={cn(
            'h-14 w-12 rounded-md border border-border bg-surface-raised text-center font-mono text-lg text-text',
            'transition-colors duration-150 focus-visible:border-signal disabled:opacity-60',
          )}
        />
      ))}
    </div>
  )
}
