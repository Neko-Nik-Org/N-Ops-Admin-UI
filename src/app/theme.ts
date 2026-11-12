import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export type Theme = 'light' | 'dark' | 'system'

export const themeAtom = atomWithStorage<Theme>('nops-theme', 'system')

const systemPrefersLightAtom = atom(false)
systemPrefersLightAtom.onMount = (setAtom) => {
  const mql = window.matchMedia('(prefers-color-scheme: light)')
  setAtom(mql.matches)
  const listener = (event: MediaQueryListEvent) => setAtom(event.matches)
  mql.addEventListener('change', listener)
  return () => mql.removeEventListener('change', listener)
}

export const resolvedThemeAtom = atom((get) => {
  const theme = get(themeAtom)
  if (theme !== 'system') return theme
  return get(systemPrefersLightAtom) ? 'light' : 'dark'
})
