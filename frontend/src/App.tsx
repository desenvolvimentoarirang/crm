import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import { useAuthInit } from './hooks/useAuthInit'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ConversationsPage from './pages/ConversationsPage'
import ContactsPage from './pages/ContactsPage'
import UsersPage from './pages/UsersPage'
import InstancesPage from './pages/InstancesPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/conversations" replace />
  return <>{children}</>
}

export default function App() {
  const ready = useAuthInit()

  // Aguarda a tentativa de refresh antes de renderizar as rotas
  // Evita flash de redirect para /login quando o usuário já tem sessão válida
  if (!ready) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="conversations" element={<ConversationsPage />} />
          <Route path="conversations/:id" element={<ConversationsPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route
            path="users"
            element={
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="instances"
            element={
              <AdminRoute>
                <InstancesPage />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
