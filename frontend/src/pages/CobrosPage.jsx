/**
 * CobrosPage.jsx
 * Módulo de Cobro — Liquidaciones para Banca Electrónica
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'
import AppShell from '../components/AppShell'
import { usePermisos } from '../hooks/usePermiso'

const C = { navy: '#1a2744', accent: '#f5c800', bg: '#eef1f6', border: '#e0e4ed', green: '#0f6e56' }

function formatPesos(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}
function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}
function formatRango(desde, hasta) {
  return `${formatFecha(desde)} — ${formatFecha(hasta)}`
}

// ── Panel: Valor UF ───────────────────────────────────────────
function PanelUF({ ufData, onUFCreada, puedeActualizar }) {
  const [editando, setEditando]   = useState(false)
  const [valor, setValor]         = useState('')
  const [fecha, setFecha]         = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState(null)

  async function guardar() {
    if (!valor || !fecha) return setError('Completá los dos campos')
    setGuardando(true); setError(null)
    try {
      await api.post('/api/liquidaciones/valor-uf', { valor: Number(valor), vigente_desde: fecha })
      setEditando(false); setValor(''); setFecha('')
      onUFCreada()
    } catch (e) { setError(e.message) }
    finally { setGuardando(false) }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${C.border}`, padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Valor UF vigente
        </div>
        {!editando && puedeActualizar && (
          <button onClick={() => setEditando(true)}
            style={{ fontSize: 11, fontWeight: 700, color: '#185fa5', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Actualizar
          </button>
        )}
      </div>

      {ufData?.vigente ? (
        <div style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.navy }}>
              {formatPesos(ufData.vigente.valor)}
            </div>
            <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>
              por módulo · vigente desde {formatFecha(ufData.vigente.vigente_desde)}
            </div>
          </div>
          {ufData.historial?.length > 1 && (
            <div style={{ fontSize: 11, color: '#aeaeb2', borderLeft: `1px solid ${C.border}`, paddingLeft: 16 }}>
              {ufData.historial.slice(1, 3).map(h => (
                <div key={h.id}>{formatPesos(h.valor)} desde {formatFecha(h.vigente_desde)}</div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: '#8e8e93', fontSize: 13, marginBottom: 10 }}>Sin valor UF configurado</div>
      )}

      {editando && (
        <div style={{ marginTop: 14, padding: '14px 16px', background: '#f8f9fc', borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Nuevo valor UF</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 11, color: '#636366', fontWeight: 600, display: 'block', marginBottom: 4 }}>Valor ($/módulo)</label>
              <input
                type="number" value={valor} onChange={e => setValor(e.target.value)}
                placeholder="Ej: 15000"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.navy, outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 11, color: '#636366', fontWeight: 600, display: 'block', marginBottom: 4 }}>Vigente desde</label>
              <input
                type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.navy, outline: 'none' }}
              />
            </div>
          </div>
          {error && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => { setEditando(false); setError(null) }}
              style={{ padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: C.navy, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal: Nueva Liquidación ──────────────────────────────────
function ModalNuevaLiquidacion({ ufVigente, onCreada, onClose }) {
  const [paso, setPaso]           = useState('form') // 'form' | 'preview' | 'confirmando'
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [valorUF, setValorUF]     = useState(ufVigente ? String(ufVigente) : '')
  const [observaciones, setObs]   = useState('')
  const [preview, setPreview]     = useState(null)
  const [cargando, setCargando]   = useState(false)
  const [error, setError]         = useState(null)

  async function previsualizarClick() {
    if (!fechaDesde || !fechaHasta || !valorUF) return setError('Completá todos los campos')
    if (fechaHasta < fechaDesde) return setError('La fecha hasta debe ser mayor o igual a la fecha desde')
    setCargando(true); setError(null)
    try {
      const data = await api.post('/api/liquidaciones/preview', {
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        valor_uf: Number(valorUF),
      })
      setPreview(data)
      setPaso('preview')
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  async function confirmarClick() {
    setPaso('confirmando'); setError(null)
    try {
      const liq = await api.post('/api/liquidaciones', {
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        valor_uf: Number(valorUF),
        observaciones,
      })
      // Descargar TXT automáticamente
      if (liq.txt_archivo) {
        const url = `${import.meta.env.VITE_API_URL || ''}/uploads/${liq.txt_archivo}`
        const a = document.createElement('a')
        a.href = url; a.download = liq.txt_archivo; a.click()
      }
      onCreada(liq)
      onClose()
    } catch (e) {
      setError(e.message)
      setPaso('preview')
    }
  }

  const agenteSinCUIL = preview?.agentes?.some(a => !a.cuil?.trim())
  const agenteSinCBU  = preview?.agentes?.some(a => !a.cbu?.trim())
  const hayBloqueo    = agenteSinCUIL || agenteSinCBU

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: paso === 'preview' ? 680 : 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '22px 28px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>
                {paso === 'form' ? 'Nueva Liquidación' : 'Previsualización'}
              </div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>
                {paso === 'form'
                  ? 'Seleccioná el rango de fechas y el valor UF para calcular los haberes'
                  : `${formatRango(fechaDesde, fechaHasta)} · UF ${formatPesos(Number(valorUF))}`}
              </div>
            </div>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {paso === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Desde
                  </label>
                  <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.navy, outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Hasta
                  </label>
                  <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.navy, outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Valor UF ($/módulo)
                </label>
                <input type="number" value={valorUF} onChange={e => setValorUF(e.target.value)}
                  placeholder="Ej: 15000"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.navy, outline: 'none' }} />
                {ufVigente && (
                  <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 4 }}>
                    UF vigente: {formatPesos(ufVigente)} — se usó como valor por defecto
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Observaciones (opcional)
                </label>
                <textarea value={observaciones} onChange={e => setObs(e.target.value)}
                  placeholder="Ej: OP 4521 — semana del 28/04 al 04/05"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.navy, outline: 'none', resize: 'vertical' }} />
              </div>
            </div>
          )}

          {paso === 'preview' && preview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Resumen */}
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'Agentes', valor: preview.total_agentes, color: C.navy },
                  { label: 'Módulos', valor: preview.total_modulos?.toFixed(1), color: '#185fa5' },
                  { label: 'Total a pagar', valor: formatPesos(preview.total_monto), color: C.green },
                ].map(st => (
                  <div key={st.label} style={{ flex: 1, background: '#f8f9fc', borderRadius: 10, padding: '12px 14px', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: st.color }}>{st.valor}</div>
                    <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600 }}>{st.label}</div>
                  </div>
                ))}
              </div>

              {(agenteSinCUIL || agenteSinCBU) && (
                <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div style={{ fontSize: 12, color: '#c2410c' }}>
                    {agenteSinCUIL && <div><strong>Hay agentes sin CUIL cargado.</strong></div>}
                    {agenteSinCBU  && <div><strong>Hay agentes sin CBU cargado.</strong></div>}
                    No podrás confirmar hasta que se completen los datos en Mi Equipo.
                  </div>
                </div>
              )}

              {/* Tabla de agentes */}
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f5f6f8' }}>
                      {['Agente', 'CUIL', 'CBU', 'Módulos', 'Monto'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#636366', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.agentes.map((a, i) => (
                      <tr key={a.profile_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: C.navy, borderBottom: `1px solid ${C.border}` }}>{a.nombre_completo}</td>
                        <td style={{ padding: '9px 12px', color: '#636366', borderBottom: `1px solid ${C.border}`, fontVariantNumeric: 'tabular-nums' }}>{a.cuil || '—'}</td>
                        <td style={{ padding: '9px 12px', borderBottom: `1px solid ${C.border}` }}>
                          {a.cbu ? (
                            <span style={{ fontVariantNumeric: 'tabular-nums', color: '#636366' }}>{a.cbu}</span>
                          ) : (
                            <span style={{ color: '#c2410c', fontWeight: 700 }}>Sin CBU</span>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px', color: '#185fa5', fontWeight: 700, borderBottom: `1px solid ${C.border}`, fontVariantNumeric: 'tabular-nums' }}>{Number(a.modulos).toFixed(1)}</td>
                        <td style={{ padding: '9px 12px', color: C.green, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{formatPesos(a.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f5f6f8', fontWeight: 700 }}>
                      <td colSpan={3} style={{ padding: '9px 12px', color: C.navy, fontSize: 12 }}>TOTAL</td>
                      <td style={{ padding: '9px 12px', color: '#185fa5', fontVariantNumeric: 'tabular-nums' }}>{Number(preview.total_modulos).toFixed(1)}</td>
                      <td style={{ padding: '9px 12px', color: C.green }}>{formatPesos(preview.total_monto)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {paso === 'confirmando' && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8e8e93' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Generando liquidación y TXT…</div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 10, background: '#fafafa', flexShrink: 0 }}>
          <button onClick={paso === 'preview' ? () => setPaso('form') : onClose}
            style={{ padding: '9px 18px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {paso === 'preview' ? '← Volver' : 'Cancelar'}
          </button>

          {paso === 'form' && (
            <button onClick={previsualizarClick} disabled={cargando}
              style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.7 : 1 }}>
              {cargando ? 'Calculando…' : 'Previsualizar →'}
            </button>
          )}

          {paso === 'preview' && (
            <button onClick={confirmarClick} disabled={hayBloqueo || paso === 'confirmando'}
              style={{
                padding: '9px 22px', borderRadius: 9, border: 'none',
                background: hayBloqueo ? '#e0e4ed' : C.green,
                color: hayBloqueo ? '#8e8e93' : '#fff',
                fontSize: 13, fontWeight: 700,
                cursor: hayBloqueo ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Confirmar y descargar TXT
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Card de liquidación ───────────────────────────────────────
function CardLiquidacion({ liq }) {
  const apiBase = import.meta.env.VITE_API_URL || ''
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${C.border}`, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
      {/* Ícono */}
      <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 12, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 3 }}>
          {formatRango(liq.fecha_desde, liq.fecha_hasta)}
        </div>
        <div style={{ fontSize: 12, color: '#636366', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>{liq.total_agentes} agente{liq.total_agentes !== 1 ? 's' : ''}</span>
          <span>· {Number(liq.total_modulos).toFixed(1)} módulos</span>
          <span style={{ fontWeight: 700, color: C.green }}>· {formatPesos(liq.total_monto)}</span>
          {liq.observaciones && <span style={{ color: '#8e8e93' }}>· {liq.observaciones}</span>}
        </div>
        <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 4 }}>
          Generada el {new Date(liq.generado_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          {liq.generado_por_nombre && ` por ${liq.generado_por_nombre}`}
          {' · '}UF {formatPesos(liq.valor_uf)}
        </div>
      </div>

      {/* Descargar TXT */}
      {liq.txt_archivo && (
        <a
          href={`${apiBase}/uploads/${liq.txt_archivo}`}
          download={liq.txt_archivo}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            border: `1.5px solid ${C.border}`, background: '#fff',
            color: C.navy, fontSize: 12, fontWeight: 700,
            textDecoration: 'none', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#eef1f6'; e.currentTarget.style.borderColor = C.navy }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = C.border }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          TXT
        </a>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function CobrosPage() {
  const p = usePermisos(['COBROS_NUEVA_LIQUIDACION', 'COBROS_ACTUALIZAR_UF'])
  const [lista, setLista]       = useState([])
  const [ufData, setUFData]     = useState(null)
  const [cargando, setCargando] = useState(true)
  const [modalNueva, setModalNueva] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [liqs, uf] = await Promise.all([
        api.get('/api/liquidaciones'),
        api.get('/api/liquidaciones/valor-uf'),
      ])
      setLista(liqs)
      setUFData(uf)
    } catch (e) { console.warn(e) }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const accionHeader = p.COBROS_NUEVA_LIQUIDACION
    ? { label: '+ Nueva liquidación', onClick: () => setModalNueva(true) }
    : undefined

  return (
    <AppShell titulo="Cobro" accionHeader={accionHeader}>
      {modalNueva && (
        <ModalNuevaLiquidacion
          ufVigente={ufData?.vigente?.valor}
          onCreada={() => { cargar() }}
          onClose={() => setModalNueva(false)}
        />
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Panel UF */}
        <PanelUF ufData={ufData} onUFCreada={cargar} puedeActualizar={p.COBROS_ACTUALIZAR_UF} />

        {/* Lista liquidaciones */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
            Liquidaciones generadas
          </div>

          {cargando && (
            <div style={{ textAlign: 'center', padding: 60, color: '#8e8e93', fontSize: 14 }}>Cargando…</div>
          )}

          {!cargando && lista.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 40px', background: '#fff', borderRadius: 16, border: `1.5px dashed ${C.border}` }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Sin liquidaciones aún</div>
              <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 20 }}>
                Generá la primera liquidación para calcular los haberes de los agentes LOYS.
              </div>
              {p.COBROS_NUEVA_LIQUIDACION && <button onClick={() => setModalNueva(true)}
                style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + Nueva liquidación
              </button>}
            </div>
          )}

          {!cargando && lista.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lista.map(liq => <CardLiquidacion key={liq.id} liq={liq} />)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
