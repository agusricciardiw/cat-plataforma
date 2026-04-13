import { useEffect, useState, useRef } from 'react'
import api from '../lib/api'

const TIPOS_CONFIG = {
  mision_asignada:     { icon: '📋', color: '#854f0b', bg: '#faeeda' },
  mision_aceptada:     { icon: '✓',  color: '#0f6e56', bg: '#e8faf2' },
  mision_rechazada:    { icon: '✕',  color: '#a32d2d', bg: '#fce8e8' },
  mision_en_curso:     { icon: '▶',  color: '#185fa5', bg: '#e8f0fe' },
  mision_cerrada:      { icon: '★',  color: '#0f6e56', bg: '#e8faf2' },
  mision_interrumpida: { icon: '⚠',  color: '#aeaeb2', bg: '#f5f5f7' },
  mision_creada:       { icon: '＋',  color: '#185fa5', bg: '#e8f0fe' },
  agente_reasignado:   { icon: '↔',  color: '#534ab7', bg: '#eeedf8' },
  agente_liberado:     { icon: '○',  color: '#aeaeb2', bg: '#f5f5f7' },
}

function tiempoRelativo(fecha) {
  if (!fecha) return ''
  const diff = Math.floor((Date.now() - new Date(fecha)) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function ItemActividad({ item, onClick }) {
  const cfg = TIPOS_CONFIG[item.tipo] ?? { icon: '·', color: '#8e8e93', bg: '#f5f5f7' }
  const esMisionLink = !!item.mision_id
  return (
    <div
      onClick={() => esMisionLink && onClick && onClick(item)}
      style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '0.5px solid #f5f5f7', cursor: esMisionLink ? 'pointer' : 'default', transition: 'background 0.1s' }}
      onMouseEnter={e => esMisionLink && (e.currentTarget.style.background = '#fafafa')}
      onMouseLeave={e => esMisionLink && (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#1d1d1f', lineHeight: 1.45, marginBottom: 2 }}>{item.descripcion}</div>
        {item.mision_titulo && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f5f5f7', borderRadius: 6, padding: '2px 7px', marginTop: 2 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" style={{width:9,height:9}}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            <span style={{ fontSize: 10, color: '#8e8e93', fontWeight: 600 }}>{item.mision_titulo}</span>
          </div>
        )}
        <div style={{ fontSize: 10, color: '#c7c7cc', marginTop: 4 }}>
          {tiempoRelativo(item.created_at)}
          {item.nombre_completo && <span style={{ marginLeft: 6, color: '#d1d1d6' }}>· {item.nombre_completo}</span>}
        </div>
      </div>
      {esMisionLink && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d1d1d6" strokeWidth="2" style={{width:12,height:12,flexShrink:0,marginTop:8}}><polyline points="9 18 15 12 9 6"/></svg>}
    </div>
  )
}

export default function FeedActividad({ onSelectMision, rolUsuario, modoSheet = false, onNuevosChange, socketRef }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevos, setNuevos]  = useState(0)
  const listRef = useRef(null)
  const esSupervisorOSuperior = ['gerencia', 'jefe_base', 'coordinador', 'supervisor', 'admin'].includes(rolUsuario)

  useEffect(() => {
    if (!esSupervisorOSuperior) return
    fetchActividad()

    // Realtime via Socket.io
    const socket = socketRef?.current
    if (socket) {
      socket.on('actividad:nueva', (evento) => {
        setItems(prev => [evento, ...prev.slice(0, 49)])
        setNuevos(n => n + 1)
      })
      return () => socket.off('actividad:nueva')
    }
  }, [])

  useEffect(() => {
    if (onNuevosChange) onNuevosChange(nuevos)
  }, [nuevos])

  async function fetchActividad() {
    setLoading(true)
    try {
      const data = await api.get('/api/actividad?limite=50')
      setItems(data ?? [])
    } catch (e) {
      console.warn('Error cargando actividad:', e)
    }
    setLoading(false)
  }

  async function handleClick(item) {
    if (!item.mision_id || !onSelectMision) return
    try {
      const mision = await api.get(`/api/misiones/${item.mision_id}`)
      if (mision) onSelectMision(mision)
    } catch (e) {
      console.warn('Error cargando misión desde actividad:', e)
    }
    setNuevos(0)
  }

  if (!esSupervisorOSuperior) return null

  if (modoSheet) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={listRef} style={{ flex: 1, overflow: 'auto', scrollbarWidth: 'none' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#aeaeb2', fontSize: 13 }}>Cargando...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 14px', color: '#aeaeb2' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>Sin actividad aún</div>
            <div style={{ fontSize: 12 }}>Las acciones aparecerán acá en tiempo real</div>
          </div>
        ) : items.map(item => <ItemActividad key={item.id} item={item} onClick={handleClick} />)}
      </div>
    </div>
  )

  return (
    <div style={{ width: 280, flexShrink: 0, borderLeft: '0.5px solid #e5e5ea', display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      <div style={{ padding: '14px 14px 12px', borderBottom: '0.5px solid #f2f2f7', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>Actividad</div>
            {nuevos > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#e24b4a', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>{nuevos}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30b86b' }}/>
            <span style={{ fontSize: 10, color: '#8e8e93', fontWeight: 600 }}>EN VIVO</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 2 }}>Acciones del sistema en tiempo real</div>
      </div>
      <div ref={listRef} style={{ flex: 1, overflow: 'auto', scrollbarWidth: 'none' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#aeaeb2', fontSize: 13 }}>Cargando...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 14px', color: '#aeaeb2' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>Sin actividad aún</div>
            <div style={{ fontSize: 12 }}>Las acciones del sistema aparecerán acá en tiempo real</div>
          </div>
        ) : items.map(item => <ItemActividad key={item.id} item={item} onClick={handleClick} />)}
      </div>
    </div>
  )
}
