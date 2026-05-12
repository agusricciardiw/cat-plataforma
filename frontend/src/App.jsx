import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SessionGuard from './components/SessionGuard'
import Login from './pages/Login'
import Home from './pages/Home'
import Misiones from './pages/Misiones'
import MisionesAgente from './pages/MisionesAgente'
import OrdenServicio from './pages/OrdenServicio'
import OSAdicionalPage from './pages/OSAdicionalPage'
import MiEquipo from './pages/MiEquipo'
import ServiciosAdicionalesPage from './pages/ServiciosAdicionalesPage'
import PresupuestosPage from './pages/PresupuestosPage'
import ServiciosPage from './pages/ServiciosPage'
import ServicioDetalle from './pages/ServicioDetalle'
import CobrosPage from './pages/CobrosPage'
import FacturacionPage from './pages/FacturacionPage'
import FacturarPage from './pages/FacturarPage'
import ImportarNominaPage from './pages/ImportarNominaPage'
import NominaPage from './pages/NominaPage'
import PostularPage from './pages/PostularPage'
import AdminUsuariosPage from './pages/AdminUsuariosPage'
import AdminPermisosPage from './pages/AdminPermisosPage'

/**
 * Guard genérico basado en permiso VER_*.
 * Si el usuario no tiene el permiso → redirige a /.
 */
function RutaConPermiso({ permiso, children }) {
  const { tienePermiso } = useAuth()
  if (!tienePermiso(permiso)) return <Navigate to="/" replace />
  return children
}

/** Misiones: agentes ven su vista propia, el resto ve la lista general */
function RutaMisiones() {
  const { profile, tienePermiso } = useAuth()
  if (!tienePermiso('VER_MISIONES')) return <Navigate to="/" replace />
  if (profile?.role === 'agente') return <MisionesAgente />
  return <Misiones />
}

/** Admin: solo rol 'admin' */
function RutaAdmin({ children }) {
  const { profile } = useAuth()
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionGuard>
          <Routes>
            <Route path="/login"             element={<Login />} />
            <Route path="/facturar/:token"   element={<FacturarPage />} />
            <Route path="/postular/:token"   element={<PostularPage />} />

            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

            <Route path="/misiones"
              element={<ProtectedRoute><RutaMisiones /></ProtectedRoute>} />

            <Route path="/os"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_OS"><OrdenServicio /></RutaConPermiso></ProtectedRoute>} />

            <Route path="/os-adicional"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_OS_ADICIONAL"><OSAdicionalPage /></RutaConPermiso></ProtectedRoute>} />
            <Route path="/os-adicional/:id"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_OS_ADICIONAL"><OSAdicionalPage /></RutaConPermiso></ProtectedRoute>} />

            <Route path="/equipo"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_EQUIPO"><MiEquipo /></RutaConPermiso></ProtectedRoute>} />

            <Route path="/servicios-adicionales"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_SSAA"><ServiciosAdicionalesPage /></RutaConPermiso></ProtectedRoute>} />
            <Route path="/servicios-adicionales/:id"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_SSAA"><ServiciosAdicionalesPage /></RutaConPermiso></ProtectedRoute>} />

            <Route path="/presupuestos"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_PRESUPUESTOS"><PresupuestosPage /></RutaConPermiso></ProtectedRoute>} />

            <Route path="/servicios"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_SERVICIOS"><ServiciosPage /></RutaConPermiso></ProtectedRoute>} />
            <Route path="/servicios/:id"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_SERVICIOS"><ServicioDetalle /></RutaConPermiso></ProtectedRoute>} />

            <Route path="/cobros"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_COBROS"><CobrosPage /></RutaConPermiso></ProtectedRoute>} />

            <Route path="/facturacion"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_FACTURACION"><FacturacionPage /></RutaConPermiso></ProtectedRoute>} />

            <Route path="/nomina"
              element={<ProtectedRoute><RutaConPermiso permiso="VER_NOMINA"><NominaPage /></RutaConPermiso></ProtectedRoute>} />

            <Route path="/importar-nomina"
              element={<ProtectedRoute><RutaConPermiso permiso="ADMIN_IMPORTAR_NOMINA"><ImportarNominaPage /></RutaConPermiso></ProtectedRoute>} />

            <Route path="/admin/usuarios"
              element={<ProtectedRoute><RutaAdmin><AdminUsuariosPage /></RutaAdmin></ProtectedRoute>} />
            <Route path="/admin/permisos"
              element={<ProtectedRoute><RutaAdmin><AdminPermisosPage /></RutaAdmin></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SessionGuard>
      </AuthProvider>
    </BrowserRouter>
  )
}
