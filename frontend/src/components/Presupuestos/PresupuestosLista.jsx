import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import AppShell from '../AppShell'
import ModalNuevoPresupuesto from './ModalNuevoPresupuesto'
import ModalNuevoBeneficiario from './ModalNuevoBeneficiario'
import PresupuestoPDF from './PresupuestoPDF'
import { usePermisos } from '../../hooks/usePermiso'

// ── Paleta ────────────────────────────────────────────────────
const C = { navy: '#1a2744', accent: '#f5c800', bg: '#eef1f6', border: '#e0e4ed' }

const ESTADOS = {
  borrador:  { label: 'Borrador',  color: '#c47f00', bg: '#fff8e6', text: '#7a4f00' },
  enviado:   { label: 'Enviado',   color: '#185fa5', bg: '#e8f0fe', text: '#185fa5' },
  aprobado:  { label: 'Aprobado',  color: '#0f6e56', bg: '#e8faf2', text: '#0f6e56' },
  rechazado: { label: 'Rechazado', color: '#c0392b', bg: '#fdecea', text: '#c0392b' },
  vencido:   { label: 'Vencido',   color: '#aeaeb2', bg: '#f5f5f7', text: '#636366' },
  cancelado: { label: 'Cancelado', color: '#b91c1c', bg: '#fee2e2', text: '#b91c1c' },
}

function formatPesos(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function calcTotal(presupuesto) {
  if (!presupuesto?.items?.length) return 0
  const vm = Number(presupuesto.valor_modulo) || 0
  return presupuesto.items.reduce((acc, it) => {
    const tm = (Number(it.personal) || 0) * (Number(it.modulos) || 0)
    return acc + tm * vm
  }, 0)
}

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Badge de estado ───────────────────────────────────────────
function BadgeEstado({ estado }) {
  const e = ESTADOS[estado] ?? ESTADOS.borrador
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, background: e.bg, color: e.text,
      border: `1px solid ${e.color}22`, letterSpacing: '0.01em',
    }}>
      {e.label}
    </span>
  )
}

// ── Ícono documento ───────────────────────────────────────────
const IcoDoc = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
)
const IcoPrint = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
)
const IcoTrash = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
)

// ── Card de presupuesto ───────────────────────────────────────
function CardPresupuesto({ p, onVerPDF, onCambiarEstado, onEliminar, onModificar, onModificarAprobado, permisos }) {
  const [hov, setHov] = useState(false)
  const total = calcTotal(p)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff',
        borderRadius: 14,
        border: `1.5px solid ${hov ? C.navy + '33' : C.border}`,
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hov ? '0 4px 20px rgba(26,39,68,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Ícono */}
      <div style={{
        width: 44, height: 44, borderRadius: 11,
        background: C.navy, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {IcoDoc}
      </div>

      {/* Info principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
          {/* ID de Servicio — aparece cuando el presupuesto es aprobado */}
          {p.numero_servicio ? (
            <span style={{
              background: C.navy, color: C.accent, fontSize: 11, fontWeight: 900,
              padding: '3px 10px', borderRadius: 6, letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums',
            }}>
              {p.numero_servicio}
            </span>
          ) : (
            <span style={{
              background: C.accent, color: C.navy, fontSize: 10, fontWeight: 900,
              padding: '2px 8px', borderRadius: 6, letterSpacing: '0.04em',
            }}>
              {p.numero}
            </span>
          )}
          <BadgeEstado estado={p.estado} />
          {p.bui_numero && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 700, color: '#0f6e56',
              background: '#e8faf2', border: '1px solid #0f6e5622',
              padding: '2px 8px', borderRadius: 20, letterSpacing: '0.01em',
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              BUI {p.bui_numero}
            </span>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.evento}
        </div>
        <div style={{ fontSize: 12, color: '#636366' }}>
          <span style={{ fontWeight: 600, color: '#444' }}>{p.beneficiario}</span>
          {' · '}{p.items?.length || 0} ítem{p.items?.length !== 1 ? 's' : ''}
          {' · '}Creado el {formatFecha(p.created_at)}
        </div>
      </div>


      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => onVerPDF(p)}
          title="Vista previa / Imprimir"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px', borderRadius: 8,
            border: `1.5px solid ${C.border}`, background: '#fff',
            color: C.navy, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.navy; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.navy }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = C.navy; e.currentTarget.style.borderColor = C.border }}
        >
          {IcoPrint} PDF
        </button>

        {/* Cambio rápido de estado */}
        {p.estado === 'borrador' && permisos?.PRESUPUESTOS_CREAR && (
          <button
            onClick={() => onCambiarEstado(p.id, 'enviado')}
            title="Marcar como enviado"
            style={{
              padding: '7px 12px', borderRadius: 8,
              border: '1.5px solid #185fa5', background: '#e8f0fe',
              color: '#185fa5', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Enviar
          </button>
        )}
        {p.estado === 'enviado' && (permisos?.PRESUPUESTOS_APROBAR || permisos?.PRESUPUESTOS_RECHAZAR || permisos?.PRESUPUESTOS_CREAR) && (
          <>
            {permisos?.PRESUPUESTOS_CREAR && <button
              onClick={() => onModificar(p)}
              title="Modificar para negociación"
              style={{
                padding: '7px 10px', borderRadius: 8,
                border: '1.5px solid #c47f00', background: '#fff8e6',
                color: '#7a4f00', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Modificar
            </button>}
            {permisos?.PRESUPUESTOS_APROBAR && <button
              onClick={() => onCambiarEstado(p.id, 'aprobado')}
              style={{
                padding: '7px 10px', borderRadius: 8,
                border: '1.5px solid #0f6e56', background: '#e8faf2',
                color: '#0f6e56', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >Aprobar</button>}
            {permisos?.PRESUPUESTOS_RECHAZAR && <button
              onClick={() => onCambiarEstado(p.id, 'rechazado')}
              style={{
                padding: '7px 10px', borderRadius: 8,
                border: '1.5px solid #c0392b', background: '#fdecea',
                color: '#c0392b', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >Rechazar</button>}
          </>
        )}

        {p.estado === 'aprobado' && permisos?.PRESUPUESTOS_MODIFICAR_APROBADO && (
          <button
            onClick={() => onModificarAprobado(p)}
            title="Modificar presupuesto aprobado"
            style={{
              padding: '7px 10px', borderRadius: 8,
              border: '1.5px solid #b45309', background: '#fffbeb',
              color: '#92400e', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Modificar
          </button>
        )}

        {permisos?.PRESUPUESTOS_ELIMINAR && <button
          onClick={() => onEliminar(p.id, p.numero)}
          title="Eliminar"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 33, height: 33, borderRadius: 8,
            border: `1.5px solid ${C.border}`, background: '#fff',
            color: '#aeaeb2', cursor: 'pointer', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fdecea'; e.currentTarget.style.color = '#c0392b'; e.currentTarget.style.borderColor = '#c0392b44' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#aeaeb2'; e.currentTarget.style.borderColor = C.border }}
        >
          {IcoTrash}
        </button>}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function PresupuestosLista() {
  const permisos = usePermisos(['PRESUPUESTOS_CREAR','PRESUPUESTOS_APROBAR','PRESUPUESTOS_RECHAZAR','PRESUPUESTOS_ELIMINAR','PRESUPUESTOS_MODIFICAR_APROBADO'])
  const [lista, setLista] = useState([])
  const [advertenciaAprobado, setAdvertenciaAprobado] = useState(null) // presupuesto a modificar
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalCrear, setModalCrear] = useState(false)
  const [modalBeneficiario, setModalBeneficiario] = useState(false)
  const [presupuestoEditar, setPresupuestoEditar] = useState(null)
  const [pdfPresupuesto, setPdfPresupuesto] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      const data = await api.get('/api/presupuestos')
      setLista(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleCambiarEstado(id, estado) {
    try {
      await api.put(`/api/presupuestos/${id}`, { estado })
      setLista(prev => prev.map(p => p.id === id ? { ...p, estado } : p))
    } catch (e) {
      alert('Error al cambiar estado: ' + e.message)
    }
  }

  async function handleEliminar(id, numero) {
    if (!confirm(`¿Eliminar ${numero}? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/api/presupuestos/${id}`)
      setLista(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      alert('Error al eliminar: ' + e.message)
    }
  }

  function handleModificarAprobado(p) {
    setAdvertenciaAprobado(p)
  }

  const listaFiltrada = filtroEstado === 'todos'
    ? lista
    : lista.filter(p => p.estado === filtroEstado)

  const IcoPlus = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )

  return (
    <AppShell
      titulo="Presupuestos"
      accionHeader={permisos.PRESUPUESTOS_CREAR ? { label: 'Nuevo presupuesto', icon: IcoPlus, onClick: () => setModalCrear(true) } : undefined}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px' }}>

        {/* Filtros de estado + botón beneficiario */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {['todos', ...Object.keys(ESTADOS)].map(key => (
            <button
              key={key}
              onClick={() => setFiltroEstado(key)}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1.5px solid ${filtroEstado === key ? C.navy : C.border}`,
                background: filtroEstado === key ? C.navy : '#fff',
                color: filtroEstado === key ? '#fff' : '#636366',
                fontSize: 12, fontWeight: filtroEstado === key ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {key === 'todos' ? 'Todos' : ESTADOS[key].label}
              {key !== 'todos' && (
                <span style={{
                  marginLeft: 6, background: filtroEstado === key ? 'rgba(255,255,255,0.25)' : '#f0f0f0',
                  borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 700,
                }}>
                  {lista.filter(p => p.estado === key).length}
                </span>
              )}
            </button>
          ))}

          {/* Separador + botón beneficiario */}
          <div style={{ width: 1, height: 22, background: C.border, margin: '0 4px' }} />
          <button
            onClick={() => setModalBeneficiario(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              border: `1.5px solid ${C.border}`, background: '#fff',
              color: '#636366', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.color = C.navy }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = '#636366' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo beneficiario
          </button>
        </div>

        {/* Estados de carga / error / vacío */}
        {cargando && (
          <div style={{ textAlign: 'center', padding: 60, color: '#8e8e93', fontSize: 14 }}>
            Cargando presupuestos...
          </div>
        )}

        {!cargando && error && (
          <div style={{ textAlign: 'center', padding: 60, color: '#c0392b', fontSize: 14 }}>
            Error: {error}
          </div>
        )}

        {!cargando && !error && listaFiltrada.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 40px',
            background: '#fff', borderRadius: 16,
            border: `1.5px dashed ${C.border}`,
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 6 }}>
              {filtroEstado === 'todos' ? 'No hay presupuestos' : `No hay presupuestos ${ESTADOS[filtroEstado]?.label.toLowerCase()}`}
            </div>
            <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 20 }}>
              Creá un nuevo presupuesto para cotizar un servicio adicional.
            </div>
            {permisos.PRESUPUESTOS_CREAR && <button
              onClick={() => setModalCrear(true)}
              style={{
                padding: '10px 24px', borderRadius: 10,
                background: C.navy, color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Nuevo presupuesto
            </button>}
          </div>
        )}

        {/* Lista */}
        {!cargando && !error && listaFiltrada.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {listaFiltrada.map(p => (
              <CardPresupuesto
                key={p.id}
                p={p}
                permisos={permisos}
                onVerPDF={setPdfPresupuesto}
                onCambiarEstado={handleCambiarEstado}
                onEliminar={handleEliminar}
                onModificar={setPresupuestoEditar}
                onModificarAprobado={() => handleModificarAprobado(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal nuevo beneficiario */}
      {modalBeneficiario && (
        <ModalNuevoBeneficiario
          onClose={() => setModalBeneficiario(false)}
          onCreado={() => setModalBeneficiario(false)}
        />
      )}

      {/* Modal nuevo presupuesto */}
      {modalCrear && (
        <ModalNuevoPresupuesto
          onClose={() => setModalCrear(false)}
          onCreado={(nuevo) => {
            setLista(prev => [nuevo, ...prev])
            setModalCrear(false)
          }}
          onCreadoYPDF={(nuevo) => {
            setLista(prev => [nuevo, ...prev])
            setModalCrear(false)
            setPdfPresupuesto(nuevo)
          }}
        />
      )}

      {/* Modal modificar presupuesto (negociación / aprobado) */}
      {presupuestoEditar && (
        <ModalNuevoPresupuesto
          presupuesto={presupuestoEditar}
          esModificacionAprobado={presupuestoEditar?._modoAprobado === true}
          onClose={() => setPresupuestoEditar(null)}
          onCreado={(actualizado) => {
            setLista(prev => prev.map(p => p.id === actualizado.id ? actualizado : p))
            setPresupuestoEditar(null)
          }}
          onCreadoYPDF={(actualizado) => {
            setLista(prev => prev.map(p => p.id === actualizado.id ? actualizado : p))
            setPresupuestoEditar(null)
            setPdfPresupuesto(actualizado)
          }}
        />
      )}

      {/* Modal advertencia modificar aprobado */}
      {advertenciaAprobado && (
        <div onClick={() => setAdvertenciaAprobado(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, padding: '32px 36px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>

            {/* Ícono advertencia */}
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fffbeb', border: '2px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            <div style={{ fontSize: 17, fontWeight: 800, color: '#1a2744', marginBottom: 10 }}>
              Modificar presupuesto aprobado
            </div>
            <div style={{ fontSize: 13, color: '#636366', lineHeight: 1.6, marginBottom: 8 }}>
              Estás por modificar <strong style={{ color: '#1a2744' }}>{advertenciaAprobado.numero}</strong> — <em>{advertenciaAprobado.evento}</em>.
            </div>
            <div style={{ fontSize: 13, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginBottom: 24, lineHeight: 1.6 }}>
              El presupuesto <strong>seguirá aprobado</strong>. El servicio vinculado quedará marcado como <strong>"con cambios pendientes"</strong> para que el operador pueda revisar y reconciliar turnos, convocatoria y armado.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setAdvertenciaAprobado(null)}
                style={{ padding: '9px 20px', borderRadius: 9, border: '1.5px solid #e0e4ed', background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={() => {
                  const p = advertenciaAprobado
                  setAdvertenciaAprobado(null)
                  setPresupuestoEditar({ ...p, _modoAprobado: true })
                  setModalCrear(true)
                }}
                style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: '#b45309', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Continuar y modificar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal vista previa PDF */}
      {pdfPresupuesto && (
        <PresupuestoPDF
          presupuesto={pdfPresupuesto}
          onClose={() => setPdfPresupuesto(null)}
        />
      )}
    </AppShell>
  )
}
