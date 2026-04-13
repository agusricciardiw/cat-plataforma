import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext({})

const INACTIVITY_TIMEOUT_MINUTES = 30
const INACTIVITY_MS = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const inactivityTimer = useRef(null)

  // ── Inactividad (Vu4) ──────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(() => {
      _cerrarSesion(true)
    }, INACTIVITY_MS)
  }, [])

  function startInactivityWatcher() {
    resetInactivityTimer()
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetInactivityTimer, { passive: true }))
  }

  function stopInactivityWatcher() {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetInactivityTimer))
  }

  function _cerrarSesion(porInactividad = false) {
    stopInactivityWatcher()
    const refreshToken = sessionStorage.getItem('cat_refresh_token')
    if (refreshToken) {
      api.post('/api/auth/logout', { refreshToken }).catch(() => {})
    }
    sessionStorage.removeItem('cat_token')
    sessionStorage.removeItem('cat_refresh_token')
    sessionStorage.removeItem('cat_user')
    if (porInactividad) sessionStorage.setItem('cat_inactividad', '1')
    setUser(null)
    setProfile(null)
  }

  // ── Inicialización ─────────────────────────────────────────
  useEffect(() => {
    const storedUser = sessionStorage.getItem('cat_user')
    const token      = sessionStorage.getItem('cat_token')

    if (storedUser && token) {
      const parsed = JSON.parse(storedUser)
      setUser(parsed)
      setProfile(parsed)
      startInactivityWatcher()
    }
    setLoading(false)

    // Escuchar expiración de token (401 desde api.js)
    const onExpired = () => _cerrarSesion(true)
    window.addEventListener('cat:session_expired', onExpired)
    return () => {
      window.removeEventListener('cat:session_expired', onExpired)
      stopInactivityWatcher()
    }
  }, [])

  // ── signIn (Vu6: errores genéricos) ────────────────────────
  async function signIn(email, password) {
    try {
      const data = await api.post('/api/auth/login', { email, password })

      // Guardar en sessionStorage (Vu3)
      sessionStorage.setItem('cat_token',         data.token)
      sessionStorage.setItem('cat_refresh_token', data.refreshToken)
      sessionStorage.setItem('cat_user',          JSON.stringify(data.user))
      sessionStorage.setItem('cat_session_active','1')

      setUser(data.user)
      setProfile(data.user)
      startInactivityWatcher()
      return { error: null }
    } catch (err) {
      return { error: { message: mapearErrorAuth(err) } }
    }
  }

  async function signOut() {
    _cerrarSesion(false)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

function mapearErrorAuth(err) {
  const status = err?.status
  const msg    = err?.message ?? ''

  if (status === 401 || msg.includes('incorrectas')) return 'Usuario o contraseña incorrectos.'
  if (status === 429 || msg.includes('intentos'))    return 'Demasiados intentos. Esperá unos minutos.'
  if (msg.includes('conexión') || msg.includes('fetch')) return 'Error de conexión. Verificá tu red e intentá nuevamente.'
  return 'No se pudo iniciar sesión. Intentá nuevamente o contactá al administrador.'
}

export const useAuth = () => useContext(AuthContext)
