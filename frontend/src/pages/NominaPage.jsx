import { useEffect, useState, useMemo } from 'react'
import AppShell from '../components/AppShell'
import api from '../lib/api'

const C = { navy: '#1a2744', green: '#0f6e56', red: '#c0392b', gray: '#636366' }


function Badge({ label, color = C.navy, bg = '#eef1f8' }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function Th({ children, style }) {
  return (
    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderBottom: '1px solid #e5e5ea', background: '#f9f9fb', ...style }}>
      {children}
    </th>
  )
}

function Td({ children, style }) {
  return (
    <td style={{ padding: '10px 14px', fontSize: 13, color: '#1c1c1e', borderBottom: '0.5px solid #f0f0f5', verticalAlign: 'middle', ...style }}>
      {children}
    </td>
  )
}

export default function NominaPage() {
  const [agentes,  setAgentes]  = useState([])
  const [bases,    setBases]    = useState([])
  const [turnos,   setTurnos]   = useState([])
  const [contratos,setContratos]= useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // Filtros
  const [busq,       setBusq]       = useState('')
  const [baseId,     setBaseId]     = useState('')
  const [turno,      setTurno]      = useState('')
  const [contrato,   setContrato]   = useState('')
  const [soloActivos,setSoloActivos]= useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/api/profiles/nomina')
      .then(data => {
        setAgentes(data)
        // Extraer bases y tipos de contrato únicos
        const basesUnicas = [...new Set(data.map(a => a.base_nombre).filter(Boolean))].sort()
        setBases(basesUnicas)
        const turnosUnicos = [...new Set(data.map(a => a.turno).filter(Boolean))].sort()
        setTurnos(turnosUnicos)
        const contratosUnicos = [...new Set(data.map(a => a.tipo_contrato).filter(Boolean))].sort()
        setContratos(contratosUnicos)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const filtrados = useMemo(() => {
    const q = busq.toLowerCase().trim()
    return agentes.filter(a => {
      if (soloActivos && !a.activo) return false
      if (!soloActivos && a.activo) return false  // si "solo inactivos"... pero tenemos 3 estados
      if (baseId   && a.base_nombre !== baseId) return false
      if (turno    && a.turno !== turno) return false
      if (contrato && a.tipo_contrato !== contrato) return false
      if (q) {
        const palabras = q.split(/\s+/).filter(Boolean)
        const nombre = a.nombre_completo?.toLowerCase() || ''
        const legajo = a.legajo || ''
        if (!palabras.every(p => nombre.includes(p) || legajo.includes(p))) return false
      }
      return true
    })
  }, [agentes, busq, baseId, turno, contrato, soloActivos])

  // Stats
  const totalActivos   = agentes.filter(a => a.activo).length
  const totalInactivos = agentes.filter(a => !a.activo).length

  const inputStyle = {
    padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e5ea',
    fontSize: 13, background: '#fff', color: '#1c1c1e', outline: 'none', minWidth: 0,
  }
  const selectStyle = { ...inputStyle, cursor: 'pointer', paddingRight: 28 }

  return (
    <AppShell titulo="Nómina">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header con stats */}
        <div style={{ padding: '24px 32px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total agentes', value: agentes.length, color: C.navy, bg: '#eef1f8' },
              { label: 'Activos',       value: totalActivos,   color: C.green, bg: '#e8faf2' },
              { label: 'Inactivos',     value: totalInactivos, color: C.gray,  bg: '#f5f5f7' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'center', border: '0.5px solid #e5e5ea' }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{loading ? '—' : s.value}</span>
                <span style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {/* Búsqueda */}
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={busq} onChange={e => setBusq(e.target.value)}
                placeholder="Buscar por nombre o legajo…"
                style={{ ...inputStyle, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }}
              />
            </div>

            <select value={baseId} onChange={e => setBaseId(e.target.value)} style={selectStyle}>
              <option value="">Todas las bases</option>
              {bases.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select value={turno} onChange={e => setTurno(e.target.value)} style={selectStyle}>
              <option value="">Todos los turnos</option>
              {turnos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select value={contrato} onChange={e => setContrato(e.target.value)} style={selectStyle}>
              <option value="">Todos los contratos</option>
              {contratos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Toggle activos/inactivos */}
            <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #e5e5ea', overflow: 'hidden' }}>
              {[
                { label: 'Activos',   value: true  },
                { label: 'Inactivos', value: false },
              ].map(op => (
                <button key={String(op.value)}
                  onClick={() => setSoloActivos(op.value)}
                  style={{
                    padding: '8px 14px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: soloActivos === op.value ? C.navy : '#fff',
                    color: soloActivos === op.value ? '#fff' : C.gray,
                  }}>
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 8 }}>
            {loading ? 'Cargando…' : `${filtrados.length} agente${filtrados.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Tabla */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 32px 24px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>
          )}

          {!loading && !error && (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 14, overflow: 'hidden', border: '0.5px solid #e5e5ea' }}>
              <thead>
                <tr>
                  <Th>Legajo</Th>
                  <Th>Nombre</Th>
                  <Th>Base</Th>
                  <Th>Área</Th>
                  <Th>Turno</Th>
                  <Th>Horario</Th>
                  <Th>Cargo</Th>
                  <Th>Función espec.</Th>
                  <Th>Contrato</Th>
                  <Th>Teléfono</Th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#8e8e93', fontSize: 14 }}>
                      No hay agentes que coincidan con los filtros
                    </td>
                  </tr>
                )}
                {filtrados.map(a => (
                  <tr key={a.id} style={{ transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <Td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.navy, fontSize: 12 }}>
                        {a.legajo || '—'}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{a.nombre_completo}</div>
                      {a.email && <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1 }}>{a.email}</div>}
                    </Td>
                    <Td>{a.base_nombre ? <Badge label={a.base_nombre} /> : <span style={{ color: '#aeaeb2' }}>—</span>}</Td>
                    <Td style={{ fontSize: 12, color: a.area ? '#3c3c43' : '#aeaeb2' }}>{a.area || '—'}</Td>
                    <Td>
                      {a.turno
                        ? <Badge label={a.turno} color="#534ab7" bg="#eeecfb" />
                        : <span style={{ color: '#aeaeb2' }}>—</span>}
                    </Td>
                    <Td>
                      {a.hora_entrada && a.hora_salida
                        ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.hora_entrada.slice(0,5)} – {a.hora_salida.slice(0,5)}</span>
                        : <span style={{ color: '#aeaeb2' }}>—</span>}
                    </Td>
                    <Td style={{ fontSize: 12, color: a.cargo ? '#1c1c1e' : '#aeaeb2' }}>{a.cargo || '—'}</Td>
                    <Td style={{ fontSize: 12, color: a.funcion_especifica ? '#1c1c1e' : '#aeaeb2', maxWidth: 160 }}>{a.funcion_especifica || '—'}</Td>
                    <Td>
                      {a.tipo_contrato
                        ? <span style={{ fontSize: 12, color: '#3c3c43' }}>{a.tipo_contrato}</span>
                        : <span style={{ color: '#aeaeb2' }}>—</span>}
                    </Td>
                    <Td>
                      {a.telefono
                        ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.telefono}</span>
                        : <span style={{ color: '#aeaeb2' }}>—</span>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}
