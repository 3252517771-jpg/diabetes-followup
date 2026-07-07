import { Navigate, Route, Routes } from 'react-router-dom'

import { GlucoseEntryPage } from './pages/GlucoseEntryPage'
import { NotificationListPage } from './pages/NotificationListPage'

export default function App() {
  return (
    <Routes>
      <Route path="/h5/glucose" element={<GlucoseEntryPage />} />
      <Route path="/h5/notifications" element={<NotificationListPage />} />
      <Route path="*" element={<Navigate to="/h5/glucose" replace />} />
    </Routes>
  )
}
