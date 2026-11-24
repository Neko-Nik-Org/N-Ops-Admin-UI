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
 * Root component: restores any saved session, then renders the router
 * inside the app-wide providers.
 */

import { AppProviders } from '@/AppProviders'
import { AppRouter } from '@/routes/router'
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap'

/**
 * Starts the session check on first render (see useSessionBootstrap), so the
 * route guards know whether to show the dashboard or the login screen.
 */
const App = () => {
  useSessionBootstrap()

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}

export default App
