import { Outlet } from 'react-router'
import { RequireAuth } from '../auth/RouteGuards.tsx'
import { GlobalDock } from '../components/GlobalDock.tsx'

/** Every signed-in page: the page itself plus the one global module dock */
export default function AuthedLayout() {
  return (
    <RequireAuth>
      <Outlet />
      <GlobalDock />
    </RequireAuth>
  )
}
