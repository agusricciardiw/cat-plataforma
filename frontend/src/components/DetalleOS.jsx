/**
 * DetalleOS.jsx
 * Vista de detalle de una OS con el nuevo layout de OSItemPanel
 */
import { useEffect, useState } from 'react'
import api from '../lib/api'
import Topbar from './Topbar'
import OSItemPanel from './OSItemPanel'
import ResumenOS from './ResumenOS'

const ESTADO_OS = {
  borrador:   { label: 'Borrador',       bg: '#f5f5f7', color: '#8e8e93' },
  validacion: { label: 'En validacion',  bg: '#faeeda', color: '#854f0b' },
  vigente:    { label: 'Vigente',        bg: '#e8faf2', color: '#0f6e56' },
  cumplida:   { label: 'Cumplida',       bg: '#f5f5f7', color: '#aeaeb2' },
}

const TIPOS_OS = [
  { id: 'ordinaria',   label: 'Ordinaria',   color: '#1a2744', bg: '#e4eaf5' },
  { id: 'adicional',   label: 'Adicional',   color: '#0f6e56', bg: '#e8faf2' },
  { id: 'alcoholemia', label: 'Alcoholemia', color: '#6b21a8', bg: '#f3e8ff' },
]

function fmtSemana(inicio, fin) {
  const fmt = d => {
    const solo = typeof d === 'string' ? d.slice(0, 10) : d
    return new Date(solo + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }
  return fmt(inicio) + ' - ' + fmt(fin)
}

function fmtPeriodoOS(os) {
  const fmtDia = d => new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  if (os.fechas?.length > 0) {
    if (os.fechas.length === 1) return fmtDia(os.fechas[0])
    if (os.fechas.length <= 4) return os.fechas.map(fmtDia).join(', ')
    return fmtDia(os.fechas[0]) + ' ... ' + fmtDia(os.fechas[os.fechas.length - 1]) + ' (' + os.fechas.length + ' dias)'
  }
  if (os.semana_inicio && os.semana_fin) return fmtSemana(os.semana_inicio, os.semana_fin)
  return 'Sin fechas'
}

export default function DetalleOS({ os, onBack, onRefresh }) {
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [publicando, setPublicando] = useState(false)
  const [showResumen, setShowResumen] = useState(false)

  useEffect(() => { fetchItems() }, [os.id])

  async function fetchItems() {
    setLoading(true)
    try {
      const data = await api.get('/api/os/' + os.id)
      setItems(data.items ?? [])
    } catch (e) {
      console.warn('Error cargando items:', e)
    }
    setLoading(false)
  }

  async function handleEnviarValidacion() {
    setPublicando(true)
    try {
      await api.post('/api/os/' + os.id + '/enviar-validacion', {})
      onRefresh()
      onBack()
    } catch (e) { console.warn('Error enviando a validacion:', e) }
    setPublicando(false)
  }

  async function handleGenerarHoy() {
    setPublicando(true)
    try {
      const res = await api.post('/api/os/' + os.id + '/generar-hoy', {})
      alert('Se generaron ' + res.misiones_creadas + ' misiones.')
    } catch (e) {
      if (e.status === 409) alert('Ya se generaron misiones hoy para esta OS.')
      else alert('Error al generar misiones.')
      console.warn(e)
    }
    setPublicando(false)
  }

  const readOnly   = os.estado === 'cumplida' || os.estado === 'validacion'
  const esBorrador = os.estado === 'borrador'
  const esVigente  = os.estado === 'vigente'
  const tieneItems = items.filter(i => !i._local).length > 0
  const tipoInfo   = TIPOS_OS.find(t => t.id === os.tipo) ?? TIPOS_OS[0]
  const estadoInfo = ESTADO_OS[os.estado] ?? ESTADO_OS.borrador

  return (
    <div style={{ height: '100vh', background: '#f5f5f7', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar/>

      {showResumen && (
        <ResumenOS os={os} onClose={() => setShowResumen(false)}/>
      )}

      <div style={{ background: '#fff', padding: '14px 28px', borderBottom: '0.5px solid #e5e5ea', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button onClick={onBack}
            style={{ background: '#f5f5f7', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#8e8e93', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Ordenes
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1a2744' }}>
                OS-{String(os.numero).padStart(3, '0')}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: tipoInfo.bg, color: tipoInfo.color }}>
                {tipoInfo.label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: estadoInfo.bg, color: estadoInfo.color }}>
                {estadoInfo.label}
              </span>
              <span style={{ fontSize: 12, color: '#aeaeb2' }}>{fmtPeriodoOS(os)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 2 }}>
              {items.filter(i => !i._local).length} items cargados
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {/* Boton Resumen — visible siempre que haya items */}
            {tieneItems && (
              <button onClick={() => setShowResumen(true)}
                style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid #e5e5ea', background: '#fff', color: '#1a2744', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                Resumen
              </button>
            )}

            {esVigente && (
              <button onClick={handleGenerarHoy} disabled={publicando}
                style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: '#185fa5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {publicando ? '...' : 'Generar hoy'}
              </button>
            )}
            {esBorrador && tieneItems && (
              <button onClick={handleEnviarValidacion} disabled={publicando}
                style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: '#854f0b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {publicando ? '...' : 'Enviar a validacion'}
              </button>
            )}
            {os.estado === 'validacion' && (
              <div style={{ fontSize: 12, color: '#854f0b', background: '#faeeda', padding: '6px 12px', borderRadius: 8, fontWeight: 600 }}>
                Pendiente de aprobacion
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '20px 28px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#aeaeb2' }}>Cargando...</div>
        ) : (
          <OSItemPanel
            os={os}
            items={items}
            onItemsChange={fetchItems}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  )
}
