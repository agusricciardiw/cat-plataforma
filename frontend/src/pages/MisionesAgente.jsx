import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { SelectorImagenes } from '../components/PanelDetalle'

const ESTADOS = {
  asignado:    { label: 'Pendiente',    bg: '#faeeda', color: '#854f0b' },
  en_mision:   { label: 'En curso',     bg: '#e8f0fe', color: '#185fa5' },
  cerrada:     { label: 'Cerrada',      bg: '#e8faf2', color: '#0f6e56' },
  interrumpida:{ label: 'Interrumpida', bg: '#faeeda', color: '#854f0b' },
}
const MOTIVOS_RECHAZO = ['No puedo desplazarme a esa zona','Estoy finalizando otra tarea','Problema de salud o emergencia','Otro motivo']
const MOTIVOS_INTERRUPCION = ['No pude acceder al lugar','Situación resuelta antes de llegar','Fuerza mayor','Otro motivo']

function tiempoRelativo(fecha) {
  if (!fecha) return '—'
  const diff = Math.floor((Date.now() - new Date(fecha)) / 60000)
  if (diff < 1) return 'ahora'
  if (diff < 60) return `hace ${diff} min`
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`
  return `hace ${Math.floor(diff / 1440)} d`
}

function formatUbicacion(m) {
  if (!m) return '—'
  if (m.modo_ubicacion === 'altura')       return [m.calle, m.altura].filter(Boolean).join(' ')
  if (m.modo_ubicacion === 'interseccion') return [m.calle, m.calle2].filter(Boolean).join(' y ')
  if (m.modo_ubicacion === 'entre_calles') return `${m.calle} entre ${m.desde} y ${m.hasta}`
  if (m.modo_ubicacion === 'poligono')     return m.poligono_desc ?? ''
  return m.calle ?? '—'
}

// ── Detalle completo de una misión ────────────────────────────
function DetalleMision({ mision, onClose, onRefresh, isMobile }) {
  const { profile } = useAuth()
  const [view, setView]                     = useState('detalle')
  const [motivoRechazo, setMotivoRechazo]   = useState(null)
  const [notaRechazo, setNotaRechazo]       = useState('')
  const [motivoInterrupcion, setMotivoInterrupcion] = useState(null)
  const [notaInterrupcion, setNotaInterrupcion]     = useState('')
  const [observaciones, setObservaciones]   = useState('')
  const [imagenes, setImagenes]             = useState([])
  const [saving, setSaving]                 = useState(false)

  const agentes      = Array.isArray(mision.agentes) ? mision.agentes : []
  const miEntrada    = agentes.find(a => a.id === profile?.id)
  const soyEncargado = miEntrada?.es_encargado === true || agentes.length === 1
  const ubicacion    = formatUbicacion(mision)
  const estado       = ESTADOS[mision.estado_agente ?? mision.estado] ?? ESTADOS.asignado

  async function handleAceptar() {
    setSaving(true)
    try {
      await api.post(`/api/misiones/${mision.id}/aceptar`, {})
      onRefresh(); onClose()
    } catch (e) { console.warn('Error aceptando:', e) }
    setSaving(false)
  }

  async function handleInterrumpir() {
    if (!motivoInterrupcion) return
    setSaving(true)
    try {
      await api.post(`/api/misiones/${mision.id}/interrumpir`, {
        motivo: motivoInterrupcion + (notaInterrupcion ? ` — ${notaInterrupcion}` : ''),
      })
      onRefresh(); onClose()
    } catch (e) { console.warn('Error interrumpiendo:', e) }
    setSaving(false)
  }

  async function handleCerrar() {
    if (!observaciones.trim()) return
    setSaving(true)
    try {
      // Subir fotos si hay
      for (const img of imagenes) {
        if (!img.file) continue
        const formData = new FormData()
        formData.append('foto', img.file)
        try { await api.upload('/api/upload', formData) } catch (e) { console.warn('Error foto:', e) }
      }
      await api.post(`/api/misiones/${mision.id}/cerrar`, { observaciones })
      onRefresh(); onClose()
    } catch (e) { console.warn('Error cerrando:', e) }
    setSaving(false)
  }

  const contenido = (
    <>
      {view === 'detalle' && (
        <>
          <div style={{ background: '#f9f9fb', borderRadius: 12, padding: '2px 14px', marginBottom: 14, border: '0.5px solid #e5e5ea' }}>
            {[
              { label: 'Ubicación', val: ubicacion },
              { label: 'Base',      val: mision.base_nombre ?? '—' },
              { label: 'Turno',     val: mision.turno ?? '—' },
            ].map((r, i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #efefef' : 'none' }}>
                <span style={{ fontSize: 12, color: '#aeaeb2' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', textAlign: 'right', maxWidth: '65%' }}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Multi-agente: quiénes aceptaron */}
          {agentes.length > 1 && (
            <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#185fa5', marginBottom: 6 }}>
                Misión con {agentes.length} agentes · {soyEncargado ? 'sos el encargado' : 'no sos el encargado'}
              </div>
              {agentes.map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: a.aceptado_at ? '#0f6e56' : '#854f0b', marginBottom: 2 }}>
                  {a.aceptado_at ? '✓' : '⏳'} {a.nombre_completo}{a.es_encargado ? ' ★' : ''}
                </div>
              ))}
            </div>
          )}

          {mision.descripcion && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Descripción</div>
              <div style={{ fontSize: 13, color: '#3d3d3a', lineHeight: 1.6, background: '#f9f9fb', borderRadius: 10, padding: '10px 13px', border: '0.5px solid #e5e5ea' }}>{mision.descripcion}</div>
            </div>
          )}
        </>
      )}

      {view === 'rechazar' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', marginBottom: 3 }}>¿Por qué rechazás?</div>
          <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 14 }}>El motivo le llega a tu supervisor.</div>
          {MOTIVOS_RECHAZO.map((m, i) => (
            <div key={i} onClick={() => setMotivoRechazo(m)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 12, border: motivoRechazo === m ? '1.5px solid #a32d2d' : '1px solid #e5e5ea', background: motivoRechazo === m ? '#fce8e8' : '#fff', marginBottom: 8, cursor: 'pointer', fontSize: 13, color: '#1d1d1f' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: motivoRechazo === m ? '5px solid #a32d2d' : '1.5px solid #c7c7cc', flexShrink: 0 }}/>{m}
            </div>
          ))}
          <textarea value={notaRechazo} onChange={e => setNotaRechazo(e.target.value)} placeholder="Aclaración adicional (opcional)..." style={{ width: '100%', background: '#f9f9fb', border: '0.5px solid #e5e5ea', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 70, marginTop: 6, color: '#1d1d1f', boxSizing: 'border-box' }}/>
        </div>
      )}

      {view === 'interrumpir' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', marginBottom: 3 }}>Motivo de interrupción</div>
          <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 14 }}>Quedarás libre y la misión interrumpida.</div>
          {MOTIVOS_INTERRUPCION.map((m, i) => (
            <div key={i} onClick={() => setMotivoInterrupcion(m)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 12, border: motivoInterrupcion === m ? '1.5px solid #8e8e93' : '1px solid #e5e5ea', background: motivoInterrupcion === m ? '#f5f5f7' : '#fff', marginBottom: 8, cursor: 'pointer', fontSize: 13, color: '#1d1d1f' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: motivoInterrupcion === m ? '5px solid #8e8e93' : '1.5px solid #c7c7cc', flexShrink: 0 }}/>{m}
            </div>
          ))}
          <textarea value={notaInterrupcion} onChange={e => setNotaInterrupcion(e.target.value)} placeholder="Detalle adicional (opcional)..." style={{ width: '100%', background: '#f9f9fb', border: '0.5px solid #e5e5ea', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 70, marginTop: 6, color: '#1d1d1f', boxSizing: 'border-box' }}/>
        </div>
      )}

      {view === 'cerrar' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', marginBottom: 3 }}>Reporte de cierre</div>
          <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 12 }}>Contá qué encontraste y qué hiciste.</div>
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Describí la situación..." style={{ width: '100%', background: '#f9f9fb', border: '0.5px solid #e5e5ea', borderRadius: 10, padding: '11px 13px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 100, color: '#1d1d1f', boxSizing: 'border-box' }}/>
          <SelectorImagenes imagenes={imagenes} onChange={setImagenes} />
        </div>
      )}
    </>
  )

  const acciones = (
    <>
      {view === 'detalle' && mision.estado === 'asignada' && (
        <>
          <button onClick={handleAceptar} disabled={saving} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#0f6e56', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
            {saving ? 'Procesando...' : '✓ Aceptar misión'}
          </button>
          <button onClick={() => setView('rechazar')} style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Rechazar
          </button>
        </>
      )}
      {view === 'detalle' && mision.estado === 'en_mision' && (
        <>
          {soyEncargado ? (
            <>
              <button onClick={() => setView('cerrar')} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#1a2744', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                Cerrar misión ✓
              </button>
              <button onClick={() => setView('interrumpir')} style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Interrumpir
              </button>
            </>
          ) : (
            <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#185fa5', fontWeight: 600, textAlign: 'center' }}>
              En curso · el encargado gestiona el cierre
            </div>
          )}
        </>
      )}
      {view === 'detalle' && mision.estado === 'cerrada' && (
        <div style={{ textAlign: 'center', fontSize: 13, color: '#0f6e56', fontWeight: 700 }}>✓ Misión cerrada</div>
      )}
      {view === 'rechazar' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('detalle')} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => { /* TODO: endpoint rechazar */ onClose() }} disabled={!motivoRechazo} style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: motivoRechazo ? '#a32d2d' : '#e5e5ea', color: motivoRechazo ? '#fff' : '#c7c7cc', fontSize: 13, fontWeight: 700, cursor: motivoRechazo ? 'pointer' : 'not-allowed' }}>
            Confirmar rechazo
          </button>
        </div>
      )}
      {view === 'interrumpir' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('detalle')} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleInterrumpir} disabled={!motivoInterrupcion || saving} style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: motivoInterrupcion ? '#854f0b' : '#e5e5ea', color: motivoInterrupcion ? '#fff' : '#c7c7cc', fontSize: 13, fontWeight: 700, cursor: motivoInterrupcion ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Guardando...' : 'Confirmar interrupción'}
          </button>
        </div>
      )}
      {view === 'cerrar' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('detalle')} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleCerrar} disabled={!observaciones.trim() || saving} style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: observaciones.trim() ? '#1a2744' : '#e5e5ea', color: observaciones.trim() ? '#fff' : '#c7c7cc', fontSize: 13, fontWeight: 700, cursor: observaciones.trim() ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Cerrando...' : 'Cerrar misión ✓'}
          </button>
        </div>
      )}
    </>
  )

  if (isMobile) return (
    <div style={{ position: 'fixed', inset: 0, background: '#f5f5f7', zIndex: 200, display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: '#1a2744', padding: '48px 18px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>{mision.tipo === 'mision' ? 'Misión' : 'Servicio'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: (ESTADOS[mision.estado] ?? ESTADOS.asignado).bg, color: (ESTADOS[mision.estado] ?? ESTADOS.asignado).color }}>
                {(ESTADOS[mision.estado] ?? ESTADOS.asignado).label}
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.2 }}>{mision.titulo}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff', padding: '7px 12px', flexShrink: 0, fontSize: 13, fontWeight: 600 }}>
            ← Volver
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 0' }}>{contenido}</div>
      <div style={{ padding: '12px 16px 28px', background: '#fff', borderTop: '0.5px solid #e5e5ea', flexShrink: 0 }}>{acciones}</div>
    </div>
  )

  return (
    <div style={{ width: 400, flexShrink: 0, padding: '12px 16px 12px 8px', background: '#f5f5f7', borderLeft: '0.5px solid #e5e5ea', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #e0e0e8', boxShadow: '0 4px 24px rgba(26,39,68,0.08)', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px 14px', borderBottom: '0.5px solid #f2f2f7', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#534ab7', textTransform: 'uppercase' }}>{mision.tipo === 'mision' ? 'Misión' : 'Servicio'}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: (ESTADOS[mision.estado] ?? ESTADOS.asignado).bg, color: (ESTADOS[mision.estado] ?? ESTADOS.asignado).color }}>
                  {(ESTADOS[mision.estado] ?? ESTADOS.asignado).label}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.3px', lineHeight: 1.25 }}>{mision.titulo}</div>
            </div>
            <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#8e8e93', padding: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px' }}>{contenido}</div>
        <div style={{ padding: '12px 18px 16px', borderTop: '0.5px solid #f2f2f7', flexShrink: 0 }}>{acciones}</div>
      </div>
    </div>
  )
}

// ── Card de misión ────────────────────────────────────────────
function CardMision({ mision, onClick }) {
  const estado = ESTADOS[mision.estado] ?? ESTADOS.asignado
  const ubicacion = formatUbicacion(mision)
  return (
    <div onClick={() => onClick(mision)}
      style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e5e5ea', padding: '15px 16px', marginBottom: 10, cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#534ab7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {mision.tipo === 'mision' ? 'Misión' : 'Servicio'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: estado.bg, color: estado.color }}>{estado.label}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', marginBottom: 4, letterSpacing: '-0.3px' }}>{mision.titulo}</div>
      {ubicacion && <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 6 }}>{ubicacion}</div>}
      <div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 10 }}>Turno {mision.turno ?? '—'} · {mision.base_nombre ?? '—'}</div>
      {mision.estado === 'asignada' && (
        <div style={{ display: 'flex', gap: 7 }}>
          <div style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1px solid #e5e5ea', color: '#8e8e93', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Rechazar</div>
          <div style={{ flex: 2, padding: '9px', borderRadius: 10, background: '#0f6e56', color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>✓ Aceptar</div>
        </div>
      )}
      {mision.estado === 'en_mision' && (
        <div style={{ padding: '9px', borderRadius: 10, background: '#e8f0fe', color: '#185fa5', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>En curso · Tocá para gestionar</div>
      )}
      {mision.estado === 'cerrada' && (
        <div style={{ padding: '9px', borderRadius: 10, background: '#e8faf2', color: '#0f6e56', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>✓ Cerrada · {tiempoRelativo(mision.updated_at)}</div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function MisionesAgente() {
  const { profile, signOut } = useAuth()
  const [misiones, setMisiones]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => { if (profile) fetchMisiones() }, [profile])

  async function fetchMisiones() {
    setLoading(true)
    try {
      const data = await api.get('/api/misiones/mias')
      setMisiones(data ?? [])
      if (selected) {
        const updated = (data ?? []).find(m => m.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch (e) {
      console.warn('Error cargando misiones del agente:', e)
    }
    setLoading(false)
  }

  const pendientes  = misiones.filter(m => m.estado === 'asignada')
  const en_mision   = misiones.filter(m => m.estado === 'en_mision')
  const historial   = misiones.filter(m => m.estado === 'cerrada' || m.estado === 'interrumpida')
  const initials    = (profile?.nombre_completo ?? '').split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase() || '?'

  const stats = (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
      {[
        { label: 'Pendientes', val: pendientes.length, bg: '#faeeda', color: '#854f0b' },
        { label: 'En curso',   val: en_mision.length,  bg: '#e8f0fe', color: '#185fa5' },
        { label: 'Cerradas',   val: historial.filter(m => m.estado === 'cerrada').length, bg: '#e8faf2', color: '#0f6e56' },
      ].map((s, i) => (
        <div key={i} style={{ flex: 1, background: s.bg, borderRadius: 14, padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
          <div style={{ fontSize: 11, color: s.color, opacity: 0.75, marginTop: 4, fontWeight: 600 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )

  const listado = loading ? (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#aeaeb2' }}>Cargando misiones...</div>
  ) : !misiones.length ? (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', marginBottom: 4 }}>Sin misiones pendientes</div>
      <div style={{ fontSize: 13, color: '#aeaeb2' }}>Tu supervisor te asignará misiones cuando las haya</div>
    </div>
  ) : (
    <>
      {en_mision.length > 0 && (
        <><div style={{ fontSize: 11, fontWeight: 700, color: '#185fa5', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>En curso</div>
        {en_mision.map(m => <CardMision key={m.id} mision={m} onClick={setSelected} />)}<div style={{ height: 14 }}/></>
      )}
      {pendientes.length > 0 && (
        <><div style={{ fontSize: 11, fontWeight: 700, color: '#854f0b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Pendientes de aceptar</div>
        {pendientes.map(m => <CardMision key={m.id} mision={m} onClick={setSelected} />)}<div style={{ height: 14 }}/></>
      )}
      {historial.length > 0 && (
        <><div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Historial de hoy</div>
        {historial.map(m => <CardMision key={m.id} mision={m} onClick={setSelected} />)}</>
      )}
    </>
  )

  // ── Mobile ────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', maxWidth: 430, margin: '0 auto', position: 'relative' }}>
      <div style={{ background: '#1a2744', paddingTop: 48 }}>
        <div style={{ padding: '0 18px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 26, height: 26, background: '#f5c800', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#1a2744' }}>BA</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Plataforma CAT</span>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5c800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#1a2744' }}>{initials}</div>
        </div>
        <div style={{ padding: '0 18px 22px' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: 10 }}>{profile?.nombre_completo ?? '—'}</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}>
              Agente · {profile?.base_nombre ?? '—'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'rgba(78,205,196,0.2)', color: '#4ecdc4' }}>
              Turno {profile?.turno ?? '—'}
            </span>
          </div>
        </div>
        <div style={{ background: '#f5f5f7', borderRadius: '22px 22px 0 0', padding: '20px 16px 90px' }}>
          {stats}
          {listado}
        </div>
      </div>
      {selected && (
        <DetalleMision mision={selected} onClose={() => setSelected(null)} onRefresh={() => { fetchMisiones(); setSelected(null) }} isMobile />
      )}
    </div>
  )

  // ── Desktop ───────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: '#f5f5f7', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: '#1a2744', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: '#f5c800', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#1a2744' }}>BA</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Plataforma CAT</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>GCBA</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{profile?.nombre_completo} · Legajo {profile?.legajo}</span>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '18px 44px 16px', borderBottom: '0.5px solid #e5e5ea', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.7px', marginBottom: 3 }}>Mis misiones</div>
            <div style={{ fontSize: 13, color: '#aeaeb2' }}>
              Agente · {profile?.base_nombre ?? '—'} · Turno {profile?.turno ?? '—'} · Legajo {profile?.legajo ?? '—'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>{stats}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, padding: '20px 44px', overflow: 'auto' }}>{listado}</div>
        {selected && (
          <DetalleMision mision={selected} onClose={() => setSelected(null)} onRefresh={() => { fetchMisiones(); setSelected(null) }} isMobile={false} />
        )}
      </div>
    </div>
  )
}
