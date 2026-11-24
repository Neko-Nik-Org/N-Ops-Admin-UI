/*
 * Copyright (C) 2026 Neko Nik <nikhil@nekonik.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

/**
 * Application entry point.
 *
 * Loads the global stylesheets (the bundled IBM Plex fonts, Tailwind theme tokens, toast styles, and src/styles/ for the
 * loaders and the sign-in screens) and mounts <App /> into #root (StrictMode is off for now).
 */

import { createRoot } from 'react-dom/client'
// Fonts are bundled with the app (Latin only, the weights in use): no requests to an outside font service
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import '@/assets/styles/n-loading.css'
import '@/assets/styles/n-auth.css'
import App from './App.tsx'
import { preloadRoute } from '@/routes/lazyPages'
import { ROUTES } from './constants/routes'
import { getSessionToken } from '@/store/sessionToken'
import { applyLowPowerMode } from '@/utils/lowPower'
import { initSecureStorage, secureStorage } from '@/utils/secureStorage'

// Older or weaker machines skip decorative motion and blur (see utils/lowPower)
applyLowPowerMode()

// Start downloading this URL's page now, alongside the startup requests, rather than after them.
// Without a saved session the sign-in page is where most visits end up, so fetch that too.
preloadRoute(window.location.pathname)
if (!getSessionToken()) preloadRoute(ROUTES.login)

// Saved settings are encrypted: decrypt them (a few milliseconds) before the first render, then
// apply the saved theme so the app opens in it. Until then the boot screen follows the system theme.
void initSecureStorage().then(() => {
  const saved = secureStorage.getItem('nops-theme')
  const theme = saved ? (JSON.parse(saved) as string) : 'system'
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme

  createRoot(document.getElementById('root')!).render(
    <>
      <App />
    </>,
  )
})
