import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Componente global que:
 * - Redirige a /login si no hay sesión
 * - Muestra banner de "Sesión cerrada por inactividad" cuando corresponde
 */
export default function SessionGuard({ children }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mostrarBanner, setMostrarBanner] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user && location.pathname !== '/login') {
      // Si había sesión antes y ahora no hay → fue por inactividad
      const teniaSession = sessionStorage.getItem('cat_session_active')
      if (teniaSession) {
        sessionStorage.removeItem('cat_session_active')
        setMostrarBanner(true)
        setTimeout(() => setMostrarBanner(false), 5000)
      }
      navigate('/login')
    }
    if (user) {
      sessionStorage.setItem('cat_session_active', '1')
    }
  }, [user, loading, location.pathname])

  return (
    <>
      {mostrarBanner && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#1a2744', color: '#fff', borderRadius: 12,
          padding: '12px 20px', fontSize: 13, fontWeight: 600,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'fadeIn 0.3s ease',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c800" strokeWidth="2" style={{width:16,height:16,flexShrink:0}}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Sesión cerrada por inactividad. Volvé a ingresar.
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }`}</style>
      {children}
    </>
  )
}
