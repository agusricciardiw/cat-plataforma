/**
 * ModalPerfil.jsx
 * Tarjeta de perfil con diseño visual (no planilla).
 * Mobile: full-screen sheet · Desktop: modal centrado.
 *
 * Props:
 *   perfil   — objeto con los datos del profile
 *   onClose  — callback para cerrar
 *   titulo   — (opcional) override del encabezado, default "Mi perfil"
 */
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const ROLE_LABEL = {
  gerencia: 'Gerencia', director: 'Director', jefe_base: 'Jefe de Base',
  jefe_cgm: 'Jefe CGM', coordinador: 'Coordinador', coordinador_cgm: 'Coordinador CGM',
  supervisor: 'Supervisor', agente: 'Agente', admin: 'Administrador', planeamiento: 'Planeamiento',
  operador_adicionales: 'Op. Adicionales',
}

const ROLE_GRADIENT = {
  gerencia:             ['#1a2744', '#243561'],
  director:             ['#1a2744', '#243561'],
  jefe_base:            ['#185fa5', '#2575c0'],
  jefe_cgm:             ['#185fa5', '#2575c0'],
  coordinador:          ['#0f6e56', '#138a6c'],
  coordinador_cgm:      ['#0f6e56', '#138a6c'],
  supervisor:           ['#534ab7', '#6b62cc'],
  agente:               ['#374151', '#4b5563'],
  admin:                ['#52525b', '#71717a'],
  planeamiento:         ['#854f0b', '#a96512'],
  operador_adicionales: ['#6b4fa0', '#856bb8'],
}

const ESTADO_TURNO = {
  libre:       { label: 'Libre',        dot: '#0f6e56' },
  en_mision:   { label: 'En misión',    dot: '#185fa5' },
  fuera_turno: { label: 'Fuera turno',  dot: '#aeaeb2' },
}

// ── Helpers ──────────────────────────────────────────────────
function getInitials(nombre) {
  const p = (nombre ?? '').trim().split(' ').filter(Boolean)
  return p.length >= 2 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : (p[0]?.[0] ?? '?').toUpperCase()
}
function formatFecha(val) {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d)) return val
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return val }
}
function formatHora(val) {
  if (!val) return null
  return String(val).slice(0, 5)
}

// ── Iconos ───────────────────────────────────────────────────
const Ico = {
  badge: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 18a5 5 0 0110 0"/></svg>,
  base:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V8l9-6 9 6v13"/><path d="M9 21V12h6v9"/></svg>,
  cargo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  contacto: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z"/></svg>,
  persona: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  close: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
}

// ── Bloques ──────────────────────────────────────────────────
function Card({ icon, titulo, children, accent }) {
  const tieneContenido = Array.isArray(children) ? children.some(Boolean) : Boolean(children)
  if (!tieneContenido) return null
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px 4px' }}>
        <span style={{ display: 'flex', color: accent ?? '#1a2744', opacity: 0.85 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#6b7280', textTransform: 'uppercase' }}>{titulo}</span>
      </div>
      <div style={{ padding: '4px 16px 14px' }}>{children}</div>
    </div>
  )
}

function Dato({ label, valor, mono = false, full = false }) {
  if (!valor) return null
  return (
    <div style={{ flex: full ? '1 0 100%' : '1 1 calc(50% - 6px)', minWidth: full ? '100%' : 'calc(50% - 6px)', padding: '8px 0' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{
        fontSize: 14, fontWeight: 600, color: '#1a2744', lineHeight: 1.4,
        fontFamily: mono ? 'ui-monospace, "SF Mono", monospace' : undefined,
        letterSpacing: mono ? '0.02em' : undefined,
        wordBreak: 'break-word',
      }}>{valor}</div>
    </div>
  )
}

function FilaDatos({ children }) {
  const hijos = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean)
  if (!hijos.length) return null
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{hijos}</div>
}

// ── Componente principal ─────────────────────────────────────
export default function ModalPerfil({ perfil, onClose, titulo }) {
  const { profile: currentUser, signOut } = useAuth()
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Cerrar con Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // Bloquear scroll body mientras está abierto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (!perfil) return null

  const grad        = ROLE_GRADIENT[perfil.role] ?? ['#1a2744', '#243561']
  const roleLabel   = ROLE_LABEL[perfil.role] ?? perfil.role
  const estado      = ESTADO_TURNO[perfil.estado_turno] ?? null
  const esPropio    = currentUser?.id === perfil.id
  const tituloPanel = titulo ?? (esPropio ? 'Mi perfil' : 'Perfil del agente')

  const horaEntrada = formatHora(perfil.hora_entrada)
  const horaSalida  = formatHora(perfil.hora_salida)
  const horario     = horaEntrada && horaSalida ? `${horaEntrada} – ${horaSalida}` : horaEntrada || horaSalida || null

  const hero = (
    <div style={{
      background: `linear-gradient(135deg, ${grad[0]} 0%, ${grad[1]} 100%)`,
      padding: isMobile ? '20px 22px 28px' : '22px 26px 26px',
      position: 'relative', flexShrink: 0,
      paddingTop: isMobile ? 'max(20px, env(safe-area-inset-top, 20px))' : 22,
      borderRadius: isMobile ? 0 : '20px 20px 0 0',
    }}>
      {/* Decoración */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}/>
      <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }}/>

      {/* Eyebrow + close */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginBottom: 18 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {tituloPanel}
        </span>
        <button onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 9, cursor: 'pointer', color: '#fff', padding: '6px 9px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >
          {Ico.close}
        </button>
      </div>

      {/* Avatar grande + nombre */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', textAlign: 'center' }}>
        <div style={{
          width: isMobile ? 96 : 86, height: isMobile ? 96 : 86, borderRadius: '50%',
          background: '#fff', boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isMobile ? 30 : 28, fontWeight: 800, color: grad[0],
          marginBottom: 14, border: '4px solid rgba(255,255,255,0.18)',
        }}>
          {getInitials(perfil.nombre_completo)}
        </div>
        <div style={{ fontSize: isMobile ? 20 : 19, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2, marginBottom: 6, maxWidth: 280 }}>
          {perfil.nombre_completo ?? '—'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20,
            background: 'rgba(255,255,255,0.18)', color: '#fff',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            border: '0.5px solid rgba(255,255,255,0.22)',
          }}>
            {roleLabel}
          </span>
          {estado && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20,
              background: 'rgba(255,255,255,0.95)', color: '#1a2744',
              letterSpacing: '0.02em',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: estado.dot, boxShadow: `0 0 0 2px ${estado.dot}33` }}/>
              {estado.label}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  const body = (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 24px', background: '#f3f4f7' }}>
      <Card icon={Ico.badge} titulo="Identificación">
        <FilaDatos>
          <Dato label="Legajo" valor={perfil.legajo ? `CAT · ${perfil.legajo}` : null} />
          <Dato label="CUIT" valor={perfil.cuit} mono />
        </FilaDatos>
        <FilaDatos>
          <Dato label="Email" valor={perfil.email} full />
        </FilaDatos>
      </Card>

      <Card icon={Ico.base} titulo="Base y turno">
        <FilaDatos>
          <Dato label="Base" valor={perfil.base_nombre} />
          <Dato label="Turno" valor={perfil.turno} />
        </FilaDatos>
        <FilaDatos>
          <Dato label="Horario" valor={horario} mono />
        </FilaDatos>
      </Card>

      <Card icon={Ico.cargo} titulo="Cargo y función">
        <FilaDatos>
          <Dato label="Cargo" valor={perfil.cargo} />
          <Dato label="Tipo de contrato" valor={perfil.tipo_contrato} />
        </FilaDatos>
        <FilaDatos>
          <Dato label="Función" valor={perfil.funcion} full />
        </FilaDatos>
        <FilaDatos>
          <Dato label="Función específica" valor={perfil.funcion_especifica} full />
        </FilaDatos>
      </Card>

      <Card icon={Ico.contacto} titulo="Contacto">
        <FilaDatos>
          <Dato label="Teléfono" valor={perfil.telefono} mono />
          <Dato label="Teléfono HT" valor={perfil.telefono_ht} mono />
        </FilaDatos>
      </Card>

      <Card icon={Ico.persona} titulo="Datos personales">
        <FilaDatos>
          <Dato label="Fecha de nacimiento" valor={formatFecha(perfil.fecha_nacimiento)} full />
        </FilaDatos>
      </Card>

      {esPropio && (
        <button
          onClick={() => { onClose(); signOut() }}
          style={{
            width: '100%', marginTop: 8, padding: '14px',
            borderRadius: 12, border: '0.5px solid #fecaca',
            background: '#fff', color: '#dc2626',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          {Ico.logout}
          Cerrar sesión
        </button>
      )}
    </div>
  )

  // ── Mobile: full-screen sheet ──
  if (isMobile) {
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, animation: 'fadeIn 0.2s' }}/>
        <div style={{
          position: 'fixed', inset: 0, zIndex: 401,
          background: '#f3f4f7', display: 'flex', flexDirection: 'column',
          animation: 'slideUpFull 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {hero}
          {body}
        </div>
        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideUpFull { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        `}</style>
      </>
    )
  }

  // ── Desktop: modal centrado ──
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
        zIndex: 400, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.18s ease',
      }}/>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(480px, calc(100vw - 40px))', maxHeight: 'min(720px, calc(100vh - 60px))',
        background: '#f3f4f7', borderRadius: 20, zIndex: 401,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(15,23,42,0.4)',
        animation: 'modalIn 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {hero}
        {body}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn { from { transform: translate(-50%, -50%) scale(0.96); opacity: 0 } to { transform: translate(-50%, -50%) scale(1); opacity: 1 } }
      `}</style>
    </>
  )
}
