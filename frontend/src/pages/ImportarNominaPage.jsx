/**
 * ImportarNominaPage.jsx
 * Sincronización de nómina desde la DB de RR.HH. (presentismo @ 10.78.7.23)
 * Solo accesible para rol admin.
 */
import { useState } from 'react'
import AppShell from '../components/AppShell'
import api from '../lib/api'

const C = {
  navy:   '#1a2744',
  green:  '#0f6e56',
  red:    '#c0392b',
  yellow: '#c47f00',
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div style={{ background: bg || '#f9f9fb', borderRadius: 14, padding: '20px 24px', flex: 1, minWidth: 140, textAlign: 'center', border: '0.5px solid #e5e5ea' }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: color || C.navy, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: color || '#636366', fontWeight: 600, marginTop: 5 }}>{label}</div>
    </div>
  )
}

// estados: idle | resetting | previewing | preview | confirming | done | error
export default function ImportarNominaPage() {
  const [estado,    setEstado]    = useState('idle')
  const [preview,   setPreview]   = useState(null)
  const [resultado, setResultado] = useState(null)
  const [error,     setError]     = useState(null)
  const [conReset,  setConReset]  = useState(false)

  async function hacerReset() {
    setEstado('resetting')
    setError(null)
    try {
      await api.post('/api/profiles/sync-nomina/reset-db', {})
      // Después del reset, ir directo al preview
      await cargarPreview()
    } catch (e) {
      setError(e.message || 'Error durante el reset de la base de datos')
      setEstado('error')
    }
  }

  async function cargarPreview() {
    setEstado('previewing')
    setError(null)
    try {
      const data = await api.get('/api/profiles/sync-nomina/preview')
      setPreview(data)
      setEstado('preview')
    } catch (e) {
      setError(e.message || 'No se pudo conectar con la base de datos de RR.HH.')
      setEstado('error')
    }
  }

  async function confirmarSync() {
    setEstado('confirming')
    setError(null)
    try {
      const data = await api.post('/api/profiles/sync-nomina/ejecutar', {})
      setResultado(data)
      setEstado('done')
    } catch (e) {
      setError(e.message || 'Error durante la sincronización')
      setEstado('error')
    }
  }

  function resetear() {
    setEstado('idle'); setPreview(null); setResultado(null); setError(null); setConReset(false)
  }

  return (
    <AppShell titulo="Nómina">
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px', maxWidth: 860 }}>

        {/* Header info */}
        <div style={{ background: '#f0f4ff', border: '1px solid #c7d4f0', borderRadius: 14, padding: '16px 20px', marginBottom: 28, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Sincronización con RR.HH.</div>
            <div style={{ fontSize: 12, color: '#3c3c43', lineHeight: 1.7 }}>
              Conecta directamente con la base de datos de <strong>RR.HH. (presentismo @ 10.78.7.23)</strong> y carga la nómina.<br/>
              • <strong>Carga limpia:</strong> borra todos los datos operacionales (misiones, OS, SS.AA., etc.) y recarga la nómina desde cero<br/>
              • <strong>Solo actualizar:</strong> actualiza agentes existentes, crea nuevos, desactiva los que ya no están — sin tocar el resto del sistema
            </div>
          </div>
        </div>

        {/* ── IDLE ── */}
        {estado === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Opción A: Carga limpia */}
            <div style={{ background: '#fff', border: `2px solid ${conReset ? C.red : '#e5e5ea'}`, borderRadius: 16, padding: '20px 24px', cursor: 'pointer', transition: 'border-color .15s' }}
              onClick={() => setConReset(true)}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${conReset ? C.red : '#c7c7cc'}`, background: conReset ? C.red : '#fff', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {conReset && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 4 }}>
                    🗑️ Carga limpia — borrar todo y recargar desde RR.HH.
                  </div>
                  <div style={{ fontSize: 12, color: '#636366', lineHeight: 1.6 }}>
                    Elimina <strong>todos los datos del sistema</strong> (misiones, órdenes de servicio, servicios adicionales, cobros, facturación, etc.) y recarga la nómina completa desde cero.<br/>
                    <strong style={{ color: C.red }}>Esta acción no se puede deshacer.</strong> Usala para la carga inicial o cuando querés empezar de cero.
                  </div>
                </div>
              </div>
            </div>

            {/* Opción B: Solo sync */}
            <div style={{ background: '#fff', border: `2px solid ${!conReset ? C.navy : '#e5e5ea'}`, borderRadius: 16, padding: '20px 24px', cursor: 'pointer', transition: 'border-color .15s' }}
              onClick={() => setConReset(false)}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${!conReset ? C.navy : '#c7c7cc'}`, background: !conReset ? C.navy : '#fff', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!conReset && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 4 }}>
                    🔄 Solo actualizar nómina
                  </div>
                  <div style={{ fontSize: 12, color: '#636366', lineHeight: 1.6 }}>
                    Actualiza los datos de los agentes existentes, crea los nuevos y desactiva los que ya no están en RR.HH.<br/>
                    <strong>No modifica</strong> misiones, órdenes de servicio ni ningún otro dato operacional.
                  </div>
                </div>
              </div>
            </div>

            {/* Botón */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={conReset ? hacerReset : cargarPreview}
                style={{ padding: '12px 32px', borderRadius: 12, border: 'none', background: conReset ? C.red : C.navy, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                </svg>
                {conReset ? 'Resetear y cargar desde RR.HH.' : 'Consultar RR.HH.'}
              </button>
            </div>
          </div>
        )}

        {/* ── RESETEANDO ── */}
        {estado === 'resetting' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 48, height: 48, border: `4px solid #fecaca`, borderTopColor: C.red, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: C.red, marginBottom: 6 }}>Limpiando base de datos…</div>
            <div style={{ fontSize: 13, color: '#8e8e93' }}>Eliminando todos los datos operacionales</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* ── CARGANDO PREVIEW ── */}
        {estado === 'previewing' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 48, height: 48, border: '4px solid #e5e5ea', borderTopColor: C.navy, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Consultando RR.HH.…</div>
            <div style={{ fontSize: 13, color: '#8e8e93' }}>Conectando con la base de datos de presentismo</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {estado === 'preview' && preview && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Vista previa — {preview.total_rrhh} agentes activos en RR.HH.
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <StatCard icon="✏️" label="Se actualizan" value={preview.actualizados} color={C.navy}  bg="#eef1f8" />
              <StatCard icon="✨" label="Se crean"      value={preview.nuevos}       color={C.green} bg="#e8faf2" />
              <StatCard icon="🔕" label="Se desactivan" value={preview.bajas}        color={preview.bajas > 0 ? C.yellow : '#8e8e93'} bg={preview.bajas > 0 ? '#fff8e6' : '#f5f5f7'} />
            </div>

            {preview.muestra_nuevos?.length > 0 && (
              <div style={{ marginBottom: 16, background: '#fff', border: '0.5px solid #e5e5ea', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: '#e8faf2', fontSize: 12, fontWeight: 700, color: C.green }}>
                  ✨ Muestra de agentes nuevos (primeros {preview.muestra_nuevos.length})
                </div>
                {preview.muestra_nuevos.map((a, i) => (
                  <div key={i} style={{ padding: '9px 16px', borderTop: i > 0 ? '0.5px solid #f0f0f5' : 'none', display: 'flex', gap: 16, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: C.navy, minWidth: 60 }}>{a.legajo}</span>
                    <span style={{ flex: 1 }}>{a.nombre}</span>
                    <span style={{ color: '#8e8e93', fontSize: 12 }}>{a.base}</span>
                  </div>
                ))}
              </div>
            )}

            {preview.muestra_bajas?.length > 0 && (
              <div style={{ marginBottom: 16, background: '#fff', border: '0.5px solid #e5e5ea', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: '#fff8e6', fontSize: 12, fontWeight: 700, color: C.yellow }}>
                  🔕 Agentes que se desactivan (primeros {preview.muestra_bajas.length})
                </div>
                {preview.muestra_bajas.map((a, i) => (
                  <div key={i} style={{ padding: '9px 16px', borderTop: i > 0 ? '0.5px solid #f0f0f5' : 'none', display: 'flex', gap: 16, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: C.navy, minWidth: 60 }}>{a.legajo}</span>
                    <span style={{ flex: 1 }}>{a.nombre}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: 12, color: '#78350f' }}>
              <strong>Agentes nuevos:</strong> Se crean con contraseña temporal igual a su CUIT (sin guiones). Deberán cambiarla en el primer ingreso.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={resetear}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e5ea', background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarSync}
                style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Confirmar sincronización
              </button>
            </div>
          </>
        )}

        {/* ── SINCRONIZANDO ── */}
        {estado === 'confirming' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 48, height: 48, border: '4px solid #e5e5ea', borderTopColor: C.navy, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Sincronizando nómina…</div>
            <div style={{ fontSize: 13, color: '#8e8e93' }}>Esto puede tardar unos segundos. No cerrés la página.</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* ── RESULTADO ── */}
        {estado === 'done' && resultado && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <StatCard icon="✨" label="Agentes creados"      value={resultado.creados}      color={C.green}  bg="#e8faf2" />
              <StatCard icon="✏️" label="Agentes actualizados" value={resultado.actualizados} color={C.navy}   bg="#eef1f8" />
              <StatCard icon="🔕" label="Desactivados"          value={resultado.desactivados} color={C.yellow} bg="#fff8e6" />
              <StatCard icon="⚠️" label="Con error"             value={resultado.errores?.length ?? 0} color={resultado.errores?.length ? C.red : '#8e8e93'} bg={resultado.errores?.length ? '#fdecea' : '#f5f5f7'} />
            </div>

            {resultado.errores?.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Registros con error</div>
                {resultado.errores.slice(0, 20).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#7f1d1d', padding: '3px 0', borderBottom: i < resultado.errores.length - 1 ? '1px solid #fecaca' : 'none' }}>
                    <strong>{e.legajo} — {e.nombre}:</strong> {e.error}
                  </div>
                ))}
                {resultado.errores.length > 20 && (
                  <div style={{ fontSize: 11, color: '#c0392b', marginTop: 6 }}>... y {resultado.errores.length - 20} más</div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={resetear}
                style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Nueva sincronización
              </button>
            </div>
          </>
        )}

        {/* ── ERROR ── */}
        {estado === 'error' && (
          <div>
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Error</div>
                <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>{error}</div>
              </div>
            </div>
            <button onClick={resetear}
              style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid #e5e5ea', background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Volver
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
