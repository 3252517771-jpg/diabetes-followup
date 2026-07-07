import { Spin, ConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import themeConfig from '../config/theme'
import { ROUTE_PATHS } from '../config/routes'
import { useAuth } from '../hooks/useAuth'
import { AuthProvider } from '../store/AuthContext'
import { MainLayout } from '../components/layout/MainLayout'
import { DashboardPage } from '../pages/DashboardPage'
import { LoginPage } from '../pages/LoginPage'

const queryClient = new QueryClient()

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="fullscreen-center"><Spin size="large" /></div>
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.login} replace />
  }

  return (
    <MainLayout>
      <DashboardPage />
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
      <Route path={ROUTE_PATHS.dashboard} element={<ProtectedRoute />} />
    </Routes>
  )
}

export function AppRouter() {
  return (
    <ConfigProvider theme={themeConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <RouterContent />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ConfigProvider>
  )
}
