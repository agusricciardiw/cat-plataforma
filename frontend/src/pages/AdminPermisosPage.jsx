import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import AppShell from '../components/AppShell'

const C = { navy: '#1a2744', gray: '#8e8e93' }

export default function AdminPermisosPage() {
  const [data,       setData]       = useState(null)  // { permisos_def, roles, mapa }
  const [local,      setLocal]      = useState({})    // permisos locales editables
  const [rolActivo,  setRolActivo]  = useState(null)  // key del rol seleccionado
  const [guardando,  setGuardando]  = useState(false)
  const [guardado,   setGuardado]   = useState(false)
  const [cargando,   setCargando]   = useState(true)
  const [busqPerm,   setBusqPerm]   = useState('')

  useEffect(() => {
    setCargando(true)
    api.get('/api/permisos')
      .then(d => {
        setData(d)
        setLocal(JSON.parse(JSON.stringify(d.mapa)))
        // Seleccionar primer rol no-admin por defecto
        const primero = d.roles.find(r => r.key !== 'admin')
        if (primero) setRolActivo(primero.key)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const rol = data?.roles.find(r => r.key === rolActivo)
  const esAdmin = rolActivo === 'admin'

  const permisosDel = useMemo(() => local[rolActivo] || [], [local, rolActivo])

  const tienePermiso = (key) => permisosDel.includes(key)

  function toggle(permKey) {
    if (esAdmin) return
    setLocal(prev => {
      const actual = prev[rolActivo] || []
      return {
        ...prev,
        [rolActivo]: actual.includes(permKey)
          ? actual.filter(k => k !== permKey)
          : [...actual, permKey],
      }
    })
  }

  function toggleModulo(modulo, activar) {
    if (esAdmin) return
    const keysModulo = data.permisos_def.filter(p => p.modulo === modulo).map(p => p.key)
    setLocal(prev => {
      const actual = prev[rolActivo] || []
      const sinModulo = actual.filter(k => !keysModulo.includes(k))
      return {
        ...prev,
        [rolActivo]: activar ? [...sinModulo, ...keysModulo] : sinModulo,
      }
    })
  }

  const hayCambios = useMemo(() => {
    if (!data || !rolActivo || esAdmin) return false
    const orig = (data.mapa[rolActivo] || []).slice().sort().join(',')
    const nvo  = (local[rolActivo]     || []).slice().sort().join(',')
    return orig !== nvo
  }, [data, local, rolActivo, esAdmin])

  async function guardar() {
    if (!hayCambios || guardando) return
    setGuardando(true)
    try {
      await api.put(`/api/permisos/${rolActivo}`, { permisos: local[rolActivo] || [] })
      setData(prev => ({ ...prev, mapa: { ...prev.mapa, [rolActivo]: local[rolActivo] || [] } }))
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2500)
    } catch (e) { alert(e.message) }
    finally { setGuardando(false) }
  }

  function descartar() {
    if (!data) return
    setLocal(prev => ({ ...prev, [rolActivo]: JSON.parse(JSON.stringify(data.mapa[rolActivo] || [])) }))
  }

  const modulos = data ? [...new Set(data.permisos_def.map(p => p.modulo))] : []

  const permisosFiltrados = useMemo(() => {
    if (!busqPerm.trim()) return data?.permisos_def || []
    const q = busqPerm.toLowerCase()
    return (data?.permisos_def || []).filter(p =>
      p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
    )
  }, [data, busqPerm])

  const modulosFiltrados = [...new Set(permisosFiltrados.map(p => p.modulo))]

  if (cargando) return (
    <AppShell titulo="Administración">
      <div style={{ padding: 60, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Cargando permisos…</div>
    </AppShell>
  )

  const rolesEditables = data?.roles.filter(r => r.key !== 'admin') || []

  return (
    <AppShell titulo="Administración">
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Panel izquierdo: lista de roles ── */}
        <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid #e5e5ea', background: '#f9f9fb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 10px', fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Roles
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {rolesEditables.map(r => {
              const activo  = r.key === rolActivo
              const nPerms  = (local[r.key] || []).length
              const cambios = (() => {
                const orig = (data.mapa[r.key] || []).slice().sort().join(',')
                const nvo  = (local[r.key]     || []).slice().sort().join(',')
                return orig !== nvo
              })()
              return (
                <button key={r.key} onClick={() => { setRolActivo(r.key); setBusqPerm('') }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 16px',
                    border: 'none', background: activo ? '#fff' : 'transparent',
                    borderLeft: activo ? `3px solid ${r.color || C.navy}` : '3px solid transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: activo ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: activo ? 700 : 500, color: activo ? (r.color || C.navy) : '#1c1c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.label}
                      </span>
                      {cambios && <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color || C.navy, flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>{nPerms} permisos</div>
                  </div>
                  {!r.es_sistema && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6, background: r.bg, color: r.color, flexShrink: 0 }}>custom</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Panel derecho: permisos del rol seleccionado ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header del rol */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #e5e5ea', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
            {rol && (
              <span style={{ padding: '3px 12px', borderRadius: 20, background: rol.bg, color: rol.color, fontSize: 13, fontWeight: 700 }}>
                {rol.label}
              </span>
            )}
            {rol?.descripcion && (
              <span style={{ fontSize: 12, color: C.gray }}>{rol.descripcion}</span>
            )}
            <div style={{ flex: 1 }} />

            {/* Buscador de permisos */}
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2"
                style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                value={busqPerm}
                onChange={e => setBusqPerm(e.target.value)}
                placeholder="Filtrar permisos…"
                style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: 9, border: '1px solid #e0e4ed', fontSize: 12, color: '#1d1d1f', outline: 'none', width: 180 }}
              />
            </div>

            {/* Acciones */}
            {hayCambios && !esAdmin && (
              <>
                <button onClick={descartar}
                  style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid #e0e4ed', background: '#fff', color: C.gray, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Descartar
                </button>
                <button onClick={guardar} disabled={guardando}
                  style={{ padding: '7px 18px', borderRadius: 9, border: 'none', background: rol?.color || C.navy, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {guardando ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </>
            )}
            {guardado && !hayCambios && (
              <span style={{ fontSize: 12, color: '#0f6e56', fontWeight: 700 }}>✓ Guardado</span>
            )}
          </div>

          {/* Permisos */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
            {esAdmin ? (
              <div style={{ padding: 40, textAlign: 'center', color: C.gray, fontSize: 13 }}>
                El rol <strong>Admin</strong> tiene todos los permisos del sistema y no es editable.
              </div>
            ) : !rolActivo ? (
              <div style={{ padding: 40, textAlign: 'center', color: C.gray, fontSize: 13 }}>
                Seleccioná un rol para editar sus permisos
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {modulosFiltrados.map(modulo => {
                  const permsModulo = permisosFiltrados.filter(p => p.modulo === modulo)
                  const activosEnMod = permsModulo.filter(p => tienePermiso(p.key)).length
                  const todosActivos = activosEnMod === permsModulo.length
                  const algunoActivo = activosEnMod > 0

                  return (
                    <div key={modulo} style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
                      {/* Cabecera del módulo */}
                      <div style={{ padding: '12px 18px', background: '#f9f9fb', borderBottom: '0.5px solid #e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {modulo}
                          </span>
                          <span style={{ fontSize: 11, color: C.gray }}>
                            {activosEnMod}/{permsModulo.length}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleModulo(modulo, !todosActivos)}
                          style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #e0e4ed', background: '#fff', fontSize: 11, fontWeight: 600, color: algunoActivo && !todosActivos ? C.navy : C.gray, cursor: 'pointer' }}>
                          {todosActivos ? 'Desmarcar todo' : 'Marcar todo'}
                        </button>
                      </div>

                      {/* Lista de permisos */}
                      <div>
                        {permsModulo.map((perm, i) => {
                          const tiene    = tienePermiso(perm.key)
                          const cambiado = tiene !== (data.mapa[rolActivo] || []).includes(perm.key)
                          return (
                            <div key={perm.key}
                              onClick={() => toggle(perm.key)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '11px 18px', cursor: 'pointer',
                                borderTop: i > 0 ? '0.5px solid #f0f0f5' : 'none',
                                background: tiene ? `${rol?.bg || '#eef1f8'}` : '#fff',
                                transition: 'background .1s',
                              }}
                              onMouseEnter={e => { if (!tiene) e.currentTarget.style.background = '#f9f9fb' }}
                              onMouseLeave={e => { e.currentTarget.style.background = tiene ? `${rol?.bg || '#eef1f8'}` : '#fff' }}>

                              {/* Checkbox visual */}
                              <div style={{
                                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                                border: cambiado ? `2px solid ${rol?.color || C.navy}` : tiene ? `2px solid ${rol?.color || C.navy}` : '1.5px solid #d1d1d6',
                                background: tiene ? (rol?.color || C.navy) : '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all .12s',
                              }}>
                                {tiene && (
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: tiene ? 600 : 400, color: tiene ? (rol?.color || C.navy) : '#1c1c1e' }}>
                                  {perm.label}
                                </div>
                                <div style={{ fontSize: 11, color: '#aeaeb2', fontFamily: 'monospace', marginTop: 1 }}>
                                  {perm.key}
                                </div>
                              </div>

                              {cambiado && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: tiene ? (rol?.bg || '#eef1f8') : '#fef2f2', color: tiene ? (rol?.color || C.navy) : '#dc2626' }}>
                                  {tiene ? '+ agregado' : '− quitado'}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
