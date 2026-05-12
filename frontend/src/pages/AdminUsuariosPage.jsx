import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import AppShell from '../components/AppShell'

// Colores predefinidos para nuevos roles
const PALETTE = [
  { color: '#0369a1', bg: '#e0f2fe' },
  { color: '#0f6e56', bg: '#e8faf2' },
  { color: '#6d28d9', bg: '#f0ebff' },
  { color: '#c47f00', bg: '#fffbe6' },
  { color: '#b91c1c', bg: '#fef2f2' },
  { color: '#4338ca', bg: '#eef2ff' },
  { color: '#854f0b', bg: '#fff8e6' },
  { color: '#0e7490', bg: '#e0f8ff' },
  { color: '#15803d', bg: '#f0fdf4' },
  { color: '#9333ea', bg: '#faf5ff' },
  { color: '#be185d', bg: '#fdf2f8' },
  { color: '#1d4ed8', bg: '#eff6ff' },
]

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
}

// ── Modal Nuevo Rol ──────────────────────────────────────────────
function ModalNuevoRol({ roles, onClose, onCreado }) {
  const [label,       setLabel]      = useState('')
  const [key,         setKey]        = useState('')
  const [keyManual,   setKeyManual]  = useState(false)
  const [descripcion, setDesc]       = useState('')
  const [colorIdx,    setColorIdx]   = useState(0)
  const [clonarDe,    setClonarDe]   = useState('')
  const [guardando,   setGuardando]  = useState(false)
  const [error,       setError]      = useState(null)

  function onLabelChange(v) {
    setLabel(v)
    if (!keyManual) setKey(slugify(v))
  }

  async function crear() {
    setError(null)
    if (!label.trim()) return setError('El nombre es requerido')
    if (!key.trim())   return setError('El identificador es requerido')
    setGuardando(true)
    try {
      const { color, bg } = PALETTE[colorIdx]
      const nuevo = await api.post('/api/roles', {
        key, label: label.trim(), descripcion: descripcion.trim(), color, bg,
        clonar_de: clonarDe || undefined,
      })
      onCreado(nuevo)
      onClose()
    } catch (e) {
      setError(e.message || 'Error al crear el rol')
    } finally {
      setGuardando(false)
    }
  }

  const rolesParaClonar = roles.filter(r => r.key !== 'admin')
  const { color, bg } = PALETTE[colorIdx]

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a2744, #243561)', padding: '22px 28px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Nuevo rol</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Crear rol personalizado</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Podés copiarlo desde otro rol y luego ajustar los permisos</div>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Nombre */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6 }}>Nombre del rol *</label>
            <input
              value={label}
              onChange={e => onLabelChange(e.target.value)}
              placeholder="ej: Subjefe CGM"
              autoFocus
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e0e4ed', fontSize: 14, color: '#1d1d1f', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#1a2744'}
              onBlur={e  => e.target.style.borderColor = '#e0e4ed'}
            />
            {/* Preview badge */}
            {label && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#aeaeb2' }}>Vista previa:</span>
                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, background: bg, color, fontSize: 12, fontWeight: 700 }}>{label}</span>
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 8 }}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PALETTE.map((p, i) => (
                <button key={i} onClick={() => setColorIdx(i)}
                  style={{
                    width: 28, height: 28, borderRadius: 8, border: colorIdx === i ? `3px solid ${p.color}` : '2px solid transparent',
                    background: p.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    outline: colorIdx === i ? `2px solid ${p.color}` : 'none', outlineOffset: 1,
                  }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: p.color }} />
                </button>
              ))}
            </div>
          </div>

          {/* Identificador (key) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6 }}>
              Identificador interno
              <span style={{ fontWeight: 400, marginLeft: 6, color: '#aeaeb2' }}>(se genera automáticamente)</span>
            </label>
            <input
              value={key}
              onChange={e => { setKey(e.target.value); setKeyManual(true) }}
              placeholder="subjefe_cgm"
              style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e0e4ed', fontSize: 13, color: '#636366', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#1a2744'}
              onBlur={e  => e.target.style.borderColor = '#e0e4ed'}
            />
            <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 4 }}>Solo minúsculas, números y guión bajo. No se puede cambiar después.</div>
          </div>

          {/* Descripción */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6 }}>Descripción <span style={{ fontWeight: 400, color: '#aeaeb2' }}>(opcional)</span></label>
            <input
              value={descripcion}
              onChange={e => setDesc(e.target.value)}
              placeholder="ej: Asistente del Jefe CGM con permisos reducidos"
              style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e0e4ed', fontSize: 13, color: '#1d1d1f', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#1a2744'}
              onBlur={e  => e.target.style.borderColor = '#e0e4ed'}
            />
          </div>

          {/* Copiar permisos de */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6 }}>
              Copiar permisos de
              <span style={{ fontWeight: 400, marginLeft: 6, color: '#aeaeb2' }}>(opcional — ajustás después en "Permisos por rol")</span>
            </label>
            <select
              value={clonarDe}
              onChange={e => setClonarDe(e.target.value)}
              style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e0e4ed', fontSize: 13, color: clonarDe ? '#1d1d1f' : '#aeaeb2', background: '#fff', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
              <option value="">— Sin copiar (empezar vacío) —</option>
              {rolesParaClonar.map(r => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            {clonarDe && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#0369a1', background: '#e0f2fe', padding: '6px 10px', borderRadius: 8 }}>
                ✓ Los permisos de <strong>{roles.find(r=>r.key===clonarDe)?.label}</strong> se copiarán al nuevo rol
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ margin: '0 28px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #f0f0f5', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafafa' }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e0e4ed', background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={crear} disabled={guardando || !label.trim() || !key.trim()}
            style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: (!label.trim() || !key.trim() || guardando) ? '#e5e5ea' : '#1a2744', color: (!label.trim() || !key.trim() || guardando) ? '#aeaeb2' : '#fff', fontSize: 13, fontWeight: 700, cursor: (!label.trim() || !key.trim() || guardando) ? 'not-allowed' : 'pointer' }}>
            {guardando ? 'Creando…' : 'Crear rol'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Cambiar Rol ────────────────────────────────────────────
function ModalRol({ perfil, roles, onClose, onGuardado }) {
  const [rolSeleccionado, setRol] = useState(perfil.role)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState(null)
  const cambio = rolSeleccionado !== perfil.role

  async function guardar() {
    if (!cambio) return onClose()
    setGuardando(true)
    setError(null)
    try {
      await api.patch(`/api/profiles/${perfil.id}/rol`, { role: rolSeleccionado })
      onGuardado(perfil.id, rolSeleccionado)
      onClose()
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const rolActual     = roles.find(r => r.key === perfil.role)
  const rolNuevo      = roles.find(r => r.key === rolSeleccionado)

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a2744, #243561)', padding: '20px 28px', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Asignar rol</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {Initials(perfil.nombre_completo)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{perfil.nombre_completo}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {perfil.legajo && `Leg. ${perfil.legajo}`}{perfil.legajo && perfil.base_nombre && ' · '}{perfil.base_nombre || ''}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de roles */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {roles.map(r => {
            const seleccionado = rolSeleccionado === r.key
            const esActual     = perfil.role === r.key
            return (
              <div key={r.key} onClick={() => setRol(r.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px',
                  borderRadius: 12, cursor: 'pointer', transition: 'all 0.12s',
                  border: seleccionado ? `2px solid ${r.color}` : '2px solid transparent',
                  background: seleccionado ? r.bg : '#fafafa',
                }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${seleccionado ? r.color : '#ddd'}`, background: seleccionado ? r.color : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {seleccionado && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: seleccionado ? r.color : '#1d1d1f' }}>{r.label}</span>
                    {esActual && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#e5e5ea', color: '#636366' }}>actual</span>}
                    {!r.es_sistema && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: r.bg, color: r.color }}>custom</span>}
                  </div>
                  {r.descripcion && <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1 }}>{r.descripcion}</div>}
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div style={{ margin: '0 24px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f0f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: '#aeaeb2' }}>
            {cambio
              ? <>Cambiando de <strong style={{ color: rolActual?.color }}>{rolActual?.label}</strong> → <strong style={{ color: rolNuevo?.color }}>{rolNuevo?.label}</strong></>
              : 'Sin cambios'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid #e0e4ed', background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando || !cambio}
              style={{ padding: '8px 20px', borderRadius: 9, border: 'none', background: (guardando || !cambio) ? '#e5e5ea' : '#1a2744', color: (guardando || !cambio) ? '#aeaeb2' : '#fff', fontSize: 13, fontWeight: 700, cursor: (guardando || !cambio) ? 'not-allowed' : 'pointer' }}>
              {guardando ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Initials(nombre) {
  const parts = (nombre || '').trim().split(' ').filter(Boolean)
  const ini   = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0]?.[0] || '?')
  return ini.toUpperCase()
}

function RolBadge({ role, roles }) {
  const r = roles.find(x => x.key === role) || { label: role, color: '#8e8e93', bg: '#f5f5f7' }
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: r.bg, color: r.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {r.label}
    </span>
  )
}

// ── Página principal ─────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const [roles,    setRoles]    = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [modal,    setModal]    = useState(null)
  const [modalRol, setModalRol] = useState(false)

  useEffect(() => {
    setCargando(true)
    Promise.all([
      api.get('/api/roles'),
      api.get('/api/profiles'),
    ]).then(([r, data]) => {
      setRoles(r)
      setPerfiles(Array.isArray(data) ? data : [])
    }).catch(console.error)
    .finally(() => setCargando(false))
  }, [])

  // Filtrado client-side con búsqueda por palabras
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return perfiles.filter(p => {
      if (filtroRol && p.role !== filtroRol) return false
      if (q) {
        const palabras = q.split(/\s+/).filter(Boolean)
        const texto = `${p.nombre_completo || ''} ${p.legajo || ''} ${p.email || ''}`.toLowerCase()
        if (!palabras.every(w => texto.includes(w))) return false
      }
      return true
    })
  }, [perfiles, busqueda, filtroRol])

  const agrupadosPorRol = useMemo(() => roles.map(r => ({
    ...r,
    perfiles: filtrados.filter(p => p.role === r.key),
  })).filter(g => g.perfiles.length > 0), [roles, filtrados])

  const modoTabla = !!(busqueda || filtroRol)

  function onGuardado(id, nuevoRol) {
    setPerfiles(prev => prev.map(p => p.id === id ? { ...p, role: nuevoRol } : p))
  }

  function onRolCreado(nuevoRol) {
    setRoles(prev => [...prev, nuevoRol])
  }

  return (
    <AppShell titulo="Administración">
      {modal && (
        <ModalRol perfil={modal} roles={roles} onClose={() => setModal(null)} onGuardado={onGuardado} />
      )}
      {modalRol && (
        <ModalNuevoRol roles={roles} onClose={() => setModalRol(false)} onCreado={onRolCreado} />
      )}

      {/* Subheader */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e0e4ed', padding: '14px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2744' }}>Usuarios y roles</div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>
              {cargando ? 'Cargando…' : `${perfiles.length} usuarios · ${roles.length} roles`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, legajo o email…"
                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: '1px solid #e0e4ed', background: '#f9f9fb', fontSize: 13, color: '#1d1d1f', outline: 'none', width: 260 }}
              />
            </div>
            <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e0e4ed', background: '#f9f9fb', fontSize: 13, color: filtroRol ? '#1a2744' : '#8e8e93', outline: 'none', cursor: 'pointer' }}>
              <option value="">Todos los roles</option>
              {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <button onClick={() => setModalRol(true)}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nuevo rol
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 32px' }}>
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aeaeb2', fontSize: 14 }}>Cargando usuarios…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aeaeb2', fontSize: 14 }}>No se encontraron usuarios</div>
        ) : modoTabla ? (
          /* ── Vista tabla (cuando hay búsqueda o filtro) ── */
          <>
            <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 10 }}>
              {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 14, overflow: 'hidden', border: '0.5px solid #e5e5ea' }}>
              <thead>
                <tr>
                  {['Legajo','Nombre','Base','Rol','Cargo','Email'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e5ea', background: '#f9f9fb', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const r = roles.find(x => x.key === p.role) || { label: p.role, color: '#8e8e93', bg: '#f5f5f7' }
                  return (
                    <tr key={p.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#1a2744', borderBottom: '0.5px solid #f0f0f5' }}>
                        {p.legajo || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '0.5px solid #f0f0f5' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{p.nombre_completo || '—'}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#636366', borderBottom: '0.5px solid #f0f0f5' }}>
                        {p.base_nombre || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '0.5px solid #f0f0f5' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: r.bg, color: r.color, fontSize: 11, fontWeight: 700 }}>{r.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#636366', borderBottom: '0.5px solid #f0f0f5' }}>
                        {p.cargo || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#636366', borderBottom: '0.5px solid #f0f0f5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p.email || '—'}</span>
                          <button onClick={() => setModal(p)}
                            style={{ flexShrink: 0, padding: '3px 10px', borderRadius: 7, border: '0.5px solid #e0e4ed', background: '#fff', fontSize: 11, color: '#636366', fontWeight: 600, cursor: 'pointer' }}>
                            Cambiar rol
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        ) : (
          /* ── Vista agrupada por rol ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {agrupadosPorRol.map(grupo => (
              <div key={grupo.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: grupo.bg, color: grupo.color }}>{grupo.label}</span>
                  <span style={{ fontSize: 12, color: '#aeaeb2' }}>{grupo.perfiles.length} {grupo.perfiles.length === 1 ? 'usuario' : 'usuarios'}</span>
                  {!grupo.es_sistema && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10, background: grupo.bg, color: grupo.color, border: `1px solid ${grupo.color}44` }}>custom</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
                  {grupo.perfiles.map(p => (
                    <PerfilCard key={p.id} perfil={p} roles={roles} onEditar={() => setModal(p)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function PerfilCard({ perfil: p, roles, onEditar }) {
  const r = roles.find(x => x.key === p.role) || { label: p.role, color: '#8e8e93', bg: '#f5f5f7' }
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '0.5px solid #e5e5ea',
      padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 13,
      boxShadow: '0 1px 3px rgba(26,39,68,0.04)',
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: r.color, flexShrink: 0 }}>
        {Initials(p.nombre_completo)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.nombre_completo || p.email}
        </div>
        <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 1 }}>
          {[p.legajo && `Leg. ${p.legajo}`, p.base_nombre].filter(Boolean).join(' · ') || p.email}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <RolBadge role={p.role} roles={roles} />
        <button onClick={onEditar}
          style={{ padding: '3px 10px', borderRadius: 7, border: '0.5px solid #e0e4ed', background: '#fff', fontSize: 11, color: '#636366', fontWeight: 600, cursor: 'pointer' }}>
          Cambiar rol
        </button>
      </div>
    </div>
  )
}
