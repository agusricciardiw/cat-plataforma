/**
 * ModalPerfil.jsx
 * Panel lateral deslizable con el perfil completo de una persona.
 * Usado en: AppShell (perfil propio), MiEquipo (miembro del equipo).
 *
 * Props:
 *   perfil   — objeto con los datos del profile (puede ser del AuthContext o de la API)
 *   onClose  — callback para cerrar el panel
 *   titulo   — (opcional) override del encabezado, default "Mi perfil"
 */
import { useEffect } from 'react'

const ROLE_LABEL = {
  gerencia: 'Gerencia', director: 'Director', jefe_base: 'Jefe de Base',
  jefe_cgm: 'Jefe CGM', coordinador: 'Coordinador', coordinador_cgm: 'Coordinador CGM',
  supervisor: 'Supervisor', agente: 'Agente', admin: 'Administrador', planeamiento: 'Planeamiento',
  operador_adicionales: 'Op. Adicionales',
}

const ROLE_COLOR = {
  gerencia:             '#1a2744',
  director:             '#1a2744',
  jefe_base:            '#185fa5',
  jefe_cgm:             '#185fa5',
  coordinador:          '#0f6e56',
  coordinador_cgm:      '#0f6e56',
  supervisor:           '#534ab7',
  agente:               '#374151',
  admin:                '#636366',
  planeamiento:         '#854f0b',
  operador_adicionales: '#6b4fa0',
}

const ESTADO_TURNO = {
  libre:       { label: 'Libre',        bg: '#e8faf2', color: '#0f6e56' },
  en_mision:   { label: 'En misión',    bg: '#e8f0fe', color: '#185fa5' },
  fuera_turno: { label: 'Fuera turno',  bg: '#f5f5f7', color: '#aeaeb2' },
}

function getInitials(nombre) {
  const p = (nombre ?? '').trim().split(' ').filter(Boolean)
  return p.length >= 2 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : (p[0]?.[0] ?? '?').toUpperCase()
}

function formatFecha(val) {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d)) return val
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return val }
}

function formatHora(val) {
  if (!val) return null
  // '08:00:00' → '08:00'
  return String(val).slice(0, 5)
}

function Fila({ label, valor, mono = false }) {
  if (!valor) return null
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '10px 0', borderBottom: '0.5px solid #f0f2f7', gap: 12,
    }}>
      <span style={{ fontSize: 12, color: '#aeaeb2', fontWeight: 500, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 600, color: '#1a2744', textAlign: 'right',
        fontFamily: mono ? 'ui-monospace, monospace' : undefined,
        letterSpacing: mono ? '0.04em' : undefined,
        maxWidth: 180, wordBreak: 'break-word',
      }}>{valor}</span>
    </div>
  )
}

function Seccion({ titulo, children }) {
  const tieneContenido = Array.isArray(children)
    ? children.some(Boolean)
    : Boolean(children)
  if (!tieneContenido) return null

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#aeaeb2', textTransform: 'uppercase', padding: '14px 0 2px' }}>
        {titulo}
      </div>
      {children}
    </div>
  )
}

export default function ModalPerfil({ perfil, onClose, titulo }) {
  // Cerrar con Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  if (!perfil) return null

  const headerColor  = ROLE_COLOR[perfil.role] ?? '#1a2744'
  const estado       = ESTADO_TURNO[perfil.estado_turno] ?? null
  const roleLabel    = ROLE_LABEL[perfil.role] ?? perfil.role
  const tituloPanel  = titulo ?? 'Mi perfil'

  const horaEntrada = formatHora(perfil.hora_entrada)
  const horaSalida  = formatHora(perfil.hora_salida)
  const horario     = horaEntrada && horaSalida ? `${horaEntrada} – ${horaSalida}` : horaEntrada || horaSalida || null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(26,39,68,0.35)',
          zIndex: 200, backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.18s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 320,
        background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 32px rgba(26,39,68,0.18)',
        animation: 'slideInRight 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Header con color de rol */}
        <div style={{ background: headerColor, padding: '24px 20px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {tituloPanel}
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', padding: '5px 8px', opacity: 0.75, transition: 'opacity 0.15s', display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.75'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: '#fff',
            }}>
              {getInitials(perfil.nombre_completo)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>
                {perfil.nombre_completo ?? '—'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {roleLabel}
                </span>
                {estado && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: estado.bg, color: estado.color,
                    letterSpacing: '0.04em',
                  }}>
                    {estado.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 24px' }}>

          <Seccion titulo="Identificación">
            <Fila label="Legajo"  valor={perfil.legajo ? `CAT · ${perfil.legajo}` : null} />
            <Fila label="CUIT"    valor={perfil.cuit}    mono />
            <Fila label="Email"   valor={perfil.email} />
          </Seccion>

          <Seccion titulo="Base y turno">
            <Fila label="Base"    valor={perfil.base_nombre} />
            <Fila label="Turno"   valor={perfil.turno} />
            <Fila label="Horario" valor={horario} />
          </Seccion>

          <Seccion titulo="Cargo y función">
            <Fila label="Cargo"              valor={perfil.cargo} />
            <Fila label="Función"            valor={perfil.funcion} />
            <Fila label="Función específica" valor={perfil.funcion_especifica} />
            <Fila label="Tipo de contrato"   valor={perfil.tipo_contrato} />
          </Seccion>

          <Seccion titulo="Datos personales">
            <Fila label="Fecha de nac." valor={formatFecha(perfil.fecha_nacimiento)} />
            <Fila label="Teléfono"      valor={perfil.telefono} mono />
            <Fila label="Teléfono HT"   valor={perfil.telefono_ht} mono />
          </Seccion>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0 } to { opacity: 1 }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%) } to { transform: translateX(0) }
        }
      `}</style>
    </>
  )
}
