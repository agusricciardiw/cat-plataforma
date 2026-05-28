/**
 * FacturacionPage.jsx — Panel RRHH para gestionar solicitudes de factura.
 */
import { useState, useEffect } from 'react'
import api from '../lib/api'
import AppShell from '../components/AppShell'
import { usePermisos } from '../hooks/usePermiso'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '')
const C = { navy: '#1a2744', border: '#e0e4ed', green: '#0f6e56', bg: '#eef1f6' }

function fmtFecha(f) {
  if (!f) return '—'
  return new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtMonto(n) {
  return Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
}

const ESTADOS_ITEM = {
  pendiente:   { label: 'Pendiente',    color: '#b45309', bg: '#fef3c7' },
  presentada:  { label: 'Presentada',   color: '#185fa5', bg: '#dbeafe' },
  aprobada:    { label: 'Aprobada',     color: '#0f6e56', bg: '#d1fae5' },
  rechazada:   { label: 'Rechazada',    color: '#b91c1c', bg: '#fee2e2' },
  subsanacion: { label: 'Subsanación',  color: '#7c3aed', bg: '#ede9fe' },
}

function Pill({ estado }) {
  const e = ESTADOS_ITEM[estado] || { label: estado, color: '#636366', bg: '#f0f2f6' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: e.color, background: e.bg }}>
      {e.label}
    </span>
  )
}

// ── Modal de detalle de solicitud ─────────────────────────────
function ModalDetalle({ solicitud_id, onClose, permisos }) {
  const [sol, setSol]         = useState(null)
  const [cargando, setCargando] = useState(true)
  const [accionItem, setAccionItem] = useState(null) // { item, tipo: 'aprobar'|'rechazar'|'subsanacion' }
  const [obsRRHH, setObsRRHH] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function cargar() {
    setCargando(true)
    api.get(`/api/facturacion/${solicitud_id}`)
      .then(d => { setSol(d); setCargando(false) })
      .catch(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [solicitud_id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function ejecutarAccion() {
    if (!accionItem) return
    const estadoMap = { aprobar: 'aprobada', rechazar: 'rechazada', subsanacion: 'subsanacion' }
    const estadoNuevo = estadoMap[accionItem.tipo]
    if ((accionItem.tipo === 'rechazar' || accionItem.tipo === 'subsanacion') && !obsRRHH.trim()) {
      setErrorMsg('Debés escribir una observación')
      return
    }
    setGuardando(true)
    setErrorMsg('')
    try {
      await api.patch(`/api/facturacion/items/${accionItem.item.id}`, {
        estado: estadoNuevo,
        observaciones_rrhh: obsRRHH.trim() || null,
      })
      setAccionItem(null)
      setObsRRHH('')
      cargar()
    } catch (e) {
      setErrorMsg(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1a2744,#243561)', padding: '20px 28px 18px', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Detalle de solicitud</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{sol?.concepto || 'Cargando...'}</div>
            {sol?.servicio_nombre && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{sol.servicio_nombre}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {cargando ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#8e8e93' }}>Cargando...</div>
        ) : sol ? (
          <div style={{ padding: '24px 28px 28px' }}>

            {/* Datos generales */}
            <div style={{ background: '#f5f5f7', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px' }}>
              {[
                ['Período', `${fmtFecha(sol.periodo_desde)} → ${fmtFecha(sol.periodo_hasta)}`],
                ['Vencimiento', fmtFecha(sol.fecha_vencimiento)],
                ['Generado por', sol.generado_por_nombre],
                ['Receptor', sol.razon_social_receptor],
                ['CUIT receptor', sol.cuit_receptor],
                ['Generado el', fmtFecha(sol.generado_at)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginTop: 2 }}>{v || '—'}</div>
                </div>
              ))}
            </div>

            {/* Tabla de items */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Agentes ({sol.items?.length || 0})
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {/* Cabecera */}
              <div style={{ background: '#f5f5f7', padding: '8px 16px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.5fr', gap: 8 }}>
                {['Agente', 'Módulos', 'Estado', 'Factura', 'Acciones'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                ))}
              </div>

              {sol.items?.map((item, i) => (
                <div key={item.id} style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.5fr', gap: 8, borderTop: i > 0 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{item.nombre_completo}</div>
                    <div style={{ fontSize: 11, color: '#8e8e93', fontFamily: 'monospace' }}>{item.cuil}</div>
                    {!item.mail_enviado_at && <div style={{ fontSize: 10, color: '#b45309', fontWeight: 600 }}>⚠ Mail no enviado</div>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{item.datos_enviados?.modulos || '—'}</div>
                  <div><Pill estado={item.estado} /></div>
                  <div>
                    {item.factura_numero ? (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{item.factura_numero}</div>
                        {item.factura_fecha && <div style={{ fontSize: 10, color: '#636366' }}>{fmtFecha(item.factura_fecha)}</div>}
                        {item.factura_archivo && (
                          <a href={`${API_URL}/uploads/${item.factura_archivo}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: '#185fa5', textDecoration: 'none', fontWeight: 600 }}>Ver PDF</a>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: '#aeaeb2', fontStyle: 'italic' }}>Sin presentar</span>
                    )}
                    {item.observaciones_rrhh && (
                      <div style={{ fontSize: 10, color: '#636366', marginTop: 3, fontStyle: 'italic' }}>Obs: {item.observaciones_rrhh}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {item.estado === 'presentada' && (permisos?.FACTURACION_APROBAR || permisos?.FACTURACION_RECHAZAR || permisos?.FACTURACION_SUBSANAR) && (
                      <>
                        {permisos?.FACTURACION_APROBAR && <button
                          onClick={() => { setAccionItem({ item, tipo: 'aprobar' }); setObsRRHH('') }}
                          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#d1fae5', color: C.green, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          ✓ Aprobar
                        </button>}
                        {permisos?.FACTURACION_SUBSANAR && <button
                          onClick={() => { setAccionItem({ item, tipo: 'subsanacion' }); setObsRRHH('') }}
                          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#ede9fe', color: '#7c3aed', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          Subsanar
                        </button>}
                        {permisos?.FACTURACION_RECHAZAR && <button
                          onClick={() => { setAccionItem({ item, tipo: 'rechazar' }); setObsRRHH('') }}
                          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#fee2e2', color: '#b91c1c', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          Rechazar
                        </button>}
                      </>
                    )}
                    {item.estado === 'aprobada' && (
                      <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>✓ Aprobada</span>
                    )}
                    {(item.estado === 'pendiente' || item.estado === 'rechazada') && (
                      <span style={{ fontSize: 11, color: '#aeaeb2' }}>—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Sub-modal de acción */}
            {accionItem && (
              <div style={{ marginTop: 20, background: accionItem.tipo === 'aprobar' ? '#f0fdf4' : accionItem.tipo === 'rechazar' ? '#fee2e2' : '#f5f3ff', border: `1.5px solid ${accionItem.tipo === 'aprobar' ? '#a7f3d0' : accionItem.tipo === 'rechazar' ? '#fca5a5' : '#c4b5fd'}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                  {accionItem.tipo === 'aprobar' && `Aprobar factura de ${accionItem.item.nombre_completo}`}
                  {accionItem.tipo === 'rechazar' && `Rechazar factura de ${accionItem.item.nombre_completo}`}
                  {accionItem.tipo === 'subsanacion' && `Solicitar subsanación a ${accionItem.item.nombre_completo}`}
                </div>
                {accionItem.tipo !== 'aprobar' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 5 }}>
                      Observación {accionItem.tipo === 'rechazar' ? '(motivo del rechazo)' : '(qué debe corregir)'}
                    </label>
                    <textarea
                      value={obsRRHH} onChange={e => setObsRRHH(e.target.value)}
                      rows={2} placeholder="Describí el problema..."
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #e0e4ed', background: '#fff', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                    />
                  </div>
                )}
                {errorMsg && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 10 }}>{errorMsg}</div>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setAccionItem(null); setErrorMsg('') }}
                    style={{ padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={ejecutarAccion} disabled={guardando}
                    style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: accionItem.tipo === 'aprobar' ? C.green : accionItem.tipo === 'rechazar' ? '#b91c1c' : '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                    {guardando ? 'Guardando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: 'center', color: '#8e8e93' }}>No se pudo cargar</div>
        )}
      </div>
    </div>
  )
}

// ── Modal de configuración SMTP ───────────────────────────────
function ModalConfigSMTP({ onClose }) {
  const [config, setConfig]     = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '' })
  const [passCargada, setPassCargada] = useState(false) // la pass ya estaba configurada
  const [guardando, setGuardando]   = useState(false)
  const [testando, setTestando]     = useState(false)
  const [testMsg, setTestMsg]       = useState(null) // { ok, texto }
  const [errorMsg, setErrorMsg]     = useState('')
  const [exito, setExito]           = useState(false)

  useEffect(() => {
    api.get('/api/config/smtp').then(d => {
      setConfig(prev => ({
        ...prev,
        smtp_host: d.smtp_host || 'smtp.office365.com',
        smtp_port: d.smtp_port || '587',
        smtp_user: d.smtp_user || '',
        smtp_from: d.smtp_from || '',
      }))
      setPassCargada(!!d.smtp_pass_set)
    }).catch(() => {})
  }, [])

  function set(k, v) { setConfig(prev => ({ ...prev, [k]: v })) }

  async function guardar() {
    if (!config.smtp_user.trim()) { setErrorMsg('El usuario/casilla es obligatorio'); return }
    setGuardando(true); setErrorMsg(''); setExito(false)
    try {
      const payload = {
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_user: config.smtp_user,
        smtp_from: config.smtp_from,
      }
      // Solo enviar la contraseña si el operador escribió una
      if (config.smtp_pass.trim()) payload.smtp_pass = config.smtp_pass
      await api.put('/api/config/smtp', payload)
      setExito(true)
      setConfig(prev => ({ ...prev, smtp_pass: '' }))
      setPassCargada(true)
    } catch (e) {
      setErrorMsg(e.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function testear() {
    setTestando(true); setTestMsg(null)
    try {
      const r = await api.post('/api/config/smtp/test', {})
      setTestMsg({ ok: true, texto: `Mail de prueba enviado a ${r.enviado_a}` })
    } catch (e) {
      setTestMsg({ ok: false, texto: e.message || 'Error al conectar con el servidor SMTP' })
    } finally {
      setTestando(false)
    }
  }

  const INP_S = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #e0e4ed', background: '#f9f9fb', fontSize: 13,
    color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1a2744,#243561)', padding: '20px 24px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Configuración del sistema</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c800" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14M12 2v2m0 16v2m10-10h-2M4 12H2"/></svg>
              Servidor de correo (SMTP)
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', width: 30, height: 30, borderRadius: 7, cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ background: '#f0f4ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
            Las credenciales se aplican inmediatamente sin reiniciar el servidor. Usá "Probar conexión" para verificar antes de guardar.
          </div>

          {/* Servidor y puerto */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Servidor SMTP</label>
              <input value={config.smtp_host} onChange={e => set('smtp_host', e.target.value)} style={INP_S}
                onFocus={e => e.target.style.borderColor = C.navy} onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Puerto</label>
              <input value={config.smtp_port} onChange={e => set('smtp_port', e.target.value)} style={INP_S}
                onFocus={e => e.target.style.borderColor = C.navy} onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
            </div>
          </div>

          {/* Usuario */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Casilla de correo (usuario)</label>
            <input value={config.smtp_user} onChange={e => set('smtp_user', e.target.value)}
              placeholder="cat-notificaciones@buenosaires.gob.ar" style={INP_S}
              onFocus={e => e.target.style.borderColor = C.navy} onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
          </div>

          {/* Contraseña */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
              Contraseña
              {passCargada && <span style={{ fontSize: 10, color: C.green, fontWeight: 600, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>✓ ya configurada</span>}
            </label>
            <input type="password" value={config.smtp_pass} onChange={e => set('smtp_pass', e.target.value)}
              placeholder={passCargada ? 'Dejá vacío para mantener la actual' : 'Ingresá la contraseña'}
              style={INP_S}
              onFocus={e => e.target.style.borderColor = C.navy} onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
            <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 4 }}>Las credenciales rotan cada 15 días. Actualizá solo este campo cuando cambie.</div>
          </div>

          {/* From */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Nombre del remitente (opcional)</label>
            <input value={config.smtp_from} onChange={e => set('smtp_from', e.target.value)}
              placeholder={`"CAT DGCAT <${config.smtp_user || 'casilla@buenosaires.gob.ar'}>"`} style={INP_S}
              onFocus={e => e.target.style.borderColor = C.navy} onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
          </div>

          {/* Test result */}
          {testMsg && (
            <div style={{ background: testMsg.ok ? '#f0fdf4' : '#fee2e2', border: `1px solid ${testMsg.ok ? '#a7f3d0' : '#fca5a5'}`, borderRadius: 9, padding: '10px 14px', fontSize: 12, color: testMsg.ok ? C.green : '#b91c1c', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
              {testMsg.ok
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              }
              {testMsg.texto}
            </div>
          )}

          {exito && (
            <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: C.green, fontWeight: 600 }}>
              ✓ Configuración guardada correctamente
            </div>
          )}

          {errorMsg && (
            <div style={{ background: '#fee2e2', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{errorMsg}</div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', paddingTop: 4 }}>
            <button onClick={testear} disabled={testando}
              style={{ padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: C.navy, fontSize: 12, fontWeight: 700, cursor: testando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, opacity: testando ? 0.7 : 1 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              {testando ? 'Probando...' : 'Probar conexión'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Cerrar
              </button>
              <button onClick={guardar} disabled={guardando}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: guardando ? '#aeaeb2' : C.navy, color: '#fff', fontSize: 12, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer' }}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function FacturacionPage() {
  const permisos = usePermisos(['FACTURACION_APROBAR','FACTURACION_RECHAZAR','FACTURACION_SUBSANAR','FACTURACION_CONFIG_SMTP'])
  const [lista, setLista]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [detalle, setDetalle]   = useState(null)
  const [modalSMTP, setModalSMTP] = useState(false)

  useEffect(() => {
    api.get('/api/facturacion')
      .then(d => { setLista(d); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  return (
    <AppShell>
      <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.navy, letterSpacing: '-0.5px' }}>Facturación</div>
            <div style={{ fontSize: 13, color: '#636366', marginTop: 4 }}>Solicitudes de factura enviadas a agentes LOYS</div>
          </div>
          {/* Ruedita de configuración SMTP */}
          {permisos.FACTURACION_CONFIG_SMTP && <button
            onClick={() => setModalSMTP(true)}
            title="Configurar servidor de correo"
            style={{ width: 36, height: 36, borderRadius: 9, border: `1.5px solid ${C.border}`, background: '#fff', color: '#8e8e93', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.color = C.navy; e.currentTarget.style.background = '#f0f4ff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = '#8e8e93'; e.currentTarget.style.background = '#fff' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>}
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#8e8e93', fontSize: 14 }}>Cargando...</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Sin solicitudes</div>
            <div style={{ fontSize: 13, color: '#8e8e93' }}>Las solicitudes de factura se crean desde el panel de Servicio Detalle.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lista.map(sol => {
              const total    = parseInt(sol.total_items) || 0
              const aprob    = parseInt(sol.aprobadas) || 0
              const present  = parseInt(sol.presentadas) || 0
              const pend     = parseInt(sol.pendientes) || 0
              const pct      = total > 0 ? Math.round((aprob / total) * 100) : 0

              return (
                <div
                  key={sol.id}
                  onClick={() => setDetalle(sol.id)}
                  style={{ background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '18px 22px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 20 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,39,68,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {/* Círculo de progreso */}
                  <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: '50%', background: pct === 100 ? '#d1fae5' : '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: pct === 100 ? C.green : C.navy }}>{pct}%</span>
                  </div>

                  {/* Datos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sol.concepto}</div>
                    <div style={{ fontSize: 12, color: '#636366', marginTop: 3 }}>
                      {sol.servicio_nombre && <span>{sol.servicio_nombre} · </span>}
                      Período: {fmtFecha(sol.periodo_desde)} → {fmtFecha(sol.periodo_hasta)}
                    </div>
                    <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>
                      Generado por {sol.generado_por_nombre} el {fmtFecha(sol.generado_at)}
                    </div>
                  </div>

                  {/* Contadores */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {[
                      { label: 'Total', val: total, color: '#636366', bg: '#f5f5f7' },
                      { label: 'Presentadas', val: present, color: '#185fa5', bg: '#dbeafe' },
                      { label: 'Aprobadas', val: aprob, color: C.green, bg: '#d1fae5' },
                      pend > 0 && { label: 'Pendientes', val: pend, color: '#b45309', bg: '#fef3c7' },
                    ].filter(Boolean).map(({ label, val, color, bg }) => (
                      <div key={label} style={{ textAlign: 'center', background: bg, borderRadius: 8, padding: '6px 12px', minWidth: 56 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color }}>{val}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {detalle && <ModalDetalle solicitud_id={detalle} onClose={() => setDetalle(null)} permisos={permisos} />}
    </AppShell>
  )
}
