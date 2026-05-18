/**
 * AccesosAlcoholemiaPanel.jsx
 * Modal para gestionar quién accede a una OS de tipo alcoholemia.
 * Tipos de acceso: base, role, profile, area.
 */
import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

const ROLES = [
  { value: 'gerencia',             label: 'Gerencia operativa' },
  { value: 'director',             label: 'Director' },
  { value: 'jefe_base',            label: 'Jefe de base' },
  { value: 'jefe_cgm',             label: 'Jefe CGM' },
  { value: 'coordinador',          label: 'Coordinador de turno' },
  { value: 'coordinador_cgm',      label: 'Coordinador CGM' },
  { value: 'supervisor',           label: 'Supervisor' },
  { value: 'planeamiento',         label: 'Planeamiento' },
  { value: 'operador_adicionales', label: 'Operador adicionales' },
  { value: 'admin',                label: 'Administrador' },
  { value: 'agente',               label: 'Agente de tránsito' },
]

const TIPOS = [
  { id: 'base',    label: 'Base',    icon: '🏢', color: '#185fa5' },
  { id: 'role',    label: 'Rol',     icon: '👔', color: '#534ab7' },
  { id: 'profile', label: 'Usuario', icon: '👤', color: '#0f6e56' },
  { id: 'area',    label: 'Área',    icon: '🗂',  color: '#854f0b' },
]

export default function AccesosAlcoholemiaPanel({ osId, osNumero, onClose, readOnly }) {
  const [accesos, setAccesos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [bases,   setBases]   = useState([])
  const [areas,   setAreas]   = useState([])
  const [error,   setError]   = useState('')

  useEffect(() => { cargar() }, [osId])

  async function cargar() {
    setLoading(true)
    try {
      const [acc, bs, ar] = await Promise.all([
        api.get(`/api/os/${osId}/accesos`),
        api.get('/api/bases').catch(() => []),
        api.get('/api/profiles/areas').catch(() => []),
      ])
      setAccesos(Array.isArray(acc) ? acc : [])
      setBases(Array.isArray(bs) ? bs : [])
      setAreas(Array.isArray(ar) ? ar : [])
    } catch (e) { console.warn(e); setError('Error al cargar accesos') }
    setLoading(false)
  }

  async function handleAdd(tipo, valor) {
    setError('')
    try {
      await api.post(`/api/os/${osId}/accesos`, { tipo, valor })
      setShowAdd(false)
      await cargar()
    } catch (e) {
      setError(e.message || 'Error al agregar acceso')
    }
  }

  async function handleDelete(accesoId) {
    if (!confirm('¿Quitar este acceso? Quien dependía de él dejará de ver la OS.')) return
    try {
      await api.delete(`/api/os/accesos/${accesoId}`)
      await cargar()
    } catch (e) { setError(e.message || 'Error al quitar acceso') }
  }

  // Helpers para resolver el label legible de un acceso
  function labelDeAcceso(a) {
    if (a.tipo === 'role')    return ROLES.find(r => r.value === a.valor)?.label ?? a.valor
    if (a.tipo === 'base')    return bases.find(b => b.id === a.valor)?.nombre ?? a.valor
    if (a.tipo === 'area')    return a.valor
    if (a.tipo === 'profile') return a.profile_nombre ?? a.valor // se resuelve después si fuese necesario
    return a.valor
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
        zIndex: 400, backdropFilter: 'blur(3px)',
      }}/>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(560px, calc(100vw - 32px))', maxHeight: 'min(720px, calc(100vh - 60px))',
        background: '#fff', borderRadius: 18, zIndex: 401, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(15,23,42,0.4)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #6b21a8 0%, #7c3aed 100%)',
          padding: '18px 22px', color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                Acceso restringido · OS-{String(osNumero ?? '?').padStart(3, '0')}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.2px' }}>¿Quién puede ver esta OS?</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                Solo los usuarios listados (más admin/director) verán esta orden.
              </div>
            </div>
            <button onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 9, padding: '7px 9px', color: '#fff', cursor: 'pointer', display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 18, background: '#f9fafb' }}>
          {/* Add button / form */}
          {!readOnly && !showAdd && (
            <button onClick={() => setShowAdd(true)}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                border: '1.5px dashed #c4b5fd', background: '#faf5ff', color: '#6b21a8',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar acceso
            </button>
          )}

          {showAdd && (
            <AccesoForm
              bases={bases}
              areas={areas}
              onCancel={() => { setShowAdd(false); setError('') }}
              onAdd={handleAdd}
            />
          )}

          {error && (
            <div style={{ background: '#fce8e8', color: '#a32d2d', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#aeaeb2' }}>Cargando...</div>
          ) : accesos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🔒</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', marginBottom: 4 }}>Sin accesos cargados</div>
              <div style={{ fontSize: 12, color: '#8e8e93', maxWidth: 320, margin: '0 auto' }}>
                Mientras no agregues a nadie, solo admin y director van a ver esta OS.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {accesos.map(a => {
                const t = TIPOS.find(x => x.id === a.tipo)
                return (
                  <div key={a.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: '#fff', borderRadius: 10, border: '0.5px solid #e5e7eb',
                    }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${t?.color ?? '#636366'}1a`,
                      color: t?.color ?? '#636366',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0,
                    }}>
                      {t?.icon ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t?.color ?? '#636366', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t?.label ?? a.tipo}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {labelDeAcceso(a)}
                      </div>
                    </div>
                    {!readOnly && (
                      <button onClick={() => handleDelete(a.id)} title="Quitar"
                        style={{ background: '#fff', border: '0.5px solid #fecaca', color: '#a32d2d', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Form para agregar un acceso ──────────────────────────────
function AccesoForm({ bases, areas, onCancel, onAdd }) {
  const [tipo, setTipo]   = useState('role')
  const [valor, setValor] = useState('')
  const [busqUsuario, setBusqUsuario] = useState('')
  const [resultadosUsuarios, setResultadosUsuarios] = useState([])
  const [busy, setBusy]   = useState(false)
  const timer = useRef(null)

  function buscarUsuarios(q) {
    clearTimeout(timer.current)
    if (!q || q.length < 2) { setResultadosUsuarios([]); return }
    timer.current = setTimeout(async () => {
      try {
        const r = await api.get(`/api/profiles?busq=${encodeURIComponent(q)}&limit=10`)
        setResultadosUsuarios(Array.isArray(r) ? r : (r?.rows ?? []))
      } catch { setResultadosUsuarios([]) }
    }, 300)
  }

  async function submit(e) {
    e.preventDefault()
    if (!valor) return
    setBusy(true)
    await onAdd(tipo, valor)
    setBusy(false)
  }

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff',
    color: '#1a2744', boxSizing: 'border-box',
  }
  const lbl = { fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }

  return (
    <form onSubmit={submit}
      style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, border: '1.5px solid #c4b5fd' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#6b21a8', marginBottom: 14 }}>Agregar acceso</div>

      {/* Selector tipo (chips) */}
      <label style={lbl}>Tipo</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {TIPOS.map(t => (
          <button key={t.id} type="button"
            onClick={() => { setTipo(t.id); setValor(''); setBusqUsuario(''); setResultadosUsuarios([]) }}
            style={{
              flex: '1 1 0', minWidth: 0,
              padding: '8px 10px', borderRadius: 8,
              border: `1.5px solid ${tipo === t.id ? t.color : '#e5e7eb'}`,
              background: tipo === t.id ? `${t.color}14` : '#fff',
              color: tipo === t.id ? t.color : '#636366',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Selector valor */}
      <label style={lbl}>
        {tipo === 'role'    && 'Elegí el rol'}
        {tipo === 'base'    && 'Elegí la base'}
        {tipo === 'area'    && 'Elegí el área'}
        {tipo === 'profile' && 'Buscá el usuario por nombre o legajo'}
      </label>

      {tipo === 'role' && (
        <select value={valor} onChange={e => setValor(e.target.value)} style={inp} required>
          <option value="">— Seleccionar rol —</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      )}
      {tipo === 'base' && (
        <select value={valor} onChange={e => setValor(e.target.value)} style={inp} required>
          <option value="">— Seleccionar base —</option>
          {bases.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      )}
      {tipo === 'area' && (
        <select value={valor} onChange={e => setValor(e.target.value)} style={inp} required>
          <option value="">— Seleccionar área —</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      )}
      {tipo === 'profile' && (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={busqUsuario}
            onChange={e => { setBusqUsuario(e.target.value); buscarUsuarios(e.target.value); if (valor) setValor('') }}
            placeholder="Empezá a escribir nombre o legajo..."
            style={inp}
          />
          {resultadosUsuarios.length > 0 && !valor && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.15)', maxHeight: 220, overflow: 'auto', zIndex: 10 }}>
              {resultadosUsuarios.map(u => (
                <div key={u.id} onClick={() => { setValor(u.id); setBusqUsuario(`${u.nombre_completo} (${u.legajo ?? '—'})`); setResultadosUsuarios([]) }}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid #f0f0f5', fontSize: 13 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <div style={{ fontWeight: 600, color: '#1a2744' }}>{u.nombre_completo}</div>
                  <div style={{ fontSize: 11, color: '#8e8e93' }}>{u.legajo ? `Legajo ${u.legajo} · ` : ''}{u.role}{u.base_nombre ? ` · ${u.base_nombre}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botones */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button type="submit" disabled={!valor || busy}
          style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: valor && !busy ? '#6b21a8' : '#c4b5fd', color: '#fff', fontSize: 13, fontWeight: 700, cursor: valor && !busy ? 'pointer' : 'not-allowed' }}>
          {busy ? 'Agregando...' : 'Agregar acceso'}
        </button>
      </div>
    </form>
  )
}
