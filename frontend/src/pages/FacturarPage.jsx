/**
 * FacturarPage.jsx — Página pública para que el agente remita su factura.
 * Accedida via /facturar/:token (link único enviado por mail).
 */
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function fmtFecha(f) {
  if (!f) return '—'
  return new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtMonto(n) {
  return Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
}

const INP = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
  border: '1.5px solid #e5e5ea', background: '#f9f9fb', fontSize: 15,
  color: '#1d1d1f', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s',
}
const LBL = { fontSize: 12, fontWeight: 700, color: '#636366', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }

export default function FacturarPage() {
  const { token } = useParams()
  const [item, setItem]       = useState(null)
  const [estado, setEstado]   = useState('cargando') // cargando | formulario | enviando | exito | error | cerrado
  const [errorMsg, setErrorMsg] = useState('')

  const [facturaNum, setFacturaNum]   = useState('')
  const [facturaFecha, setFacturaFecha] = useState('')
  const [archivo, setArchivo]         = useState(null)
  const inputRef = useRef()

  useEffect(() => {
    fetch(`${API}/api/facturacion/form/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setEstado('cerrado'); setErrorMsg(d.error); return }
        setItem(d)
        if (d.estado === 'aprobada') { setEstado('cerrado'); setErrorMsg('Esta factura ya fue aprobada.'); return }
        setEstado('formulario')
      })
      .catch(() => { setEstado('error'); setErrorMsg('No se pudo cargar el formulario') })
  }, [token])

  async function enviar(e) {
    e.preventDefault()
    if (!facturaNum.trim()) { setErrorMsg('El número de factura es obligatorio'); return }
    setErrorMsg('')
    setEstado('enviando')

    const fd = new FormData()
    fd.append('factura_numero', facturaNum.trim())
    if (facturaFecha) fd.append('factura_fecha', facturaFecha)
    if (archivo) fd.append('factura_archivo', archivo)

    try {
      const r = await fetch(`${API}/api/facturacion/form/${token}`, { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) { setEstado('formulario'); setErrorMsg(d.error || 'Error al enviar'); return }
      setEstado('exito')
    } catch { setEstado('formulario'); setErrorMsg('Error de conexión') }
  }

  const datos = item?.datos_enviados || {}

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1a2744 0%, #243561 40%, #f5f5f7 40%)', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '40px 16px 60px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, paddingLeft: 4 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Dirección General · CAT · GCBA</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            {estado === 'cargando' ? 'Cargando...' : 'Remisión de factura'}
          </div>
          {item?.servicio_nombre && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{item.servicio_nombre}</div>
          )}
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 8px 40px rgba(26,39,68,0.18)', overflow: 'hidden' }}>

          {estado === 'cargando' && (
            <div style={{ padding: 48, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Cargando...</div>
          )}

          {(estado === 'cerrado' || estado === 'error') && (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{estado === 'cerrado' ? '🔒' : '⚠️'}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>
                {estado === 'cerrado' ? 'Formulario no disponible' : 'Error'}
              </div>
              <div style={{ fontSize: 13, color: '#8e8e93' }}>{errorMsg}</div>
            </div>
          )}

          {estado === 'exito' && (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a2744', marginBottom: 8 }}>¡Factura remitida!</div>
              <div style={{ fontSize: 13, color: '#636366', lineHeight: 1.6 }}>
                Tu factura fue registrada correctamente.<br />
                El equipo de RRHH la revisará y te notificará ante cualquier observación.
              </div>
            </div>
          )}

          {(estado === 'formulario' || estado === 'enviando') && item && (
            <form onSubmit={enviar}>
              {/* Banner */}
              <div style={{ background: 'linear-gradient(135deg, #1a2744, #243561)', padding: '20px 24px' }}>
                <div style={{ display: 'inline-block', background: 'rgba(245,200,0,0.15)', border: '1px solid rgba(245,200,0,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#f5c800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Factura Tipo C
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{item.nombre_completo}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>CUIL: {item.cuil}</div>
              </div>

              {/* Datos a usar */}
              <div style={{ background: '#f5f5f7', padding: '16px 24px', borderBottom: '1px solid #e5e5ea' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Datos para emitir la factura en AFIP
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                  {[
                    ['Receptor', datos.razon_social_receptor || item.razon_social_receptor],
                    ['CUIT receptor', datos.cuit_receptor || item.cuit_receptor],
                    ['Concepto', datos.concepto || item.concepto],
                    ['Período', `${fmtFecha(datos.periodo_desde || item.periodo_desde)} al ${fmtFecha(datos.periodo_hasta || item.periodo_hasta)}`],
                    ['Módulos', datos.modulos],
                    ['Monto', datos.monto ? fmtMonto(datos.monto) : '—'],
                    ['Vencimiento', fmtFecha(datos.fecha_vencimiento || item.fecha_vencimiento)],
                    ['Tipo', 'C'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 600 }}>{k}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744' }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estado subsanación */}
              {item.estado === 'subsanacion' && (
                <div style={{ background: '#fff3cd', borderBottom: '1px solid #ffd700', padding: '12px 24px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#856404" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#856404', marginBottom: 2 }}>Subsanación requerida</div>
                    <div style={{ fontSize: 12, color: '#856404' }}>{item.observaciones_rrhh}</div>
                  </div>
                </div>
              )}

              {/* Form */}
              <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div>
                  <label style={LBL}>Número de factura <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input
                    value={facturaNum} onChange={e => setFacturaNum(e.target.value)}
                    placeholder="Ej: 0001-00000123"
                    style={INP}
                    onFocus={e => e.target.style.borderColor = '#1a2744'}
                    onBlur={e => e.target.style.borderColor = '#e5e5ea'}
                  />
                  <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 4 }}>Tal como figura en el comprobante de AFIP</div>
                </div>

                <div>
                  <label style={LBL}>Fecha de emisión</label>
                  <input
                    type="date" value={facturaFecha} onChange={e => setFacturaFecha(e.target.value)}
                    style={INP}
                    onFocus={e => e.target.style.borderColor = '#1a2744'}
                    onBlur={e => e.target.style.borderColor = '#e5e5ea'}
                  />
                </div>

                {/* Upload PDF */}
                <div>
                  <label style={LBL}>Adjuntar factura en PDF</label>
                  <div
                    onClick={() => inputRef.current?.click()}
                    style={{
                      border: `2px dashed ${archivo ? '#0f6e56' : '#e5e5ea'}`,
                      borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                      cursor: 'pointer', background: archivo ? '#f0fdf4' : '#fafbfc',
                      transition: 'all 0.2s',
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setArchivo(f) }}
                  >
                    <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                      onChange={e => setArchivo(e.target.files[0])} />
                    {archivo ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f6e56" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f6e56' }}>{archivo.name}</span>
                        <button onClick={e => { e.stopPropagation(); setArchivo(null) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', fontSize: 18, lineHeight: 1 }}>×</button>
                      </div>
                    ) : (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="1.5" style={{ marginBottom: 8 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#636366' }}>Subir factura</div>
                        <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 3 }}>PDF, JPG o PNG · Recomendado</div>
                      </>
                    )}
                  </div>
                </div>

                {errorMsg && (
                  <div style={{ background: '#FCEBEB', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#A32D2D', fontWeight: 500 }}>
                    {errorMsg}
                  </div>
                )}

                <button type="submit" disabled={estado === 'enviando'}
                  style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: estado === 'enviando' ? '#aeaeb2' : '#1a2744', color: '#fff', fontSize: 15, fontWeight: 700, cursor: estado === 'enviando' ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                  {estado === 'enviando' ? 'Enviando...' : 'Remitir factura'}
                </button>

                <div style={{ fontSize: 11, color: '#c7c7cc', textAlign: 'center', lineHeight: 1.5 }}>
                  Este link es personal e intransferible. Solo podés remitir una vez por solicitud.
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
