import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import logoCat from '../assets/logo-cat.png'
import logoBa from '../assets/logo-ba-ciudad.svg'

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '')

function fmtHora(h) { return h ? String(h).slice(0, 5) : '' }
function fmtFecha(f) {
  if (!f) return null
  return new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function LogosHeader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 18, marginBottom: 22, flexWrap: 'wrap',
    }}>
      <img src={logoCat} alt="Cuerpo de Agentes de Tránsito"
        style={{ height: 52, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
      <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.22)', borderRadius: 1 }} />
      <img src={logoBa} alt="Buenos Aires Ciudad"
        style={{ height: 30, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
    </div>
  )
}

function InstitutionalFooter() {
  return (
    <div style={{ marginTop: 28, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, padding: '0 12px' }}>
      <div style={{ fontWeight: 600, letterSpacing: '0.04em' }}>Dirección General · Cuerpo de Agentes de Tránsito · GCBA</div>
      <div style={{ marginTop: 3, opacity: 0.8 }}>Postulación segura mediante enlace único · No requiere usuario</div>
    </div>
  )
}

export default function PostularPage() {
  const { token } = useParams()
  const [info, setInfo] = useState(null)
  const [estado, setEstado] = useState('cargando') // cargando | formulario | enviando | exito | error | inactiva
  const [errorMsg, setErrorMsg] = useState('')
  const [exitoNombre, setExitoNombre] = useState('')

  const [cuit, setCuit] = useState('')
  const [rol, setRol] = useState('')
  const [turnosSeleccionados, setTurnosSeleccionados] = useState([])
  const [todosLosTurnos, setTodosLosTurnos] = useState(false)

  useEffect(() => {
    fetch(API + '/api/postular/' + token)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setEstado('inactiva'); setErrorMsg(d.error); return }
        setInfo(d)
        setEstado('formulario')
      })
      .catch(() => { setEstado('error'); setErrorMsg('No se pudo cargar la convocatoria') })
  }, [token])

  function toggleTurno(id) {
    setTurnosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  async function enviar(e) {
    e.preventDefault()
    if (!cuit.trim()) return setErrorMsg('Ingresá tu CUIT')
    if (!/^\d{11}$/.test(cuit.trim())) return setErrorMsg('El CUIT debe tener 11 dígitos sin guiones')
    if (!rol) return setErrorMsg('Seleccioná un rol')
    if (!todosLosTurnos && turnosSeleccionados.length === 0) return setErrorMsg('Seleccioná al menos un turno')
    setErrorMsg('')
    setEstado('enviando')
    try {
      const r = await fetch(API + '/api/postular/' + token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit: cuit.trim(), rol_solicitado: rol, turno_ids: turnosSeleccionados, todos_los_turnos: todosLosTurnos }),
      })
      const d = await r.json()
      if (!r.ok) { setEstado('formulario'); setErrorMsg(d.error || 'Error al enviar'); return }
      setExitoNombre(d.nombre_completo)
      setEstado('exito')
    } catch { setEstado('formulario'); setErrorMsg('Error de conexión') }
  }

  const INP = { width: '100%', padding: '14px 14px', borderRadius: 12, border: '1.5px solid #e5e5ea', background: '#f9f9fb', fontSize: 16, color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }
  const LBL = { fontSize: 12, fontWeight: 700, color: '#636366', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1a2744 0%, #243561 55%, #f5f5f7 55%)', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '36px 16px 48px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', flex: 1 }}>

        <LogosHeader />

        {/* Título institucional (sutil, fuera de la card) */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
            {estado === 'exito' ? 'Postulación confirmada' : 'Convocatoria'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', marginTop: 4 }}>
            {estado === 'cargando' ? 'Cargando...' : (info?.servicio_nombre || 'Servicio Adicional')}
          </div>
          {info?.base_nombre && estado !== 'cargando' && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{info.base_nombre}</div>
          )}
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 10px 50px rgba(26,39,68,0.22)', overflow: 'hidden' }}>

          {estado === 'cargando' && (
            <div style={{ padding: '56px 32px', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '3px solid #e5e5ea', borderTopColor: '#1a2744',
                margin: '0 auto 16px', animation: 'spin 0.8s linear infinite',
              }} />
              Cargando convocatoria...
            </div>
          )}

          {(estado === 'inactiva' || estado === 'error') && (
            <div style={{ padding: '52px 32px', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#FCEBEB',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A32D2D" strokeWidth="2.2">
                  <rect x="4" y="11" width="16" height="10" rx="2"/>
                  <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
                </svg>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1d1d1f', marginBottom: 8, letterSpacing: '-0.2px' }}>Convocatoria no disponible</div>
              <div style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>{errorMsg}</div>
            </div>
          )}

          {estado === 'exito' && (
            <div style={{ padding: '52px 32px', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#E8F5E9',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#1a2744', marginBottom: 10, letterSpacing: '-0.3px' }}>¡Postulación enviada!</div>
              <div style={{ fontSize: 14, color: '#636366', marginBottom: 6 }}>Hola, <strong style={{ color: '#1d1d1f' }}>{exitoNombre}</strong></div>
              <div style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
                Tu postulación fue registrada correctamente.<br/>El operador la revisará próximamente.
              </div>
            </div>
          )}

          {(estado === 'formulario' || estado === 'enviando') && info && (
            <form onSubmit={enviar}>
              {/* Banner del servicio */}
              <div style={{ background: 'linear-gradient(135deg, #1a2744, #243561)', padding: '22px 24px' }}>
                <div style={{ display: 'inline-block', background: 'rgba(245,200,0,0.15)', border: '1px solid rgba(245,200,0,0.35)', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#f5c800', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Formulario de postulación</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>{info.servicio_nombre}</div>
                {info.vence_en && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
                    </svg>
                    Cierra el {new Date(info.vence_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* CUIT */}
                <div>
                  <label style={LBL}>Tu CUIT</label>
                  <input
                    value={cuit}
                    onChange={e => setCuit(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="Ej: 20123456789"
                    inputMode="numeric"
                    maxLength={11}
                    autoComplete="off"
                    style={INP}
                    onFocus={e => e.target.style.borderColor = '#1a2744'}
                    onBlur={e => e.target.style.borderColor = '#e5e5ea'}
                  />
                </div>

                {/* Rol */}
                <div>
                  <label style={LBL}>Rol con el que te postulás</label>
                  <select value={rol} onChange={e => setRol(e.target.value)}
                    style={{ ...INP, color: rol ? '#1d1d1f' : '#aeaeb2', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 viewBox=%270 0 12 8%27 fill=%27none%27 stroke=%27%23636366%27 stroke-width=%272%27%3E%3Cpolyline points=%271 1 6 6 11 1%27/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}>
                    <option value="">Seleccioná un rol...</option>
                    {info.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                {/* Turnos */}
                {info.turnos.length > 0 && (
                  <div>
                    <label style={LBL}>Turnos disponibles</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                      {/* Todos los turnos */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 12, border: `1.5px solid ${todosLosTurnos ? '#1a2744' : '#e5e5ea'}`, background: todosLosTurnos ? '#f0f4ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${todosLosTurnos ? '#1a2744' : '#c7c7cc'}`, background: todosLosTurnos ? '#1a2744' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                          {todosLosTurnos && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>Disponible para todos los turnos</div>
                          <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1 }}>Me postulo sin preferencia de horario</div>
                        </div>
                        <input type="checkbox" checked={todosLosTurnos} onChange={e => { setTodosLosTurnos(e.target.checked); setTurnosSeleccionados([]) }} style={{ display: 'none' }} />
                      </label>

                      {!todosLosTurnos && info.turnos.map(t => {
                        const sel = turnosSeleccionados.includes(t.id)
                        const horaStr = t.hora_inicio ? fmtHora(t.hora_inicio) + ' – ' + fmtHora(t.hora_fin) + ' hs' : null
                        const fechaStr = fmtFecha(t.fecha)
                        return (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 12, border: `1.5px solid ${sel ? '#1a2744' : '#e5e5ea'}`, background: sel ? '#f0f4ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${sel ? '#1a2744' : '#c7c7cc'}`, background: sel ? '#1a2744' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                              {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{t.nombre || ('Turno ' + (info.turnos.indexOf(t) + 1))}</div>
                              {(fechaStr || horaStr) && <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>{[fechaStr, horaStr].filter(Boolean).join(' · ')}</div>}
                            </div>
                            <input type="checkbox" checked={sel} onChange={() => toggleTurno(t.id)} style={{ display: 'none' }} />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div style={{ background: '#FCEBEB', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#A32D2D', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {errorMsg}
                  </div>
                )}

                <button type="submit" disabled={estado === 'enviando'}
                  style={{ width: '100%', minHeight: 50, padding: '14px 16px', borderRadius: 14, border: 'none', background: estado === 'enviando' ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 15, fontWeight: 700, cursor: estado === 'enviando' ? 'not-allowed' : 'pointer', transition: 'background 0.15s', letterSpacing: '0.01em' }}>
                  {estado === 'enviando' ? 'Enviando...' : 'Confirmar postulación'}
                </button>

                <div style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'center', lineHeight: 1.55 }}>
                  Usá tu CUIT (11 dígitos, sin guiones). Solo podés postularte una vez por servicio.
                </div>
              </div>
            </form>
          )}
        </div>

        <InstitutionalFooter />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 420px) {
          input, select, button { font-size: 16px !important; }
        }
      `}</style>
    </div>
  )
}
