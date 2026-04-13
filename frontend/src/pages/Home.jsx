import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import NavbarMobile from '../components/NavbarMobile'

const ROLE_LABELS = {
  gerencia: 'Gerencia operativa', jefe_base: 'Jefe de base',
  coordinador: 'Coordinador de turno', supervisor: 'Supervisor',
  agente: 'Agente de transito', admin: 'Administrador',
}

const MODULES = [
  {
    id: 'misiones', label: 'Misiones', sub: '3 pendientes hoy', badge: '3',
    iconBg: '#e8f0fe', badgeBg: '#e8f0fe', badgeColor: '#1a2744', path: '/misiones',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2744" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  },
  {
    id: 'os', label: 'Ordenes de servicio', sub: 'Planificacion semanal', badge: null,
    iconBg: '#e4eaf5', badgeBg: null, badgeColor: null, path: '/os',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2744" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  },
  {
    id: 'rrhh', label: 'RRHH', sub: '1 encuesta pendiente', badge: '1',
    iconBg: '#faeeda', badgeBg: '#faeeda', badgeColor: '#854f0b', path: '/rrhh',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#854f0b" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>,
  },
  {
    id: 'equipo', label: 'Mi equipo', sub: '6 agentes a cargo', badge: null,
    iconBg: '#eeedf8', badgeBg: null, badgeColor: null, path: '/equipo',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3c3489" strokeWidth="2"><circle cx="12" cy="8" r="3"/><path d="M6 20v-2a6 6 0 0112 0v2"/><circle cx="4" cy="14" r="2"/><path d="M2 20v-1a4 4 0 014-4"/></svg>,
  },
]

const ACTIVITY = [
  { dot: '#185fa5', text: 'Nueva mision asignada', sub: 'Reclamo vecinal · Av. Corrientes 1200', time: 'hace 12 min', tag: 'Mision', path: '/misiones' },
  { dot: '#854f0b', text: 'RRHH publico una encuesta', sub: 'Clima laboral · completa antes del viernes', time: 'hace 1 h', tag: 'RRHH', path: '/rrhh' },
  { dot: '#0f6e56', text: 'Mision #M-0389 cumplida', sub: 'Garcia, L. · Base Centro', time: 'hace 2 h', tag: 'Mision', path: '/misiones' },
  { dot: '#534ab7', text: 'Cobertura designada', sub: 'Rodriguez, M. cubre turno tarde', time: 'hace 3 h', tag: 'Equipo', path: '/equipo' },
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos dias' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

function getFecha() {
  return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ── MOBILE ────────────────────────────────────────────────────
function MobileHome({ profile, initials, signOut, navigate }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: '#1a2744', padding: '52px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 26, height: 26, background: '#f5c800', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#1a2744' }}>BA</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Plataforma CAT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
            <div style={{ width: 7, height: 7, background: '#f5c800', borderRadius: '50%', position: 'absolute', top: 5, right: 5 }}/>
          </div>
          <div onClick={() => navigate('/perfil')} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f5c800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#1a2744', cursor: 'pointer' }}>{initials}</div>
        </div>
      </div>

      <div style={{ background: '#1a2744', padding: '4px 20px 0' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>{getGreeting()}</div>
        <div style={{ fontSize: 21, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 9 }}>
          {profile?.nombre_completo ?? '—'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
            {ROLE_LABELS[profile?.role] ?? '—'} · {profile?.base_nombre ?? '—'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 20, background: 'rgba(78,205,196,0.18)', color: '#4ecdc4' }}>
            Turno {profile?.turno ?? '—'}
          </span>
        </div>
      </div>

      <div style={{ background: '#1a2744' }}>
        <div style={{ background: '#f5f5f7', borderRadius: '22px 22px 0 0', padding: '20px 16px 90px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12, display: 'block' }}>Accesos rapidos</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {MODULES.map(m => (
              <div key={m.id} onClick={() => navigate(m.path)} style={{ background: '#fff', borderRadius: 18, padding: 18, border: '0.5px solid #e5e5ea', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.icon}</div>
                  {m.badge && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 9, background: m.badgeBg, color: m.badgeColor }}>{m.badge}</span>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: '#8e8e93' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          <span style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12, display: 'block' }}>Actividad reciente</span>
          <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
            {ACTIVITY.map((a, i) => (
              <div key={i} onClick={() => navigate(a.path)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', borderBottom: i < ACTIVITY.length - 1 ? '0.5px solid #f5f5f7' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.dot, flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: '#8e8e93', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.sub}</div>
                </div>
                <span style={{ fontSize: 11, color: '#c7c7cc', flexShrink: 0 }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NavbarMobile onPlus={() => {}} />
    </div>
  )
}

// ── DESKTOP ───────────────────────────────────────────────────
function DesktopHome({ profile, initials, signOut, navigate }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ height: '100vh', background: '#f5f5f7', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar />

      <div style={{ background: '#fff', padding: '22px 44px 20px', borderBottom: '0.5px solid #e5e5ea', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, color: '#aeaeb2', marginBottom: 5 }}>{getGreeting()} — {getFecha()}</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#1a2744', letterSpacing: '-1.2px', lineHeight: 1, marginBottom: 11 }}>
              {profile?.nombre_completo ?? '—'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, padding: '5px 14px', borderRadius: 20, background: '#eeedf8', color: '#3c3489' }}>
                {ROLE_LABELS[profile?.role] ?? '—'}
              </span>
              <span style={{ color: '#d1d1d6', fontSize: 16 }}>·</span>
              <span style={{ fontSize: 14, color: '#8e8e93' }}>{profile?.base_nombre ?? '—'}</span>
              <span style={{ color: '#d1d1d6', fontSize: 16 }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 600, padding: '5px 14px', borderRadius: 20, background: '#e8faf2', color: '#0f6e56' }}>Turno activo</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#f5f5f7', border: '0.5px solid #e5e5ea', borderRadius: 13, padding: '9px 18px', fontSize: 16, color: '#1a2744', fontWeight: 600 }}>{time}</div>
            <button onClick={signOut} title="Cerrar sesion" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 44px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12, display: 'block' }}>Accesos rapidos</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {MODULES.map(m => (
              <div key={m.id} onClick={() => navigate(m.path)}
                style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '0.5px solid #e5e5ea', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.icon}</div>
                  {m.badge && <span style={{ fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: m.badgeBg, color: m.badgeColor }}>{m.badge}</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.2px' }}>{m.label}</div>
                <div style={{ fontSize: 13, color: '#8e8e93' }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12, display: 'block', flexShrink: 0 }}>Actividad reciente</span>
            <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', overflow: 'hidden', flex: 1 }}>
              {ACTIVITY.map((a, i) => (
                <div key={i} onClick={() => navigate(a.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', height: '25%', borderBottom: i < ACTIVITY.length - 1 ? '0.5px solid #f5f5f7' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: a.dot, flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 3 }}>{a.text}</div>
                    <div style={{ fontSize: 13, color: '#8e8e93' }}>{a.sub}</div>
                  </div>
                  <span style={{ fontSize: 12, color: '#c7c7cc', flexShrink: 0, whiteSpace: 'nowrap' }}>{a.time}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#8e8e93', background: '#f5f5f7', padding: '3px 10px', borderRadius: 8, flexShrink: 0 }}>{a.tag}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12, display: 'block', flexShrink: 0 }}>Mi turno</span>
            <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: '#1a2744' }}>Turno {profile?.turno ?? '—'}</span>
                <span style={{ background: '#e8faf2', color: '#0f6e56', fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>Activo</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                {[
                  { label: 'Base',   val: profile?.base_nombre ?? '—' },
                  { label: 'Rol',    val: ROLE_LABELS[profile?.role] ?? '—' },
                  { label: 'Legajo', val: `CAT · ${profile?.legajo ?? '—'}` },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '0.5px solid #f5f5f7' : 'none' }}>
                    <span style={{ fontSize: 14, color: '#aeaeb2' }}>{r.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ROOT ─────────────────────────────────────────────────────
export default function Home() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const nombre = profile?.nombre_completo ?? ''
  const partes = nombre.split(' ')
  const initials = partes.length >= 2
    ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
    : (partes[0]?.[0] ?? '?').toUpperCase()
  const props = { profile, initials, signOut, navigate }
  return isMobile ? <MobileHome {...props} /> : <DesktopHome {...props} />
}
