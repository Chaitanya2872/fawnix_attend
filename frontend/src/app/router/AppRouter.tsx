import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { appRoutes } from '../config/routes'

const HomePage = lazy(() => import('../../features/public/pages/HomePage'))
const PrivacyPolicyPage = lazy(() => import('../../features/privacy/pages/PrivacyPolicyPage'))
const AdminDashboardPage = lazy(() => import('../../features/admin/pages/AdminDashboardPage'))

function RouteFallback() {
  return <div className="page" />
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path={appRoutes.home} element={<HomePage />} />
        <Route path={`${appRoutes.admin}/*`} element={<AdminDashboardPage />} />
        <Route path={appRoutes.privacy} element={<PrivacyPolicyPage />} />
        <Route path={appRoutes.privacyAlias} element={<Navigate replace to={appRoutes.privacy} />} />
      </Routes>
    </Suspense>
  )
}
