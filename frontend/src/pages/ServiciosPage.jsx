/**
 * ServiciosPage.jsx
 * Submodulo Servicios — eje integrador de todo el proceso de adicionales.
 * Muestra el listado de servicios con badges independientes por componente.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import AppShell from '../components/AppShell'

const C = { navy: '#1a2744', accent: '#f5c800', bg: '#eef1f6', border: '#e0e4ed' }

// ── Badges de componentes independientes ──────────────────────
function MicroBadge({ label, estado }) {
  const cols = {
    ok:      { bg: '#d1fae5', color: '#0f6e56', dot: '#0f6e56' },
    activo:  { bg: '#dbeafe', color: '#185fa5', dot: '#185fa5' },
    parcial: { bg: '#fef3c7', color: '#b45309', dot: '#b45309' },
    sin:     { bg: '#f3f4f6', color: '#aeaeb2', dot: '#d1d1d6' },
  }
  const c = cols[estado] || cols.sin
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99, background: c.bg }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: c.color, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  )
}

function ComponentesBadges({ s }) {
  const presEstado = s.presupuesto_estado === 'aprobado' ? 'ok' : s.presupuesto_numero ? 'parcial' : 'sin'
  const presLabel  = s.presupuesto_estado === 'aprobado' ? 'Ppto ✓' : s.presupuesto_numero ? 'Ppto' : 'Sin ppto'

  const buiEstado  = s.bui_pagada ? 'ok' : s.bui_numero ? 'parcial' : 'sin'
  const buiLabel   = s.bui_pagada ? 'BUI ✓' : s.bui_numero ? 'BUI' : 'Sin BUI'

  const osEstado   = !s.os_adicional_id ? 'sin'
                   : s.os_estado === 'requiere_revision' ? 'parcial'
                   : ['validada','cumplida'].includes(s.os_estado) ? 'ok' : 'activo'
  const osLabel    = !s.os_adicional_id ? 'Sin OS'
                   : s.os_estado === 'requiere_revision' ? '⚠ OS'
                   : ['validada','cumplida'].includes(s.os_estado) ? 'OS ✓' : 'OS'

  const ssaaMap = { pendiente: 'parcial', en_gestion: 'activo', convocado: 'activo', en_curso: 'activo', cerrado: 'ok' }
  const tieneConflictosSsaa = s.sa_conflictos_revision?.length > 0
  const ssaaEstado = !s.servicio_adicional_id ? 'sin'
                   : tieneConflictosSsaa ? 'parcial'
                   : (ssaaMap[s.sa_estado] || 'parcial')
  const ssaaLabel  = !s.servicio_adicional_id ? 'Sin SSAA'
                   : tieneConflictosSsaa ? '⚠ SSAA'
                   : ({ pendiente: 'SSAA', en_gestion: 'SSAA', convocado: 'Convocado', en_curso: 'En curso', cerrado: 'SSAA ✓' }[s.sa_estado] || 'SSAA')

  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <MicroBadge label={presLabel} estado={presEstado} />
      <MicroBadge label={buiLabel}  estado={buiEstado}  />
      <MicroBadge label={osLabel}   estado={osEstado}   />
      <MicroBadge label={ssaaLabel} estado={ssaaEstado} />
    </div>
  )
}

// ── Card de servicio ──────────────────────────────────────────
function CardServicio({ s, onClick }) {
  const [hov, setHov] = useState(false)
  const cancelado = s.estado === 'cancelado'

  const beneficiario = s.beneficiario_razon_social || s.beneficiario_nombre || '—'
  const fechas = s.fechas_os?.filter(f => f.id)?.map(f => f.id) ?? []
  const fechaTexto = fechas.length
    ? new Date(fechas[0]).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: cancelado ? '#fafafa' : '#fff',
        borderRadius: 14,
        border: `1.5px solid ${cancelado ? '#fca5a5' : hov ? C.navy + '33' : C.border}`,
        padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18,
        cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: hov ? '0 4px 20px rgba(26,39,68,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        opacity: cancelado ? 0.75 : 1,
      }}
    >
      {/* Número de servicio */}
      <div style={{
        flexShrink: 0, width: 64, height: 52, borderRadius: 12,
        background: cancelado ? '#e0e4ed' : C.navy, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 8, color: C.accent, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Servicio
        </div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '0.04em' }}>
          {s.numero_servicio}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {s.evento || '—'}
        </div>
        <div style={{ fontSize: 12, color: '#636366', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#444' }}>{beneficiario}</span>
          {s.beneficiario_cuit && <span>· CUIT {s.beneficiario_cuit}</span>}
          <span>· {fechaTexto}</span>
          {s.presupuesto_numero && (
            <span style={{ color: '#8e8e93' }}>· Ppto {s.presupuesto_numero}</span>
          )}
        </div>
      </div>

      {/* Badges de componentes o badge cancelado */}
      {cancelado ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, background: '#fee2e2', color: '#b91c1c', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          Cancelado
        </span>
      ) : (
        <ComponentesBadges s={s} />
      )}

      {/* Flecha */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function ServiciosPage() {
  const [lista, setLista]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab]           = useState('activos')
  const navigate = useNavigate()

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      const data = await api.get('/api/servicios')
      setLista(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Separar por tab
  const activos    = lista.filter(s => s.estado !== 'cancelado')
  const cancelados = lista.filter(s => s.estado === 'cancelado')
  const listaTab   = tab === 'activos' ? activos : cancelados

  const listaFiltrada = listaTab.filter(s => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      s.numero_servicio?.toLowerCase().includes(q) ||
      s.evento?.toLowerCase().includes(q) ||
      s.beneficiario_nombre?.toLowerCase().includes(q) ||
      s.beneficiario_razon_social?.toLowerCase().includes(q) ||
      s.beneficiario_cuit?.includes(q)
    )
  })

  // Estadísticas rápidas (solo activos)
  const stats = {
    enCurso:  activos.filter(s => s.sa_estado !== 'cerrado').length,
    cerrados: activos.filter(s => s.sa_estado === 'cerrado').length,
  }

  return (
    <AppShell titulo="Servicios">
      {/* Tabs */}
      <div style={{ background: '#fff', padding: '0 36px', borderBottom: `0.5px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { id: 'activos',    label: 'Activos',    count: activos.length },
            { id: 'cancelados', label: 'Cancelados', count: cancelados.length },
          ].filter(t => t.id !== 'cancelados' || t.count > 0).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? C.navy : '#8e8e93',
                borderBottom: tab === t.id ? `2px solid ${C.navy}` : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 11, fontWeight: 700,
                  background: tab === t.id ? C.navy : '#e5e5ea',
                  color: tab === t.id ? '#fff' : '#8e8e93',
                  padding: '1px 7px', borderRadius: 10,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px' }}>

        {/* Stats rápidas — solo tab activos */}
        {tab === 'activos' && !cargando && (
          <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'En curso',  valor: stats.enCurso,  color: '#185fa5' },
              { label: 'Cerrados',  valor: stats.cerrados, color: '#0f6e56' },
            ].map(st => (
              <div key={st.label} style={{
                background: '#fff', borderRadius: 12, padding: '14px 22px',
                border: `1.5px solid ${C.border}`,
                display: 'flex', flexDirection: 'column', gap: 2,
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: st.color }}>{st.valor}</div>
                <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600 }}>{st.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Buscador */}
        <div style={{ position: 'relative', marginBottom: 20, maxWidth: 440 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por número, evento, beneficiario o CUIT…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px 10px 38px', borderRadius: 10,
              border: `1.5px solid ${C.border}`, fontSize: 13,
              color: C.navy, outline: 'none', background: '#fff',
            }}
          />
        </div>

        {/* Lista */}
        {cargando && (
          <div style={{ textAlign: 'center', padding: 60, color: '#8e8e93', fontSize: 14 }}>
            Cargando servicios…
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
            <div style={{ fontSize: 36, marginBottom: 12 }}>{tab === 'cancelados' ? '🚫' : '⚡'}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 6 }}>
              {busqueda ? 'Sin resultados' : tab === 'cancelados' ? 'No hay servicios cancelados' : 'No hay servicios aún'}
            </div>
            <div style={{ fontSize: 13, color: '#8e8e93' }}>
              {busqueda
                ? 'Probá con otro término de búsqueda.'
                : tab === 'cancelados'
                  ? 'Los servicios cancelados aparecerán aquí.'
                  : 'Los servicios se crean automáticamente al generar un presupuesto.'}
            </div>
          </div>
        )}

        {!cargando && !error && listaFiltrada.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {listaFiltrada.map(s => (
              <CardServicio
                key={s.id}
                s={s}
                onClick={() => navigate(`/servicios/${s.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
