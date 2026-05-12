/**
 * ModalFacturacion.jsx
 * Modal que el operador usa para cargar los datos y disparar los mails de
 * solicitud de factura a todos los agentes LOYS con presentismo confirmado.
 */
import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'

const C = { navy: '#1a2744', border: '#e0e4ed', green: '#0f6e56', accent: '#f5c800' }

const INP = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 13px', borderRadius: 9,
  border: '1.5px solid #e0e4ed', background: '#f9f9fb',
  fontSize: 13, color: '#1d1d1f', fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.15s',
}
const LBL = {
  fontSize: 11, fontWeight: 700, color: '#636366',
  letterSpacing: '0.05em', textTransform: 'uppercase',
  marginBottom: 5, display: 'block',
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={LBL}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function fmtMonto(n) {
  return Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
}

// Agrupa agentes por cantidad de módulos, ordenados de mayor a menor
function agruparPorModulos(agentes, valorUF) {
  const mapa = {}
  for (const a of agentes) {
    const mod = parseFloat(a.modulos)
    const monto = valorUF ? parseFloat(valorUF) * mod : parseFloat(a.monto)
    if (!mapa[mod]) mapa[mod] = { modulos: mod, montoUnitario: monto, agentes: [] }
    mapa[mod].agentes.push({ ...a, montoCalculado: monto })
  }
  return Object.values(mapa).sort((a, b) => b.modulos - a.modulos)
}

// ── Selector de beneficiario con búsqueda ─────────────────────
function BeneficiarioSelector({ beneficiarios, seleccionado, onSeleccionar }) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto]   = useState(false)
  const ref = useRef()

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtrados = beneficiarios.filter(b =>
    b.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    (b.cuit || '').includes(busqueda)
  )

  function elegir(b) { onSeleccionar(b); setBusqueda(''); setAbierto(false) }
  function limpiar(e) { e.stopPropagation(); onSeleccionar(null); setBusqueda('') }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {seleccionado ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.green}`, background: '#f0fdf4' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seleccionado.razon_social}</div>
            {seleccionado.cuit && <div style={{ fontSize: 11, color: '#636366', fontFamily: 'monospace', marginTop: 1 }}>CUIT: {seleccionado.cuit}</div>}
          </div>
          <button onClick={limpiar} title="Cambiar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>×</button>
        </div>
      ) : (
        <div>
          <div style={{ position: 'relative' }} onClick={() => setAbierto(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setAbierto(true) }}
              onFocus={() => setAbierto(true)}
              placeholder="Buscar por nombre o CUIT..."
              style={{ ...INP, paddingLeft: 32 }} />
          </div>
          {abierto && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4, background: '#fff', borderRadius: 10, border: `1.5px solid ${C.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
              {filtrados.length === 0
                ? <div style={{ padding: '14px 16px', fontSize: 13, color: '#8e8e93', textAlign: 'center' }}>Sin resultados</div>
                : filtrados.map(b => (
                  <div key={b.id} onClick={() => elegir(b)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{b.razon_social}</div>
                    {b.cuit && <div style={{ fontSize: 11, color: '#8e8e93', fontFamily: 'monospace', marginTop: 1 }}>CUIT: {b.cuit}</div>}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Stat card para el header de preview ──────────────────────
function StatCard({ label, value, sub, color = C.navy, bg = '#f5f5f7' }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '14px 18px', flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── Modal principal ───────────────────────────────────────────
export default function ModalFacturacion({ servicio, onClose, onEnviado }) {
  const [paso, setPaso]         = useState('form')
  const [agentes, setAgentes]   = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const [beneficiarios, setBeneficiarios] = useState([])
  const [beneficiario, setBeneficiario]   = useState(null)

  const [concepto, setConcepto]           = useState('')
  const [periodoDe, setPeriodoDe]         = useState(servicio?.fecha_inicio?.slice(0, 10) || '')
  const [periodoA, setPeriodoA]           = useState(servicio?.fecha_fin?.slice(0, 10) || '')
  const [fechaVto, setFechaVto]           = useState('')
  const [valorUF, setValorUF]             = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (servicio?.id) {
      api.get(`/api/facturacion/agentes?servicio_id=${servicio.id}`)
        .then(data => { setAgentes(data); setCargando(false) })
        .catch(() => { setErrorMsg('Error al cargar agentes'); setCargando(false) })
    }
    api.get('/api/beneficiarios').then(setBeneficiarios).catch(() => {})
    api.get('/api/liquidaciones/valor-uf')
      .then(uf => { if (uf?.valor) setValorUF(String(uf.valor)) })
      .catch(() => {})
  }, [servicio?.id])

  const agentesLOYS  = agentes.filter(a => a.loys)
  const agentesPlant = agentes.filter(a => !a.loys)
  const grupos       = agruparPorModulos(agentesLOYS, valorUF)
  const totalMonto   = agentesLOYS.reduce((s, a) => s + (valorUF ? parseFloat(valorUF) * parseFloat(a.modulos) : parseFloat(a.monto)), 0)
  const totalModulos = agentesLOYS.reduce((s, a) => s + parseFloat(a.modulos), 0)

  function validar() {
    if (!beneficiario)            return 'Seleccioná un beneficiario como receptor'
    if (!beneficiario.cuit)       return `"${beneficiario.razon_social}" no tiene CUIT cargado`
    if (!concepto.trim())         return 'El concepto es obligatorio'
    if (!periodoDe)               return 'La fecha de inicio del período es obligatoria'
    if (!periodoA)                return 'La fecha de fin del período es obligatoria'
    if (!fechaVto)                return 'La fecha de vencimiento es obligatoria'
    if (agentesLOYS.length === 0) return 'No hay agentes LOYS con presentismo confirmado'
    return null
  }

  function irAPreview() {
    const err = validar()
    if (err) { setErrorMsg(err); return }
    setErrorMsg('')
    setPaso('preview')
  }

  async function confirmarEnvio() {
    setPaso('enviando')
    setErrorMsg('')
    try {
      await api.post('/api/facturacion', {
        servicio_id:           servicio?.id || null,
        concepto:              concepto.trim(),
        periodo_desde:         periodoDe,
        periodo_hasta:         periodoA,
        fecha_vencimiento:     fechaVto,
        cuit_receptor:         beneficiario.cuit.trim().replace(/\D/g, ''),
        razon_social_receptor: beneficiario.razon_social.trim(),
        valor_uf:              valorUF ? parseFloat(valorUF) : null,
        observaciones:         observaciones.trim() || null,
        agentes: agentesLOYS.map(a => ({
          profile_id:      a.profile_id,
          nombre_completo: a.nombre_completo,
          cuil:            a.cuil,
          email:           a.email,
          modulos:         a.modulos,
          monto:           valorUF ? parseFloat(valorUF) * parseFloat(a.modulos) : a.monto,
          tipo:            'loys',
        })),
      })
      setPaso('exito')
      onEnviado && onEnviado()
    } catch (e) {
      setErrorMsg(e.message || 'Error al enviar')
      setPaso('preview')
    }
  }

  // ── Stepper ──────────────────────────────────────────────────
  const PASOS_DEF = [
    { id: 'form',     label: '1. Datos'    },
    { id: 'preview',  label: '2. Revisión' },
    { id: 'enviando', label: '3. Envío'    },
  ]

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, width: '100%',
          maxWidth: paso === 'preview' ? 860 : 680,
          boxShadow: '0 24px 80px rgba(26,39,68,0.28)',
          maxHeight: '92vh', overflowY: 'auto',
          transition: 'max-width 0.3s ease',
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg,#1a2744 0%,#243561 100%)', padding: '24px 32px 22px', borderRadius: '20px 20px 0 0', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 5 }}>
                Módulo de Facturación LOYS
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                Solicitar facturas a agentes
              </div>
              {servicio?.nombre && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{servicio.nombre}</div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
              ×
            </button>
          </div>

          {/* Stepper */}
          {paso !== 'exito' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 20 }}>
              {PASOS_DEF.map((p, i) => {
                const activo  = paso === p.id
                const pasado  = (paso === 'preview' && i === 0) || (paso === 'enviando' && i < 2)
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', flex: i < PASOS_DEF.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800,
                        background: activo ? C.accent : pasado ? 'rgba(245,200,0,0.3)' : 'rgba(255,255,255,0.1)',
                        color: activo ? C.navy : pasado ? C.accent : 'rgba(255,255,255,0.35)',
                        transition: 'all 0.2s',
                      }}>
                        {pasado
                          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          : i + 1
                        }
                      </div>
                      <span style={{ fontSize: 12, fontWeight: activo ? 700 : 500, color: activo ? '#fff' : pasado ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                        {p.label.split('. ')[1]}
                      </span>
                    </div>
                    {i < PASOS_DEF.length - 1 && (
                      <div style={{ flex: 1, height: 1, background: pasado ? 'rgba(245,200,0,0.4)' : 'rgba(255,255,255,0.12)', margin: '0 12px', transition: 'background 0.3s' }} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── PASO 1: Formulario ─────────────────────────────── */}
        {paso === 'form' && (
          <div style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Contador agentes */}
            {cargando ? (
              <div style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center', padding: '20px 0' }}>Cargando agentes...</div>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: agentesLOYS.length > 0 ? '#f0f4ff' : '#fff3cd', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: agentesLOYS.length > 0 ? C.navy : '#f5c800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={agentesLOYS.length > 0 ? '#fff' : C.navy} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>{agentesLOYS.length}</div>
                    <div style={{ fontSize: 12, color: '#636366', fontWeight: 600 }}>Agentes LOYS con presentismo</div>
                    {agentesLOYS.length > 0 && (
                      <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1 }}>
                        {totalModulos} módulos en total · {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} de monto
                      </div>
                    )}
                  </div>
                </div>
                {agentesPlant.length > 0 && (
                  <div style={{ background: '#f5f5f7', borderRadius: 12, padding: '14px 18px', textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#8e8e93' }}>{agentesPlant.length}</div>
                    <div style={{ fontSize: 11, color: '#aeaeb2', fontWeight: 600 }}>Planta</div>
                    <div style={{ fontSize: 10, color: '#c7c7cc' }}>(próximamente)</div>
                  </div>
                )}
              </div>
            )}

            {agentesLOYS.length === 0 && !cargando && (
              <div style={{ background: '#fff3cd', border: '1.5px solid #ffd700', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#856404', display: 'flex', gap: 10, alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                No hay agentes LOYS con presentismo confirmado en este servicio.
              </div>
            )}

            {/* Receptor */}
            <div style={{ background: '#fafbfc', border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Receptor</span>
              </div>
              <BeneficiarioSelector beneficiarios={beneficiarios} seleccionado={beneficiario} onSeleccionar={setBeneficiario} />
              {beneficiario && !beneficiario.cuit && (
                <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
                  ⚠ Este beneficiario no tiene CUIT cargado. Agregalo desde Beneficiarios antes de continuar.
                </div>
              )}
            </div>

            {/* Datos de la factura */}
            <div style={{ background: '#fafbfc', border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos de la factura</span>
              </div>

              <Field label="Concepto">
                <input value={concepto} onChange={e => setConcepto(e.target.value)}
                  placeholder="Ej: Prestación de servicios adicionales — Operativo XYZ"
                  style={INP}
                  onFocus={e => e.target.style.borderColor = C.navy}
                  onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Período desde">
                  <input type="date" value={periodoDe} onChange={e => setPeriodoDe(e.target.value)} style={INP}
                    onFocus={e => e.target.style.borderColor = C.navy}
                    onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
                </Field>
                <Field label="Período hasta">
                  <input type="date" value={periodoA} onChange={e => setPeriodoA(e.target.value)} style={INP}
                    onFocus={e => e.target.style.borderColor = C.navy}
                    onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Fecha de vencimiento">
                  <input type="date" value={fechaVto} onChange={e => setFechaVto(e.target.value)} style={INP}
                    onFocus={e => e.target.style.borderColor = C.navy}
                    onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
                </Field>
                <Field label="Valor UF ($/módulo)" hint="Se pre-completa con el valor vigente">
                  <input type="number" value={valorUF} onChange={e => setValorUF(e.target.value)}
                    placeholder="Ej: 18050.50" step="0.01" style={INP}
                    onFocus={e => e.target.style.borderColor = C.navy}
                    onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
                </Field>
              </div>

              <Field label="Observaciones internas (opcional)">
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                  rows={2} placeholder="Notas para el equipo RRHH..."
                  style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = C.navy}
                  onBlur={e => e.target.style.borderColor = '#e0e4ed'} />
              </Field>
            </div>

            {errorMsg && (
              <div style={{ background: '#fee2e2', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#b91c1c', fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={irAPreview} disabled={agentesLOYS.length === 0 || cargando}
                style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: agentesLOYS.length === 0 ? '#e0e4ed' : C.navy, color: agentesLOYS.length === 0 ? '#8e8e93' : '#fff', fontSize: 13, fontWeight: 700, cursor: agentesLOYS.length === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 8 }}>
                Revisar antes de enviar
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 2: Preview ────────────────────────────────── */}
        {paso === 'preview' && (
          <div style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 12 }}>
              <StatCard label="Agentes" value={agentesLOYS.length} sub={`${grupos.length} grupo${grupos.length !== 1 ? 's' : ''} de monto`} bg="#f0f4ff" color={C.navy} />
              <StatCard label="Módulos totales" value={totalModulos} sub={valorUF ? `UF: $${parseFloat(valorUF).toLocaleString('es-AR')}` : '—'} bg="#f5f5f7" color={C.navy} />
              <StatCard label="Total a facturar" value={fmtMonto(totalMonto)} bg="#f0fdf4" color={C.green} />
            </div>

            {/* Resumen datos */}
            <div style={{ background: '#fafbfc', border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Datos del mail</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px' }}>
                {[
                  ['Receptor', beneficiario?.razon_social],
                  ['CUIT receptor', beneficiario?.cuit],
                  ['Concepto', concepto],
                  ['Período', `${periodoDe} → ${periodoA}`],
                  ['Vencimiento', fechaVto],
                  ['Tipo comprobante', 'C (Monotributista)'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Grupos por módulos ── */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Distribución por cantidad de módulos
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {grupos.map((grupo, gi) => {
                  const sinEmailEnGrupo = grupo.agentes.filter(a => !a.email).length
                  return (
                    <div key={grupo.modulos} style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                      {/* Cabecera del grupo */}
                      <div style={{ background: 'linear-gradient(90deg,#f0f4ff,#e8eeff)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${C.border}` }}>
                        {/* Badge de módulos */}
                        <div style={{ background: C.navy, color: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                          {grupo.modulos} {grupo.modulos === 1 ? 'módulo' : 'módulos'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>
                            {grupo.agentes.length} {grupo.agentes.length === 1 ? 'agente' : 'agentes'} · cada uno factura {fmtMonto(grupo.montoUnitario)}
                          </div>
                          <div style={{ fontSize: 11, color: '#636366', marginTop: 1 }}>
                            Subtotal del grupo: {fmtMonto(grupo.montoUnitario * grupo.agentes.length)}
                          </div>
                        </div>
                        {sinEmailEnGrupo > 0 && (
                          <div style={{ background: '#fff3cd', border: '1px solid #ffd700', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#856404', flexShrink: 0 }}>
                            ⚠ {sinEmailEnGrupo} sin email
                          </div>
                        )}
                      </div>

                      {/* Agentes del grupo */}
                      <div>
                        {grupo.agentes.map((a, ai) => (
                          <div key={a.profile_id} style={{ padding: '10px 18px', display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'center', borderTop: ai > 0 ? `1px solid #f0f0f5` : 'none', background: !a.email ? '#fffbeb' : ai % 2 === 0 ? '#fff' : '#fafbfc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              {/* Avatar inicial */}
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e8eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: C.navy, flexShrink: 0 }}>
                                {a.nombre_completo?.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {a.nombre_completo}
                                </div>
                                <div style={{ fontSize: 11, color: '#8e8e93', fontFamily: 'monospace' }}>
                                  {a.cuil || '—'}
                                  {!a.email && <span style={{ color: '#b45309', fontFamily: 'system-ui', fontWeight: 700, marginLeft: 6 }}>· Sin email</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#8e8e93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.email || <span style={{ color: '#fbbf24' }}>—</span>}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: C.green, whiteSpace: 'nowrap' }}>
                              {fmtMonto(a.montoCalculado)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Total general */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #a7f3d0', borderRadius: 12, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total general a facturar</div>
                  <div style={{ fontSize: 10, color: '#8e8e93', marginTop: 2 }}>{agentesLOYS.length} agentes · {totalModulos} módulos</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.green, letterSpacing: '-0.5px' }}>
                  {fmtMonto(totalMonto)}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: '#fee2e2', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 4 }}>
              <button onClick={() => setPaso('form')} style={{ padding: '10px 20px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                Volver a editar
              </button>
              <button onClick={confirmarEnvio}
                style={{ padding: '10px 28px', borderRadius: 9, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 4px 14px rgba(26,39,68,0.25)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Enviar mails a {agentesLOYS.length} agentes
              </button>
            </div>
          </div>
        )}

        {/* ── ENVIANDO ───────────────────────────────────────── */}
        {paso === 'enviando' && (
          <div style={{ padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.navy, marginBottom: 8 }}>Enviando mails...</div>
            <div style={{ fontSize: 13, color: '#636366' }}>Esto puede tardar unos segundos.</div>
          </div>
        )}

        {/* ── ÉXITO ──────────────────────────────────────────── */}
        {paso === 'exito' && (
          <div style={{ padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 8 }}>¡Solicitud enviada!</div>
            <div style={{ fontSize: 14, color: '#636366', marginBottom: 32, lineHeight: 1.7 }}>
              Se enviaron mails a <strong>{agentesLOYS.length} agentes</strong> con sus datos de facturación.<br />
              Podés hacer seguimiento desde el panel de <strong>Facturación</strong>.
            </div>
            <button onClick={onClose}
              style={{ padding: '11px 32px', borderRadius: 10, border: 'none', background: C.navy, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(26,39,68,0.2)' }}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
