import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const ESTADO_TURNO = {
  libre:       { label: 'Libre',        bg: '#e8faf2', color: '#0f6e56' },
  en_mision:   { label: 'En misión',    bg: '#faeeda', color: '#854f0b' },
  fuera_turno: { label: 'Fuera turno',  bg: '#f5f5f7', color: '#aeaeb2' },
}

function Initials({ nombre, size = 38 }) {
  const partes = (nombre ?? '').split(' ')
  const ini = partes.length >= 2
    ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
    : (partes[0]?.[0] ?? '?').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#eeedf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 700, color: '#3c3489', flexShrink: 0 }}>
      {ini}
    </div>
  )
}

function AgenteRow({ agente, selected, onToggle }) {
  const est      = ESTADO_TURNO[agente.estado_turno] ?? ESTADO_TURNO.fuera_turno
  const bloqueado = agente.estado_turno === 'fuera_turno'

  return (
    <div
      onClick={() => !bloqueado && onToggle(agente)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 13px', borderRadius: 12, marginBottom: 6, border: selected ? '1.5px solid #1a2744' : '1px solid #e5e5ea', background: selected ? '#f0f4ff' : bloqueado ? '#fafafa' : '#fff', cursor: bloqueado ? 'not-allowed' : 'pointer', opacity: bloqueado ? 0.5 : 1 }}
    >
      <Initials nombre={agente.nombre_completo} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{agente.nombre_completo}</div>
        <div style={{ fontSize: 12, color: '#8e8e93' }}>Legajo {agente.legajo} · Turno {agente.turno ?? '—'}</div>
        {agente.mision_actual && (
          <div style={{ fontSize: 11, color: '#854f0b', marginTop: 2 }}>
            En misión: {agente.mision_actual}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 10, background: est.bg, color: est.color, flexShrink: 0 }}>{est.label}</span>
      {!bloqueado && (
        <div style={{ width: 20, height: 20, borderRadius: 6, border: selected ? 'none' : '1.5px solid #d1d1d6', background: selected ? '#1a2744' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {selected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
      )}
    </div>
  )
}

function SelectorEncargado({ agentes, encargadoId, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        Encargado de la misión
      </div>
      <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div style={{ fontSize: 12, color: '#185fa5', lineHeight: 1.5 }}>
          El encargado es el único que puede cerrar la misión desde su app.
        </div>
      </div>
      {agentes.map(a => {
        const esEncargado = encargadoId === a.id
        return (
          <div key={a.id} onClick={() => onChange(a.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, marginBottom: 6, border: esEncargado ? '2px solid #1a2744' : '1px solid #e5e5ea', background: esEncargado ? '#f0f4ff' : '#fff', cursor: 'pointer' }}>
            <Initials nombre={a.nombre_completo} size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{a.nombre_completo}</div>
              <div style={{ fontSize: 11, color: '#8e8e93' }}>Legajo {a.legajo}</div>
            </div>
            {esEncargado ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a2744', borderRadius: 8, padding: '4px 10px' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f5c800" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Encargado</span>
              </div>
            ) : (
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #d1d1d6', flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ModalReasignacion({ agentesOcupados, onCancelar, onConfirmar, saving }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 20, padding: 24, zIndex: 501, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#faeeda', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#854f0b" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>
          {agentesOcupados.length === 1 ? 'Este agente ya está en misión' : 'Algunos agentes ya están en misión'}
        </div>
        <div style={{ background: '#f9f9fb', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
          {agentesOcupados.map((a, i) => (
            <div key={i} style={{ fontSize: 13, fontWeight: 600, color: '#854f0b', padding: '4px 0' }}>
              {a.nombre_completo}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: '#5d5d5a', background: '#fce8e8', borderRadius: 10, padding: '10px 13px', marginBottom: 20, lineHeight: 1.6 }}>
          <strong style={{ color: '#a32d2d' }}>Atención:</strong> La misión actual se interrumpirá al confirmar.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancelar} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onConfirmar} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: '#854f0b', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'Procesando...' : 'Confirmar reasignación'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function SheetAsignacion({ mision, onClose, onAsignado }) {
  const { profile } = useAuth()
  const [agentes, setAgentes]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [seleccionados, setSeleccionados] = useState([])
  const [encargadoId, setEncargadoId]   = useState(null)
  const [nota, setNota]                 = useState('')
  const [saving, setSaving]             = useState(false)
  const [paso, setPaso]                 = useState(1)
  const [showReasignacion, setShowReasignacion] = useState(false)

  useEffect(() => { fetchAgentes() }, [])

  useEffect(() => {
    if (seleccionados.length === 1) {
      setEncargadoId(seleccionados[0].id)
    } else if (seleccionados.length > 1 && !seleccionados.find(a => a.id === encargadoId)) {
      setEncargadoId(seleccionados[0].id)
    } else if (seleccionados.length === 0) {
      setEncargadoId(null)
    }
  }, [seleccionados])

  async function fetchAgentes() {
    setLoading(true)
    try {
      // Traer todos los agentes de la base (o todos si es gerencia)
      const params = new URLSearchParams({ role: 'agente' })
      if (profile?.role !== 'gerencia' && profile?.role !== 'admin' && profile?.base_id) {
        params.append('base_id', profile.base_id)
      }
      const data = await api.get(`/api/profiles?${params.toString()}`)

      // Enriquecer con misión actual si están en misión
      const enMision = data.filter(a => a.estado_turno === 'en_mision')
      if (enMision.length > 0) {
        try {
          const hoy = new Date().toISOString().split('T')[0]
          const misiones = await api.get(`/api/misiones?fecha=${hoy}&estado=en_mision`)
          const mapaAgenteMision = {}
          for (const m of misiones) {
            for (const ag of (m.agentes ?? [])) {
              mapaAgenteMision[ag.id] = m.titulo
            }
          }
          setAgentes(data.map(a => ({ ...a, mision_actual: mapaAgenteMision[a.id] ?? null })))
        } catch {
          setAgentes(data)
        }
      } else {
        setAgentes(data)
      }
    } catch (e) {
      console.warn('Error cargando agentes:', e)
    }
    setLoading(false)
  }

  function toggleAgente(agente) {
    setSeleccionados(prev => {
      const existe = prev.find(a => a.id === agente.id)
      return existe ? prev.filter(a => a.id !== agente.id) : [...prev, agente]
    })
  }

  function handleSiguiente() {
    if (!seleccionados.length) return
    const ocupados = seleccionados.filter(a => a.estado_turno === 'en_mision')
    if (ocupados.length > 0) setShowReasignacion(true)
    else if (seleccionados.length >= 2) setPaso(2)
    else ejecutarAsignacion()
  }

  async function ejecutarAsignacion() {
    setSaving(true)
    try {
      await api.post(`/api/misiones/${mision.id}/asignar`, {
        agente_ids: seleccionados.map(a => a.id),
        encargado_id: encargadoId,
        nota: nota || null,
      })
      setShowReasignacion(false)
      onAsignado()
    } catch (e) {
      console.warn('Error asignando:', e)
      alert('Error al asignar. Revisá la consola.')
    }
    setSaving(false)
  }

  const libres      = agentes.filter(a => a.estado_turno === 'libre')
  const en_mision   = agentes.filter(a => a.estado_turno === 'en_mision')
  const fuera_turno = agentes.filter(a => a.estado_turno === 'fuera_turno')
  const agentesOcupados = seleccionados.filter(a => a.estado_turno === 'en_mision')
  const necesitaEncargado = seleccionados.length >= 2

  const labelBoton = !seleccionados.length
    ? 'Seleccioná al menos un agente'
    : seleccionados.length === 1
      ? `Asignar a ${seleccionados[0].nombre_completo} →`
      : `Asignar ${seleccionados.length} agentes →`

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 560, background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 301, display: 'flex', flexDirection: 'column', maxHeight: '85vh', boxShadow: '0 -4px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e5ea' }}/>
        </div>

        {/* ── PASO 1: Seleccionar agentes ── */}
        {paso === 1 && (
          <>
            <div style={{ padding: '14px 20px 12px', borderBottom: '0.5px solid #f5f5f7' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2744' }}>Asignar misión</div>
                  {seleccionados.length > 0 && (
                    <div style={{ fontSize: 12, color: '#185fa5', fontWeight: 600, marginTop: 2 }}>
                      {seleccionados.length} seleccionado{seleccionados.length > 1 ? 's' : ''}
                      {agentesOcupados.length > 0 && <span style={{ color: '#854f0b', marginLeft: 6 }}>· {agentesOcupados.length} en otra misión</span>}
                    </div>
                  )}
                </div>
                <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: 8, padding: '5px 11px', cursor: 'pointer', color: '#8e8e93', fontSize: 13, fontWeight: 600 }}>Cancelar</button>
              </div>
              <div style={{ fontSize: 13, color: '#8e8e93' }}>{mision.titulo}</div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#aeaeb2', fontSize: 14 }}>Cargando agentes...</div>
              ) : (
                <>
                  {libres.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0f6e56', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Disponibles ({libres.length})</div>
                      {libres.map(a => <AgenteRow key={a.id} agente={a} selected={!!seleccionados.find(s => s.id === a.id)} onToggle={toggleAgente} />)}
                      <div style={{ height: 14 }}/>
                    </>
                  )}
                  {en_mision.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#854f0b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>En misión ({en_mision.length})</div>
                      {en_mision.map(a => <AgenteRow key={a.id} agente={a} selected={!!seleccionados.find(s => s.id === a.id)} onToggle={toggleAgente} />)}
                      <div style={{ height: 14 }}/>
                    </>
                  )}
                  {fuera_turno.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Fuera de turno ({fuera_turno.length})</div>
                      {fuera_turno.map(a => <AgenteRow key={a.id} agente={a} selected={false} onToggle={() => {}} />)}
                    </>
                  )}
                  {!agentes.length && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#aeaeb2', fontSize: 14 }}>No hay agentes en esta base</div>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: '12px 20px 24px', borderTop: '0.5px solid #f5f5f7' }}>
              <textarea
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Nota para los agentes (opcional)..."
                style={{ width: '100%', background: '#f9f9fb', border: '0.5px solid #e5e5ea', borderRadius: 11, padding: '10px 13px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 52, color: '#1d1d1f', boxSizing: 'border-box', marginBottom: 10 }}
              />
              <button
                onClick={handleSiguiente}
                disabled={!seleccionados.length}
                style={{ width: '100%', padding: '13px', borderRadius: 13, border: 'none', background: seleccionados.length > 0 ? '#1a2744' : '#e5e5ea', color: seleccionados.length > 0 ? '#fff' : '#c7c7cc', fontSize: 15, fontWeight: 700, cursor: seleccionados.length > 0 ? 'pointer' : 'not-allowed' }}
              >
                {labelBoton}
              </button>
            </div>
          </>
        )}

        {/* ── PASO 2: Elegir encargado (solo si hay 2+) ── */}
        {paso === 2 && (
          <>
            <div style={{ padding: '16px 20px 12px', borderBottom: '0.5px solid #f5f5f7' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2744', marginBottom: 3 }}>Elegir encargado</div>
              <div style={{ fontSize: 13, color: '#8e8e93' }}>Seleccioná quién dirige la misión</div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              <SelectorEncargado agentes={seleccionados} encargadoId={encargadoId} onChange={setEncargadoId} />

              <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Misión</div>
              <div style={{ background: '#f9f9fb', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', marginBottom: 3 }}>{mision.titulo}</div>
                <div style={{ fontSize: 12, color: '#8e8e93' }}>{mision.turno} · {mision.base_nombre}</div>
              </div>

              {nota && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Nota</div>
                  <div style={{ background: '#f9f9fb', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#3d3d3a', lineHeight: 1.5 }}>{nota}</div>
                </>
              )}
            </div>

            <div style={{ padding: '12px 20px 24px', borderTop: '0.5px solid #f5f5f7', display: 'flex', gap: 8 }}>
              <button onClick={() => setPaso(1)} style={{ flex: 1, padding: '13px', borderRadius: 13, border: '1px solid #e5e5ea', background: '#fff', color: '#8e8e93', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Cambiar</button>
              <button
                onClick={ejecutarAsignacion}
                disabled={saving || !encargadoId}
                style={{ flex: 2, padding: '13px', borderRadius: 13, border: 'none', background: !encargadoId ? '#e5e5ea' : '#0f6e56', color: !encargadoId ? '#c7c7cc' : '#fff', fontSize: 15, fontWeight: 700, cursor: !encargadoId ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Asignando...' : 'Confirmar asignación ✓'}
              </button>
            </div>
          </>
        )}
      </div>

      {showReasignacion && (
        <ModalReasignacion
          agentesOcupados={agentesOcupados}
          onCancelar={() => setShowReasignacion(false)}
          onConfirmar={ejecutarAsignacion}
          saving={saving}
        />
      )}
    </>
  )
}
