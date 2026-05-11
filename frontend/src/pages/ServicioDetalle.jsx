/**
 * ServicioDetalle.jsx
 * Vista completa de un servicio — pipeline, datos vinculados, documentos.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import AppShell from '../components/AppShell'
import { usePermisos } from '../hooks/usePermiso'
import { useReporteOSAdicional, DrawerPreview } from '../components/OSAdicional/ReporteOSAdicional'
import ModalBUI from '../components/Presupuestos/ModalBUI'
import ModalFacturacion from '../components/Facturacion/ModalFacturacion'

const C = { navy: '#1a2744', accent: '#f5c800', bg: '#eef1f6', border: '#e0e4ed', green: '#0f6e56' }

// ── Badges independientes por componente ──────────────────────
function ComponenteBadge({ label, estado, texto }) {
  const estilos = {
    ok:      { bg: '#d1fae5', color: '#0f6e56', dot: '#0f6e56' },
    activo:  { bg: '#dbeafe', color: '#185fa5', dot: '#185fa5' },
    parcial: { bg: '#fef3c7', color: '#b45309', dot: '#b45309' },
    sin:     { bg: '#f3f4f6', color: '#aeaeb2', dot: '#d1d1d6' },
  }
  const e = estilos[estado] || estilos.sin
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 72 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: e.bg }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: e.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: e.color, whiteSpace: 'nowrap' }}>{texto}</span>
      </div>
      <span style={{ fontSize: 10, color: '#aeaeb2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    </div>
  )
}

function ComponentesServicio({ s }) {
  const ssaaEstados = {
    pendiente:  { estado: 'parcial', texto: 'Pendiente' },
    en_gestion: { estado: 'activo',  texto: 'En gestión' },
    convocado:  { estado: 'activo',  texto: 'Convocado' },
    en_curso:   { estado: 'activo',  texto: 'En curso' },
    cerrado:    { estado: 'ok',      texto: 'Cerrado' },
  }
  const tieneConflictos = s.sa_conflictos_revision?.length > 0
  const ssaa = s.servicio_adicional_id
    ? tieneConflictos
      ? { estado: 'parcial', texto: '⚠ Conflictos' }
      : (ssaaEstados[s.sa_estado] || { estado: 'parcial', texto: s.sa_estado })
    : null

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
      <ComponenteBadge
        label="Presupuesto"
        estado={s.presupuesto_estado === 'aprobado' ? 'ok' : s.presupuesto_numero ? 'parcial' : 'sin'}
        texto={s.presupuesto_estado === 'aprobado' ? 'Aprobado' : s.presupuesto_numero ? (s.presupuesto_estado || 'Pendiente') : 'Sin presupuesto'}
      />
      <ComponenteBadge
        label="BUI"
        estado={s.bui_pagada ? 'ok' : s.bui_numero ? 'parcial' : 'sin'}
        texto={s.bui_pagada ? 'Pagada' : s.bui_numero ? 'Emitida' : 'Sin BUI'}
      />
      <ComponenteBadge
        label="OS Adicional"
        estado={
          !s.os_adicional_id ? 'sin'
          : s.os_estado === 'requiere_revision' ? 'parcial'
          : ['validada','cumplida'].includes(s.os_estado) ? 'ok'
          : 'activo'
        }
        texto={
          !s.os_adicional_id ? 'Sin OS'
          : s.os_estado === 'requiere_revision' ? '⚠ Revisar OS'
          : ['validada','cumplida'].includes(s.os_estado) ? 'Validada'
          : (s.os_estado || 'Pendiente')
        }
      />
      <ComponenteBadge
        label="SS.AA."
        estado={ssaa ? ssaa.estado : 'sin'}
        texto={ssaa ? ssaa.texto : 'Sin SS.AA.'}
      />
    </div>
  )
}

// ── Helpers UI ────────────────────────────────────────────────
function Badge({ label, color = '#636366', bg = '#f0f2f6' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color, background: bg }}>
      {label}
    </span>
  )
}

const ESTADO_MAP = {
  borrador: { label: 'Borrador', color: '#636366', bg: '#f0f2f6' },
  pendiente: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
  aprobado: { label: 'Aprobado', color: '#0f6e56', bg: '#d1fae5' },
  rechazado: { label: 'Rechazado', color: '#b91c1c', bg: '#fee2e2' },
  validada: { label: 'Validada', color: '#0f6e56', bg: '#d1fae5' },
  validacion: { label: 'En validación', color: '#185fa5', bg: '#dbeafe' },
  requiere_revision: { label: 'Requiere revisión', color: '#b45309', bg: '#fef3c7' },
  rechazada: { label: 'Rechazada', color: '#b91c1c', bg: '#fee2e2' },
  cumplida: { label: 'Cumplida', color: '#0f6e56', bg: '#d1fae5' },
  convocado: { label: 'Convocado', color: '#185fa5', bg: '#dbeafe' },
  en_curso: { label: 'En curso', color: '#b45309', bg: '#fef3c7' },
  cerrado: { label: 'Cerrado', color: '#0f6e56', bg: '#d1fae5' },
}
function estadoBadge(estado) { return ESTADO_MAP[estado] ?? { label: estado, color: '#636366', bg: '#f0f2f6' } }

function Card({ children, style = {} }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${C.border}`, padding: '20px 24px', ...style }}>
      {children}
    </div>
  )
}
function CardTitulo({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>{children}</div>
}
function Campo({ label, valor }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.navy, fontWeight: 500 }}>{valor || '—'}</div>
    </div>
  )
}

// ── Modal: Cancelar servicio ──────────────────────────────────
function ModalCancelar({ numeroServicio, onConfirmar, onClose }) {
  const [texto, setTexto]         = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [error, setError]         = useState(null)
  const valido = texto.trim().toUpperCase() === 'CANCELAR'

  async function confirmar() {
    if (!valido) return
    setCancelando(true)
    setError(null)
    try {
      await onConfirmar()
    } catch (e) {
      setError(e.message)
      setCancelando(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        {/* Header rojo */}
        <div style={{ background: '#b91c1c', padding: '20px 24px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Cancelar servicio {numeroServicio}</div>
          </div>
        </div>

        <div style={{ padding: '24px 24px 20px' }}>
          <div style={{ fontSize: 13, color: '#444', marginBottom: 18, lineHeight: 1.6 }}>
            Esta acción <strong>no se puede deshacer</strong>. Se cancelarán en cascada:
          </div>
          <ul style={{ margin: '0 0 20px 0', padding: '0 0 0 18px', fontSize: 13, color: '#636366', lineHeight: 2 }}>
            <li>El presupuesto vinculado</li>
            <li>La OS Adicional</li>
            <li>La Gestión SSAA (convocatoria y presentismo)</li>
          </ul>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 8 }}>
              Para confirmar, escribí <strong style={{ color: '#b91c1c' }}>CANCELAR</strong>
            </label>
            <input
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && valido && confirmar()}
              placeholder="CANCELAR"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', borderRadius: 9, fontSize: 14, fontWeight: 700,
                border: `2px solid ${valido ? '#b91c1c' : '#e0e4ed'}`,
                color: valido ? '#b91c1c' : '#1a2744',
                outline: 'none', letterSpacing: '0.05em',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={cancelando} style={{ padding: '9px 18px', borderRadius: 9, border: `1.5px solid #e0e4ed`, background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Volver
            </button>
            <button
              onClick={confirmar}
              disabled={!valido || cancelando}
              style={{
                padding: '9px 20px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700,
                background: valido ? '#b91c1c' : '#e0e4ed',
                color: valido ? '#fff' : '#8e8e93',
                cursor: valido && !cancelando ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              {cancelando ? 'Cancelando…' : 'Confirmar cancelación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Overlay base ──────────────────────────────────────────────
function Overlay({ onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {children}
      </div>
    </div>
  )
}

// ── Modal: Marcar BUI pagada + comprobante ────────────────────
function ModalBuiPago({ servicioId, buiActual, onGuardado, onClose }) {
  const [archivo, setArchivo]     = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState(null)
  const inputRef = useRef()

  async function confirmar() {
    setGuardando(true)
    setError(null)
    try {
      // 1 — Marcar BUI como pagada
      await api.patch(`/api/servicios/${servicioId}/bui-pagada`, { bui_pagada: true })

      // 2 — Subir comprobante si se adjuntó uno
      if (archivo) {
        const fd = new FormData()
        fd.append('archivo', archivo)
        fd.append('nombre', `Comprobante BUI - ${buiActual || ''}`.trim())
        fd.append('tipo', 'comprobante_bui')
        await api.upload(`/api/servicios/${servicioId}/documentos`, fd)
      }

      onGuardado()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: '28px 28px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, marginBottom: 6 }}>Confirmar pago de BUI</div>
        <div style={{ fontSize: 13, color: '#636366', marginBottom: 22 }}>
          Vas a registrar el pago de la BUI <strong>{buiActual}</strong>. Podés adjuntar el comprobante enviado por el beneficiario.
        </div>

        {/* Dropzone comprobante */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${archivo ? C.green : C.border}`,
            borderRadius: 12, padding: '20px 16px', textAlign: 'center',
            cursor: 'pointer', background: archivo ? '#f0fdf4' : '#fafbfc',
            transition: 'all 0.2s', marginBottom: 20,
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setArchivo(f) }}
        >
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setArchivo(e.target.files[0])} />
          {archivo ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>{archivo.name}</span>
              <button onClick={e => { e.stopPropagation(); setArchivo(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="1.5" style={{ marginBottom: 8 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#636366' }}>Adjuntar comprobante de pago</div>
              <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 3 }}>PDF, JPG o PNG · Opcional</div>
            </>
          )}
        </div>

        {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={guardando} style={{ padding: '9px 18px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={guardando} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Guardando…' : '✓ Confirmar pago'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// ── Modal: Vincular OS Adicional ──────────────────────────────
function ModalVincularOS({ servicioId, onVinculada, onClose }) {
  const [lista, setLista]         = useState([])
  const [cargando, setCargando]   = useState(true)
  const [seleccionado, setSelec]  = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => {
    api.get('/api/os-adicional').then(data => {
      // Mostrar OSes sin servicio vinculado (servicio_id null) o cualquier estado activo
      const disponibles = data.filter(os => !os.servicio_id || os.servicio_id === null)
      setLista(disponibles)
      setCargando(false)
    }).catch(() => setCargando(false))
  }, [])

  async function vincular() {
    if (!seleccionado) return
    setGuardando(true)
    setError(null)
    try {
      await api.post(`/api/servicios/${servicioId}/vincular-os`, { os_adicional_id: seleccionado })
      onVinculada()
      onClose()
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: '28px 28px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, marginBottom: 6 }}>Vincular OS Adicional</div>
        <div style={{ fontSize: 13, color: '#636366', marginBottom: 20 }}>
          Seleccioná la OS Adicional que corresponde a este servicio.
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#8e8e93' }}>Cargando…</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#8e8e93', fontSize: 13 }}>
            No hay OS disponibles para vincular.<br/>
            <span style={{ fontSize: 11 }}>Todas ya están vinculadas a un servicio.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', marginBottom: 20 }}>
            {lista.map(os => {
              const sel = seleccionado === os.id
              const badgeP = estadoBadge(os.estado)
              return (
                <div
                  key={os.id}
                  onClick={() => setSelec(os.id)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${sel ? C.navy : C.border}`,
                    background: sel ? '#f0f4ff' : '#fafbfc',
                    display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.12s',
                  }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${sel ? C.navy : '#c8cdd8'}`, background: sel ? C.navy : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sel && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {os.nombre || 'OS sin nombre'}
                    </div>
                    <div style={{ fontSize: 11, color: '#636366' }}>
                      {os.evento_motivo || '—'} · {os.base_nombre || '—'}
                    </div>
                  </div>
                  <Badge {...badgeP} />
                </div>
              )
            })}
          </div>
        )}

        {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={vincular} disabled={!seleccionado || guardando} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: seleccionado ? C.navy : '#c8cdd8', color: '#fff', fontSize: 13, fontWeight: 700, cursor: seleccionado && !guardando ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}>
            {guardando ? 'Vinculando…' : 'Vincular OS'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// ── Página ────────────────────────────────────────────────────
export default function ServicioDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const p = usePermisos(['SERVICIOS_CARGAR_BUI','SERVICIOS_MARCAR_BUI_PAGADA','SERVICIOS_CANCELAR','SERVICIOS_VINCULAR_OS','SERVICIOS_SOLICITAR_FACTURAS','SSAA_CREAR'])
  const [s, setS]                       = useState(null)
  const [cargando, setCargando]         = useState(true)
  const [error, setError]               = useState(null)
  const [modalBUI, setModalBUI]         = useState(false)
  const [modalCargarBUI, setModalCargarBUI] = useState(false)
  const [modalOS, setModalOS]           = useState(false)
  const [modalCancelar, setModalCancelar] = useState(false)
  const [modalFacturacion, setModalFacturacion] = useState(false)
  const [osFull, setOsFull]             = useState(null)
  const [cargandoOS, setCargandoOS]     = useState(false)
  const [creandoSsaa, setCreandoSsaa]   = useState(false)
  const { drawerAbierto, setDrawerAbierto, generando, generarPDF } = useReporteOSAdicional()

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const data = await api.get(`/api/servicios/${id}`)
      setS(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  async function abrirPDFOs() {
    if (!s?.os_adicional_id) return
    setCargandoOS(true)
    try {
      const data = await api.get(`/api/os-adicional/${s.os_adicional_id}`)
      setOsFull(data)
      setDrawerAbierto(true)
    } catch (e) {
      alert('No se pudo cargar la OS: ' + e.message)
    } finally {
      setCargandoOS(false)
    }
  }

  async function crearSsaa() {
    if (!confirm('¿Comenzar la gestión SSAA para este servicio? Podrás completar los detalles operativos dentro.')) return
    setCreandoSsaa(true)
    try {
      const nuevo = await api.post(`/api/servicios/${id}/crear-ssaa`, {})
      navigate(`/servicios-adicionales/${nuevo.id}`)
    } catch (e) {
      alert(e.message || 'Error al crear gestión SSAA.')
      setCreandoSsaa(false)
    }
  }

  if (cargando) {
    return (
      <AppShell titulo="Servicios">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93' }}>Cargando…</div>
      </AppShell>
    )
  }

  if (error || !s) {
    return (
      <AppShell titulo="Servicios">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0392b', flexDirection: 'column', gap: 12 }}>
          <div>{error || 'Servicio no encontrado'}</div>
          <button onClick={() => navigate('/servicios')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: C.navy, color: '#fff', cursor: 'pointer', fontSize: 13 }}>← Volver</button>
        </div>
      </AppShell>
    )
  }

  const beneficiario = s.beneficiario_razon_social || s.beneficiario_nombre || '—'
  const fechas = s.fechas_os?.filter(f => f.id) ?? []
  const fechaTexto = fechas.length
    ? new Date(fechas[0].id).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <AppShell titulo={`Servicio ${s.numero_servicio}`}>
      {modalBUI && (
        <ModalBuiPago
          servicioId={s.id}
          buiActual={s.bui_numero}
          onGuardado={cargar}
          onClose={() => setModalBUI(false)}
        />
      )}
      {modalCargarBUI && (
        <ModalBUI
          presupuesto={{
            id: s.presupuesto_id,
            numero: s.presupuesto_numero,
            beneficiario: s.beneficiario_razon_social || s.beneficiario_nombre,
            bui_numero: s.bui_numero,
            bui_archivo: s.bui_archivo,
            bui_comp_numero: s.bui_comp_numero,
            bui_comp_archivo: s.bui_comp_archivo,
          }}
          onClose={() => setModalCargarBUI(false)}
          onGuardado={() => { setModalCargarBUI(false); cargar() }}
        />
      )}
      {modalOS && (
        <ModalVincularOS
          servicioId={s.id}
          onVinculada={cargar}
          onClose={() => setModalOS(false)}
        />
      )}
      {modalCancelar && (
        <ModalCancelar
          numeroServicio={s.numero_servicio}
          onClose={() => setModalCancelar(false)}
          onConfirmar={async () => {
            await api.post(`/api/servicios/${s.id}/cancelar`, {})
            setModalCancelar(false)
            cargar()
          }}
        />
      )}
      {modalFacturacion && (
        <ModalFacturacion
          servicio={{ id: s.servicio_adicional_id, nombre: s.nombre, fecha_inicio: s.periodo_desde, fecha_fin: s.periodo_hasta }}
          onClose={() => setModalFacturacion(false)}
          onEnviado={() => { setModalFacturacion(false); cargar() }}
        />
      )}
      {drawerAbierto && osFull && (
        <DrawerPreview
          os={osFull}
          fases={osFull.fases || []}
          recursos={osFull.recursos || []}
          generando={generando}
          onCerrar={() => setDrawerAbierto(false)}
          onGenerar={(datos) => generarPDF(osFull, osFull.fases || [], osFull.recursos || [], datos)}
        />
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Volver */}
        <button
          onClick={() => navigate('/servicios')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, padding: 0, alignSelf: 'flex-start' }}
          onMouseEnter={e => e.currentTarget.style.color = C.navy}
          onMouseLeave={e => e.currentTarget.style.color = '#8e8e93'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Todos los servicios
        </button>

        {/* Header */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 24 }}>
            <div style={{ flexShrink: 0, width: 72, height: 58, borderRadius: 14, background: C.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 8, color: C.accent, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Servicio</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{s.numero_servicio}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 4, lineHeight: 1.2 }}>{s.evento || '—'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>{beneficiario}</span>
                {s.beneficiario_cuit && <span style={{ fontSize: 12, color: '#636366' }}>CUIT {s.beneficiario_cuit}</span>}
                {fechaTexto && <span style={{ fontSize: 12, color: '#636366' }}>· {fechaTexto}</span>}
                {s.creado_por_nombre && <span style={{ fontSize: 11, color: '#aeaeb2' }}>· Creado por {s.creado_por_nombre}</span>}
              </div>
            </div>
          </div>
          <ComponentesServicio s={s} />
        </Card>

        {/* Fila: Presupuesto | OS | SSAA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

          {/* Presupuesto */}
          <Card>
            <CardTitulo>Presupuesto</CardTitulo>
            {s.presupuesto_numero ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>
                    {s.presupuesto_numero}
                  </span>
                  <Badge {...estadoBadge(s.presupuesto_estado)} />
                </div>
                {s.valor_modulo && (
                  <Campo label="Valor módulo" valor={`$${Number(s.valor_modulo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`} />
                )}

                {/* BUI */}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600 }}>BUI</div>
                    {s.presupuesto_estado === 'aprobado' && p.SERVICIOS_CARGAR_BUI && (
                      <button
                        onClick={() => setModalCargarBUI(true)}
                        style={{
                          fontSize: 11, fontWeight: 700, color: '#185fa5', background: 'none',
                          border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6,
                          textDecoration: 'underline', textUnderlineOffset: 2,
                        }}
                      >
                        {s.bui_numero ? 'Editar' : 'Cargar BUI'}
                      </button>
                    )}
                  </div>

                  {s.bui_numero ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{s.bui_numero}</span>
                        {s.bui_archivo && (
                          <a href={`${import.meta.env.VITE_API_URL || ''}/uploads/${s.bui_archivo}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: '#185fa5', textDecoration: 'none', fontWeight: 600 }}>
                            Ver PDF
                          </a>
                        )}
                      </div>
                      {s.bui_comp_numero && (
                        <div style={{ fontSize: 12, color: '#636366', marginBottom: 6 }}>
                          Complementaria: {s.bui_comp_numero}
                          {s.bui_comp_archivo && (
                            <a href={`${import.meta.env.VITE_API_URL || ''}/uploads/${s.bui_comp_archivo}`} target="_blank" rel="noopener noreferrer"
                              style={{ marginLeft: 6, fontSize: 11, color: '#185fa5', textDecoration: 'none', fontWeight: 600 }}>
                              Ver PDF
                            </a>
                          )}
                        </div>
                      )}

                      {/* Botón BUI pagada */}
                      {s.bui_pagada ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: '#d1fae5', marginTop: 6 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>BUI pagada</span>
                          {s.documentos?.find(d => d.tipo === 'comprobante_bui') && (
                            <a
                              href={`${import.meta.env.VITE_API_URL || ''}/uploads/${s.documentos.find(d => d.tipo === 'comprobante_bui').nombre_archivo}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ marginLeft: 'auto', fontSize: 11, color: '#185fa5', textDecoration: 'none', fontWeight: 600 }}
                            >
                              Ver comprobante
                            </a>
                          )}
                        </div>
                      ) : p.SERVICIOS_MARCAR_BUI_PAGADA ? (
                        <button
                          onClick={() => setModalBUI(true)}
                          style={{ marginTop: 6, padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: C.navy, fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = C.green; e.currentTarget.style.color = C.green }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.navy }}
                        >
                          Marcar BUI pagada
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: '#aeaeb2', fontStyle: 'italic' }}>
                      Sin BUI cargada
                    </div>
                  )}
                </div>

                <button onClick={() => navigate('/presupuestos')} style={{ marginTop: 14, padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: C.navy, fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                  Ver presupuestos →
                </button>
              </>
            ) : (
              <div style={{ color: '#8e8e93', fontSize: 13 }}>Sin presupuesto vinculado</div>
            )}
          </Card>

          {/* OS Adicional */}
          <Card style={s.os_estado === 'requiere_revision' ? { borderColor: '#f59e0b', borderWidth: 2 } : {}}>
            <CardTitulo>OS Adicional</CardTitulo>
            {s.os_adicional_id ? (
              <>
                {/* Banner de revisión pendiente */}
                {s.os_estado === 'requiere_revision' && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14,
                    padding: '10px 14px', borderRadius: 10,
                    background: '#fffbeb', border: '1.5px solid #f59e0b',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 3 }}>
                        El presupuesto fue modificado
                      </div>
                      <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
                        Revisá y actualizá la OS para reflejar los cambios. Luego volvé a validarla.
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
                    {s.os_nombre || 'OS Adicional'}
                  </span>
                  <Badge {...estadoBadge(s.os_estado)} />
                </div>

                {/* Evento/motivo */}
                {s.os_evento_motivo && (
                  <div style={{ fontSize: 12, color: '#636366', marginBottom: 10, fontStyle: 'italic' }}>
                    {s.os_evento_motivo}
                  </div>
                )}

                {/* Horario */}
                {(s.os_horario_desde || s.os_horario_hasta) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>
                      {s.os_horario_desde?.slice(0,5) || '?'} – {s.os_horario_hasta?.slice(0,5) || '?'} hs
                    </span>
                  </div>
                )}

                {/* Fechas */}
                {fechaTexto && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span style={{ fontSize: 12, color: '#444' }}>{fechaTexto}</span>
                  </div>
                )}

                {/* Dotación declarada */}
                {(s.os_dotacion_agentes > 0 || s.os_dotacion_supervisores > 0 || s.os_dotacion_motorizados > 0) && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Agentes',      val: s.os_dotacion_agentes,      color: C.navy    },
                      { label: 'Supervisores', val: s.os_dotacion_supervisores,  color: '#185fa5' },
                      { label: 'Motorizados',  val: s.os_dotacion_motorizados,   color: C.green   },
                    ].filter(x => x.val > 0).map(({ label, val, color }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 3, background: '#f5f5f7', borderRadius: 7, padding: '4px 9px' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color }}>{val}</span>
                        <span style={{ fontSize: 10, color: '#8e8e93' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Datos del SA vinculado */}
                {s.servicio_adicional_id && (
                  <div style={{ marginTop: 4, marginBottom: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                    {s.sa_modalidad && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: '#8e8e93' }}>Modalidad</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{s.sa_modalidad}</span>
                      </div>
                    )}
                    {s.sa_modulos > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: '#8e8e93' }}>Módulos</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{s.sa_modulos} módulos</span>
                      </div>
                    )}
                    {s.sa_ingresado && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#8e8e93' }}>Ingresado</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>
                          {new Date(s.sa_ingresado).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {s.os_estado === 'requiere_revision' ? (
                  <button
                    onClick={() => navigate(`/os-adicional/${s.os_adicional_id}`)}
                    style={{
                      padding: '9px 14px', borderRadius: 8, border: 'none', width: '100%',
                      background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Revisar y editar OS
                  </button>
                ) : (
                  <button
                    onClick={abrirPDFOs}
                    disabled={cargandoOS}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: cargandoOS ? '#e0e4ed' : C.navy, color: cargandoOS ? '#8e8e93' : '#fff', fontSize: 12, fontWeight: 700, cursor: cargandoOS ? 'not-allowed' : 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all 0.15s' }}
                  >
                    {cargandoOS ? 'Cargando…' : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Descargar PDF de la OS
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <div>
                <div style={{ color: '#8e8e93', fontSize: 13, marginBottom: 14 }}>No hay OS Adicional vinculada</div>
                {p.SERVICIOS_VINCULAR_OS && <button
                  onClick={() => setModalOS(true)}
                  style={{ padding: '8px 14px', borderRadius: 9, border: `1.5px dashed ${C.navy}`, background: '#fff', color: C.navy, fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  + Vincular OS Adicional
                </button>}
              </div>
            )}
          </Card>

          {/* Gestión SSAA */}
          <Card style={s.sa_conflictos_revision?.length > 0 ? { borderColor: '#f59e0b', borderWidth: 2 } : {}}>
            <CardTitulo>Gestión SSAA</CardTitulo>
            {s.servicio_adicional_id ? (
              <>
                {/* Banner de conflictos tras re-validación */}
                {s.sa_conflictos_revision?.length > 0 && (
                  <div style={{
                    margin: '-4px -4px 14px -4px', padding: '10px 14px',
                    background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
                    fontSize: 12, color: '#92400e',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      ⚠ La OS fue re-validada con cambios — hay conflictos a resolver
                    </div>
                    <div style={{ color: '#b45309' }}>
                      {s.sa_conflictos_revision.length} turno{s.sa_conflictos_revision.length > 1 ? 's' : ''} con conflictos. Ingresá a la Gestión SSAA para revisarlos.
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#636366' }}>Servicio adicional</span>
                  <Badge {...estadoBadge(s.sa_estado)} />
                </div>
                <button
                  onClick={() => navigate(`/servicios-adicionales/${s.servicio_adicional_id}`)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer', width: '100%',
                    fontSize: 12, fontWeight: 600,
                    ...(s.sa_conflictos_revision?.length > 0
                      ? { border: '1.5px solid #f59e0b', background: '#fffbeb', color: '#92400e' }
                      : { border: `1.5px solid ${C.border}`, background: '#fff', color: C.navy }
                    ),
                  }}
                >
                  {s.sa_conflictos_revision?.length > 0 ? 'Resolver conflictos en Gestión SSAA →' : 'Ver Gestión SSAA →'}
                </button>

                {/* Botón de Facturación — disponible cuando hay presentismo cerrado */}
                {s.sa_estado === 'cerrado' && p.SERVICIOS_SOLICITAR_FACTURAS && (
                  <button
                    onClick={() => setModalFacturacion(true)}
                    style={{
                      marginTop: 8, padding: '7px 14px', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg,#1a2744,#243561)',
                      color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Solicitar facturas a agentes
                  </button>
                )}
              </>
            ) : (
              <div>
                <div style={{ color: '#8e8e93', fontSize: 13, marginBottom: 8 }}>No hay gestión SSAA vinculada</div>
                {p.SSAA_CREAR ? (
                  <>
                    <div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 12 }}>
                      Iniciá la gestión SSAA de este servicio. Completarás los detalles operativos dentro.
                    </div>
                    <button
                      onClick={crearSsaa}
                      disabled={creandoSsaa}
                      style={{
                        padding: '8px 14px', borderRadius: 9,
                        border: '1.5px dashed #185fa5', background: creandoSsaa ? '#f0f0f0' : '#eff6ff',
                        color: creandoSsaa ? '#aeaeb2' : '#185fa5', fontSize: 12, fontWeight: 700,
                        cursor: creandoSsaa ? 'not-allowed' : 'pointer', width: '100%',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                      onMouseEnter={e => { if (!creandoSsaa) e.currentTarget.style.background = '#dbeafe' }}
                      onMouseLeave={e => { if (!creandoSsaa) e.currentTarget.style.background = '#eff6ff' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                      {creandoSsaa ? 'Iniciando…' : 'Comenzar gestión SSAA'}
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: '#aeaeb2' }}>
                    {s.os_adicional_id ? 'Se vincula al validar la OS Adicional.' : '—'}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Beneficiario (si tiene datos extra) */}
        {(s.beneficiario_email || s.beneficiario_telefono) && (
          <Card>
            <CardTitulo>Datos del beneficiario</CardTitulo>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              {s.beneficiario_razon_social && <Campo label="Razón social" valor={s.beneficiario_razon_social} />}
              {s.beneficiario_cuit && <Campo label="CUIT" valor={s.beneficiario_cuit} />}
              {s.beneficiario_email && <Campo label="Email" valor={s.beneficiario_email} />}
              {s.beneficiario_telefono && <Campo label="Teléfono" valor={s.beneficiario_telefono} />}
            </div>
          </Card>
        )}

        {/* Banner cancelado */}
        {s.estado === 'cancelado' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#fee2e2', border: '1.5px solid #fca5a5',
            borderRadius: 12, padding: '16px 20px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#b91c1c' }}>Servicio cancelado</div>
              {s.cancelado_at && (
                <div style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>
                  {new Date(s.cancelado_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documentos */}
        <Card>
          <CardTitulo>Documentos del servicio</CardTitulo>
          {(!s.documentos || s.documentos.length === 0) ? (
            <div style={{ color: '#8e8e93', fontSize: 13 }}>No hay documentos adjuntos.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {s.documentos.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fafbfc' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre || doc.nombre_archivo}</div>
                    {doc.tipo && <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1 }}>{doc.tipo === 'comprobante_bui' ? 'Comprobante de pago BUI' : doc.tipo}</div>}
                  </div>
                  <a href={`${import.meta.env.VITE_API_URL || ''}/uploads/${doc.nombre_archivo}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#185fa5', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
                    Descargar
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Cancelar servicio */}
        {s.estado !== 'cancelado' && p.SERVICIOS_CANCELAR && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 8 }}>
            <button
              onClick={() => setModalCancelar(true)}
              style={{
                padding: '8px 18px', borderRadius: 9,
                border: '1.5px solid #fca5a5', background: '#fff',
                color: '#b91c1c', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Cancelar servicio
            </button>
          </div>
        )}

      </div>
    </AppShell>
  )
}
