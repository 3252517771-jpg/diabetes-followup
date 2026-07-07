import { App as AntApp, ConfigProvider, Spin } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import themeConfig from '../config/theme'
import { ROUTE_PATHS } from '../config/routes'
import { useAuth } from '../hooks/useAuth'
import { MainLayout } from '../components/layout/MainLayout'
import { AuthProvider } from '../store/AuthContext'
import { DashboardPage } from '../pages/DashboardPage'
import { GlucoseOverviewPage } from '../pages/GlucoseOverviewPage'
import { LoginPage } from '../pages/LoginPage'
import { PatientDetailPage } from '../pages/PatientDetailPage'
import { PatientFormPage } from '../pages/PatientFormPage'
import { PatientListPage } from '../pages/PatientListPage'

const queryClient = new QueryClient()

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="fullscreen-center">
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.login} replace />
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  )
}

function RouterContent() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path={ROUTE_PATHS.login}
        element={isAuthenticated ? <Navigate to={ROUTE_PATHS.dashboard} replace /> : <LoginPage />}
      />
      <Route element={<ProtectedLayout />}>
        <Route path={ROUTE_PATHS.dashboard} element={<DashboardPage />} />
        <Route path={ROUTE_PATHS.patients} element={<PatientListPage />} />
        <Route path={ROUTE_PATHS.patientCreate} element={<PatientFormPage />} />
        <Route path={ROUTE_PATHS.patientDetail} element={<PatientDetailPage />} />
        <Route path={ROUTE_PATHS.patientEdit} element={<PatientFormPage />} />
        <Route path={ROUTE_PATHS.glucoseOverview} element={<GlucoseOverviewPage />} />
      </Route>
    </Routes>
  )
}

export function AppRouter() {
  return (
    <ConfigProvider theme={themeConfig}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <RouterContent />
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}
