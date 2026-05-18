import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import AppShell from '../components/AppShell'
import MapaModal from '../components/MapaModal'

const ROLE_LABELS = {
  gerencia: 'Gerencia operativa', jefe_base: 'Jefe de base', jefe_cgm: 'Jefe CGM',
  coordinador: 'Coordinador de turno', coordinador_cgm: 'Coordinador CGM',
  supervisor: 'Supervisor', agente: 'Agente de transito', admin: 'Administrador',
  director: 'Director', planeamiento: 'Planeamiento', operador_adicionales: 'Operador adicionales',
}

const TIPO_EVENTO = {
  mision_creada:       { label: 'Nueva mision',    color: '#185fa5', bg: '#e8f0fe',  icon: '📋' },
  mision_asignada:     { label: 'Asignada',         color: '#854f0b', bg: '#faeeda',  icon: '👤' },
  mision_aceptada:     { label: 'Aceptada',         color: '#0f6e56', bg: '#e8faf2',  icon: '✓'  },
  mision_interrumpida: { label: 'Interrumpida',     color: '#854f0b', bg: '#faeeda',  icon: '⚠'  },
  mision_cerrada:      { label: 'Cerrada',          color: '#0f6e56', bg: '#e8faf2',  icon: '✓'  },
  servicio_generado:   { label: 'Nuevo servicio',   color: '#534ab7', bg: '#eeedf8',  icon: '⭐' },
}

function tiempoRelativo(fecha) {
  if (!fecha) return ''
  const diff = Math.floor((Date.now() - new Date(fecha)) / 60000)
  if (diff < 1)    return 'ahora'
  if (diff < 60)   return `hace ${diff} min`
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`
  return `hace ${Math.floor(diff / 1440)} d`
}

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

function getFecha() {
  return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getInitials(nombre) {
  const p = (nombre ?? '').trim().split(' ').filter(Boolean)
  return p.length >= 2 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : (p[0]?.[0] ?? '?').toUpperCase()
}

function getPrimerNombre(nombre) {
  return (nombre ?? '').trim().split(' ')[0] ?? ''
}

// ── Clima (Open-Meteo, sin API key) ──────────────────────────
// Códigos WMO agrupados en buckets para iconos
function clasificarClima(code) {
  if (code == null) return null
  if ([0,1].includes(code))             return { tipo: 'sol',     label: 'Despejado',     color: '#fbbf24' }
  if (code === 2)                       return { tipo: 'solnube', label: 'Algo nublado',  color: '#94a3b8' }
  if ([3,45,48].includes(code))         return { tipo: 'nube',    label: 'Nublado',       color: '#94a3b8' }
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))
    return { tipo: 'lluvia',  label: 'Lluvia',        color: '#60a5fa' }
  if ([71,73,75,77,85,86].includes(code))
    return { tipo: 'nieve',   label: 'Nieve',         color: '#e0e7ff' }
  if ([95,96,99].includes(code))        return { tipo: 'tormenta',label: 'Tormenta',      color: '#a78bfa' }
  return { tipo: 'nube', label: 'Tiempo variable', color: '#94a3b8' }
}

function IconoClima({ tipo, size = 22, color = '#fff' }) {
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }
  switch (tipo) {
    case 'sol': return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
        <circle cx="12" cy="12" r="4" fill={color} stroke="none"/>
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    )
    case 'solnube': return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
        <circle cx="8" cy="9" r="3" fill={color} stroke="none" opacity="0.9"/>
        <path d="M8 2v1M2 9h1M3 4l1 1M14 9c2.2 0 4 1.8 4 4s-1.8 4-4 4H8a3 3 0 010-6c.6 0 1.1.2 1.5.4" fill="none"/>
      </svg>
    )
    case 'nube': return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
        <path d="M7 18a5 5 0 010-10 6 6 0 0111.7 1.5A4 4 0 0118 18H7z" fill={color} fillOpacity="0.18"/>
      </svg>
    )
    case 'lluvia': return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
        <path d="M7 14a5 5 0 010-10 6 6 0 0111.7 1.5A4 4 0 0118 14H7z" fill={color} fillOpacity="0.18"/>
        <line x1="8"  y1="18" x2="7"  y2="22"/>
        <line x1="13" y1="18" x2="12" y2="22"/>
        <line x1="17" y1="18" x2="16" y2="22"/>
      </svg>
    )
    case 'nieve': return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
        <path d="M7 14a5 5 0 010-10 6 6 0 0111.7 1.5A4 4 0 0118 14H7z" fill={color} fillOpacity="0.18"/>
        <circle cx="8"  cy="20" r="1" fill={color}/>
        <circle cx="13" cy="20" r="1" fill={color}/>
        <circle cx="17" cy="20" r="1" fill={color}/>
      </svg>
    )
    case 'tormenta': return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
        <path d="M7 13a5 5 0 010-10 6 6 0 0111.7 1.5A4 4 0 0118 13H7z" fill={color} fillOpacity="0.18"/>
        <polyline points="12 13 9 19 13 19 11 23" stroke={color}/>
      </svg>
    )
    default: return null
  }
}

function useClima() {
  const [clima, setClima] = useState(null)
  useEffect(() => {
    let alive = true
    function fetchClima() {
      fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.6&longitude=-58.4&current=temperature_2m,weather_code&timezone=America%2FArgentina%2FBuenos_Aires')
        .then(r => r.json())
        .then(d => { if (alive) setClima({ temp: Math.round(d.current?.temperature_2m), code: d.current?.weather_code }) })
        .catch(() => {})
    }
    fetchClima()
    const t = setInterval(fetchClima, 15 * 60 * 1000) // refresh cada 15 min
    return () => { alive = false; clearInterval(t) }
  }, [])
  return clima
}

// ── Feed de notificaciones ────────────────────────────────────
function FeedNotificaciones({ actividad, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '0.5px solid #e5e5ea', opacity: 0.5 }}>
            <div style={{ height: 12, background: '#f5f5f7', borderRadius: 6, width: '60%', marginBottom: 8 }}/>
            <div style={{ height: 10, background: '#f5f5f7', borderRadius: 6, width: '40%' }}/>
          </div>
        ))}
      </div>
    )
  }

  if (actividad.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744', marginBottom: 6 }}>Sin actividad reciente</div>
        <div style={{ fontSize: 13, color: '#aeaeb2' }}>Las notificaciones del sistema aparecerán aquí</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {actividad.map((a, i) => {
        const tipo = TIPO_EVENTO[a.tipo] ?? { label: a.tipo, color: '#636366', bg: '#f5f5f7', icon: '·' }
        return (
          <div key={a.id || i}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px', background: '#fff', borderBottom: i < actividad.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            {/* Ícono tipo */}
            <div style={{ width: 34, height: 34, borderRadius: 10, background: tipo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 1 }}>
              {tipo.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.descripcion}
                </span>
                <span style={{ fontSize: 11, color: '#aeaeb2', flexShrink: 0 }}>{tiempoRelativo(a.created_at)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 6, background: tipo.bg, color: tipo.color }}>
                  {tipo.label}
                </span>
                {a.nombre_completo && (
                  <span style={{ fontSize: 11, color: '#8e8e93' }}>{a.nombre_completo}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tarjeta de modulo ─────────────────────────────────────────
function TarjetaModulo({ label, sub, path, iconBg, icon, navigate }) {
  return (
    <div onClick={() => navigate(path)}
      style={{ background: '#fff', borderRadius: 14, padding: 20, border: '0.5px solid #dde2ec', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s', boxShadow: '0 1px 4px rgba(26,39,68,0.06)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,39,68,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(26,39,68,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', marginBottom: 3, letterSpacing: '-0.2px' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#8e8e93' }}>{sub}</div>
    </div>
  )
}

const ROLES_OS = ['gerencia', 'admin', 'jefe_base', 'director', 'planeamiento', 'jefe_cgm', 'coordinador_cgm']

function getModulos(rol) {
  const todos = [
    { id: 'misiones', label: 'Misiones', path: '/misiones', sub: rol === 'agente' ? 'Mis misiones del turno' : 'Operaciones del dia', iconBg: '#e8f0fe',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
    { id: 'os', label: 'Ordenes de servicio', path: '/os', sub: 'Planificacion semanal', iconBg: '#e4eaf5', soloRoles: ROLES_OS,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a2744" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { id: 'sa', label: 'Serv. adicionales', path: '/servicios-adicionales', sub: 'Gestion y convocatoria', iconBg: '#fef9e7', soloRoles: ['admin','operador_adicionales','gerencia','director','jefe_cgm'],
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#854f0b" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
    { id: 'equipo', label: 'Mi equipo', path: '/equipo', sub: 'Organigrama de la base', iconBg: '#eeedf8', soloRoles: ['gerencia','admin','jefe_base','jefe_cgm','director','coordinador','coordinador_cgm','supervisor'],
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#534ab7" strokeWidth="2"><circle cx="12" cy="8" r="3"/><path d="M6 20v-2a6 6 0 0112 0v2"/><circle cx="4" cy="14" r="2"/><path d="M2 20v-1a4 4 0 014-4"/><circle cx="20" cy="14" r="2"/><path d="M22 20v-1a4 4 0 00-4-4"/></svg> },
  ]
  return todos.filter(m => !m.soloRoles || m.soloRoles.includes(rol))
}

// ── Componente principal ──────────────────────────────────────
export default function Home() {
  const { profile, tienePermiso } = useAuth()
  const navigate    = useNavigate()
  const rol         = profile?.role ?? 'agente'

  const [actividad, setActividad] = useState([])
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [time, setTime] = useState(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }))
  const [showMapa, setShowMapa] = useState(false)
  const clima  = useClima()
  const climaInfo = clima ? clasificarClima(clima.code) : null

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!profile || rol === 'agente') { setLoadingFeed(false); return }
    api.get('/api/actividad?limite=20')
      .then(data => setActividad(data ?? []))
      .catch(() => {})
      .finally(() => setLoadingFeed(false))
  }, [profile?.id])

  const modulos = getModulos(rol)

  return (
    <AppShell titulo="Inicio">
      {showMapa && <MapaModal onClose={() => setShowMapa(false)} />}
      <div className="sigat-home-wrap" style={{ flex: 1, overflow: 'auto', padding: '28px 40px', display: 'flex', gap: 28, minHeight: 0, alignItems: 'flex-start' }}>

        {/* Columna izquierda */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Saludo */}
          <div className="sigat-home-saludo sigat-home-saludo-anim" style={{
            background: 'linear-gradient(135deg, #0a1428 0%, #0f1d38 25%, #1a2744 50%, #243561 75%, #1a2744 100%)',
            backgroundSize: '300% 300%',
            borderRadius: 20, padding: '26px 28px', color: '#fff',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(15,29,56,0.22)',
          }}>
            {/* Grid pattern overlay (tech vibe) */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
              backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 80%)',
            }}/>

            {/* Scan beam superior */}
            <div className="sigat-home-scan" style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent 0%, rgba(245,200,0,0.9) 50%, transparent 100%)',
              pointerEvents: 'none',
              boxShadow: '0 0 8px rgba(245,200,0,0.4)',
            }}/>

            {/* Decoración (orbs flotantes) */}
            <div className="sigat-home-orb1" style={{ position: 'absolute', top: -40, right: -20, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,200,0,0.22) 0%, transparent 65%)', pointerEvents: 'none' }}/>
            <div className="sigat-home-orb2" style={{ position: 'absolute', bottom: -40, right: 140, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,205,196,0.20) 0%, transparent 65%)', pointerEvents: 'none' }}/>
            <div className="sigat-home-orb3" style={{ position: 'absolute', top: 30, left: -20, width: 110, height: 110, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 65%)', pointerEvents: 'none' }}/>

            {/* Barra amarilla lateral */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: 'linear-gradient(180deg, #f5c800 0%, #f5c800 30%, transparent 100%)', pointerEvents: 'none' }}/>

            {/* Fila 1: eyebrow + hora + clima */}
            <div className="sigat-home-row1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, position: 'relative' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="sigat-home-livedot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#f5c800', boxShadow: '0 0 0 3px rgba(245,200,0,0.2)' }}/>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    {getGreeting()}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textTransform: 'capitalize' }}>{getFecha()}</div>
              </div>

              <div className="sigat-home-tiles" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <div className="sigat-home-clock" style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: '8px 14px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  minWidth: 78, flexShrink: 0, backdropFilter: 'blur(8px)',
                }}>
                  <span className="sigat-home-time" style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{time}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(245,200,0,0.7)', letterSpacing: '0.1em', marginTop: 3 }}>HORA</span>
                </div>

                {climaInfo && clima?.temp != null && (
                  <div className="sigat-home-weather" style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    borderRadius: 12, padding: '8px 12px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    minWidth: 78, flexShrink: 0, backdropFilter: 'blur(8px)',
                  }}
                  title={climaInfo.label}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <IconoClima tipo={climaInfo.tipo} color={climaInfo.color} size={18}/>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{clima.temp}°</span>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(78,205,196,0.7)', letterSpacing: '0.1em', marginTop: 3 }}>CABA</span>
                  </div>
                )}

                {tienePermiso?.('VER_MISIONES') && (
                  <button
                    onClick={() => setShowMapa(true)}
                    className="sigat-home-mapa-btn"
                    title="Abrir mapa operativo"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '0.5px solid rgba(255,255,255,0.12)',
                      borderRadius: 12, padding: '8px 12px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      minWidth: 78, flexShrink: 0, backdropFilter: 'blur(8px)', cursor: 'pointer',
                      transition: 'all 0.18s', position: 'relative', overflow: 'hidden',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,200,0,0.14)'; e.currentTarget.style.borderColor = 'rgba(245,200,0,0.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  >
                    {/* Mini "mapa" decorativo: grid + pin */}
                    <div style={{ position: 'relative', height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="34" height="22" viewBox="0 0 34 22" fill="none">
                        {/* Grid */}
                        <path d="M0 6 L34 4" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8"/>
                        <path d="M0 12 L34 14" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8"/>
                        <path d="M0 18 L34 16" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8"/>
                        <path d="M10 0 L8 22"  stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
                        <path d="M22 0 L24 22" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
                        {/* Pin central */}
                        <circle cx="17" cy="11" r="4" fill="#f5c800"/>
                        <circle cx="17" cy="11" r="6" fill="none" stroke="#f5c800" strokeOpacity="0.4" strokeWidth="1"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(245,200,0,0.85)', letterSpacing: '0.1em', marginTop: 3 }}>MAPA</span>
                  </button>
                )}
              </div>
            </div>

            {/* Fila 2: avatar + nombre */}
            <div className="sigat-home-row2" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, position: 'relative' }}>
              <div className="sigat-home-avatar" style={{
                width: 48, height: 48, borderRadius: '50%', background: '#f5c800',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: '#0f1d38', flexShrink: 0,
                boxShadow: '0 4px 14px rgba(245,200,0,0.32)',
                border: '2px solid rgba(255,255,255,0.18)',
              }}>
                {getInitials(profile?.nombre_completo)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>
                  Hola, {getPrimerNombre(profile?.nombre_completo)}
                </div>
                <div className="sigat-home-name" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.7px', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.nombre_completo ?? '—'}
                </div>
              </div>
            </div>

            {/* Fila 3: chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', position: 'relative' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
                background: 'rgba(255,255,255,0.95)', color: '#1a2744',
                letterSpacing: '0.02em',
              }}>
                {ROLE_LABELS[rol] ?? rol}
              </span>
              {profile?.base_nombre && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 21V8l9-6 9 6v13"/></svg>
                  {profile.base_nombre}
                </span>
              )}
              {profile?.turno && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 20,
                  background: 'rgba(78,205,196,0.18)', color: '#4ecdc4',
                  border: '0.5px solid rgba(78,205,196,0.3)',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
                  Turno {profile.turno}
                </span>
              )}
            </div>
          </div>

          {/* Accesos */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Accesos rapidos</div>
            <div className="sigat-home-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {modulos.map(m => <TarjetaModulo key={m.id} {...m} navigate={navigate}/>)}
            </div>
          </div>

          {/* Datos de turno */}
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e5ea', padding: '18px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Mi turno</div>
            {[
              { label: 'Base',   val: profile?.base_nombre ?? '—' },
              { label: 'Rol',    val: ROLE_LABELS[rol] ?? rol },
              { label: 'Legajo', val: profile?.legajo ? `CAT · ${profile.legajo}` : '—' },
              ...(profile?.turno ? [{ label: 'Turno', val: profile.turno }] : []),
            ].map((r, i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f7' : 'none', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#aeaeb2', flexShrink: 0 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha: notificaciones */}
        {rol !== 'agente' && (
        <div className="sigat-home-feed-col" style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e5ea', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #f0f0f5', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', letterSpacing: '0.04em' }}>Actividad reciente</div>
        {actividad.length > 0 && (
        <span style={{ fontSize: 11, fontWeight: 700, background: '#1a2744', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>
            {actividad.length}
            </span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <FeedNotificaciones actividad={actividad} loading={loadingFeed}/>
          </div>
        </div>
        </div>
        )}
      </div>

      <style>{`
        /* ── Animaciones tech del saludo ───────────────────── */
        @keyframes sigatGradientShift {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes sigatLivePulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(245,200,0,0.2), 0 0 0 0 rgba(245,200,0,0.5); }
          50%      { box-shadow: 0 0 0 3px rgba(245,200,0,0.2), 0 0 0 8px rgba(245,200,0,0); }
        }
        @keyframes sigatOrbDrift1 {
          0%   { transform: translate(0, 0)      scale(1);    }
          33%  { transform: translate(-60px, 30px) scale(1.15); }
          66%  { transform: translate(-30px, -25px) scale(0.92); }
          100% { transform: translate(0, 0)      scale(1);    }
        }
        @keyframes sigatOrbDrift2 {
          0%   { transform: translate(0, 0)      scale(1);    }
          50%  { transform: translate(50px, -40px) scale(1.18); }
          100% { transform: translate(0, 0)      scale(1);    }
        }
        @keyframes sigatOrbDrift3 {
          0%   { transform: translate(0, 0)      scale(1);    }
          33%  { transform: translate(45px, 25px) scale(1.1);  }
          66%  { transform: translate(70px, -10px) scale(0.88); }
          100% { transform: translate(0, 0)      scale(1);    }
        }
        @keyframes sigatScanBeam {
          0%, 100% { opacity: 0.15; transform: translateX(-30%); }
          50%      { opacity: 0.9;  transform: translateX(30%);  }
        }
        @keyframes sigatCardEnter {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);     }
        }

        .sigat-home-saludo-anim {
          animation: sigatGradientShift 22s ease-in-out infinite, sigatCardEnter 0.45s cubic-bezier(0.4,0,0.2,1) both;
        }
        .sigat-home-livedot {
          animation: sigatLivePulse 2.4s ease-in-out infinite;
        }
        .sigat-home-orb1 { animation: sigatOrbDrift1 12s ease-in-out infinite; }
        .sigat-home-orb2 { animation: sigatOrbDrift2 16s ease-in-out infinite; }
        .sigat-home-orb3 { animation: sigatOrbDrift3 14s ease-in-out infinite; }
        .sigat-home-scan { animation: sigatScanBeam 6s ease-in-out infinite; }

        /* Respetar usuarios con prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .sigat-home-saludo-anim,
          .sigat-home-livedot,
          .sigat-home-orb1, .sigat-home-orb2, .sigat-home-orb3,
          .sigat-home-scan { animation: none !important; }
        }

        /* ── Responsive ─────────────────────────────────────── */
        @media (max-width: 768px) {
          .sigat-home-wrap     { flex-direction: column !important; padding: 20px 16px !important; gap: 20px !important; }
          .sigat-home-feed-col { display: none !important; }
          .sigat-home-mapa     { display: none !important; }
          .sigat-home-saludo   { padding: 22px 20px !important; border-radius: 18px !important; }
          .sigat-home-name     { font-size: 20px !important; }
          .sigat-home-grid     { grid-template-columns: repeat(2, 1fr) !important; }
          .sigat-home-avatar   { width: 44px !important; height: 44px !important; font-size: 15px !important; }
          .sigat-home-clock,
          .sigat-home-weather  { padding: 7px 12px !important; min-width: 70px !important; }
          .sigat-home-time     { font-size: 20px !important; }
        }
        @media (max-width: 420px) {
          .sigat-home-name     { font-size: 18px !important; }
          .sigat-home-time     { font-size: 18px !important; }
          .sigat-home-grid     { gap: 10px !important; }
          .sigat-home-clock,
          .sigat-home-weather  { min-width: 64px !important; padding: 6px 10px !important; }
          .sigat-home-tiles    { gap: 6px !important; }
        }
      `}</style>
    </AppShell>
  )
}
