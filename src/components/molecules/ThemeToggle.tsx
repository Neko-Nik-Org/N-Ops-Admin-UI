import { useAtom } from 'jotai'
import { Monitor, Moon, Sun } from 'lucide-react'
import { themeAtom, type Theme } from '@/app/theme'
import { cn } from '@/utils/cn'

const OPTIONS: Array<{ value: Theme; icon: typeof Sun; label: string }> = [
  { value: 'light', icon: Sun, label: 'Light theme' },
  { value: 'dark', icon: Moon, label: 'Dark theme' },
  { value: 'system', icon: Monitor, label: 'Match system theme' },
]

export const ThemeToggle = () => {
  const [theme, setTheme] = useAtom(themeAtom)

  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-raised p-0.5">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex size-7 items-center justify-center rounded transition-colors duration-150',
            theme === value ? 'bg-signal text-ink' : 'text-text-muted hover:text-text',
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
