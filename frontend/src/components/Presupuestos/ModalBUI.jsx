/**
 * ModalBUI.jsx
 * Carga del número y PDF de la BUI (y BUI Complementaria) de un presupuesto aprobado.
 */
import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'

const C = { navy: '#1a2744', border: '#e0e4ed', accent: '#f5c800' }

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', borderRadius: 9,
  border: `1.5px solid ${C.border}`,
  fontSize: 14, color: C.navy, background: '#fff',
  outline: 'none', transition: 'border-color 0.15s',
}

function fmtTamanio(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const IcoUpload = ({ color = '#aeaeb2' }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const IcoPDF = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e24b4a" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
  </svg>
)

/** Zona de drop + input file reutilizable */
function DropZone({ archivo, onArchivo, yaCargoArchivo, inputRef }) {
  const [dragging, setDragging] = useState(false)

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onArchivo(f)
  }

  if (archivo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f0f4ff', border: '1.5px solid #c7d4f0', borderRadius: 10, padding: '12px 14px' }}>
        <IcoPDF />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{archivo.name}</div>
          <div style={{ fontSize: 11, color: '#8e8e93' }}>{fmtTamanio(archivo.size)}</div>
        </div>
        <button onClick={() => onArchivo(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', display: 'flex', padding: 4, borderRadius: 6 }}
          onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
          onMouseLeave={e => e.currentTarget.style.color = '#aeaeb2'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? C.navy : '#d1d5db'}`,
        borderRadius: 11, padding: '18px 16px', textAlign: 'center',
        cursor: 'pointer', background: dragging ? '#f0f4ff' : '#fafafa',
        transition: 'all 0.15s',
      }}
    >
      <IcoUpload color={dragging ? C.navy : '#aeaeb2'} />
      <div style={{ fontSize: 13, fontWeight: 600, color: dragging ? C.navy : '#636366', marginBottom: 3 }}>
        {yaCargoArchivo ? 'Arrastrá el nuevo PDF acá' : 'Arrastrá el PDF acá'}
      </div>
      <div style={{ fontSize: 11, color: '#aeaeb2' }}>o hacé click para seleccionar · PDF, máx. 20 MB</div>
    </div>
  )
}

export default function ModalBUI({ presupuesto, onClose, onGuardado }) {
  // BUI principal
  const [numero,   setNumero]   = useState(presupuesto.bui_numero   ?? '')
  const [archivo,  setArchivo]  = useState(null)

  // BUI Complementaria
  const [mostrarComp, setMostrarComp] = useState(
    !!(presupuesto.bui_comp_numero || presupuesto.bui_comp_archivo)
  )
  const [numeroComp,  setNumeroComp]  = useState(presupuesto.bui_comp_numero ?? '')
  const [archivoComp, setArchivoComp] = useState(null)

  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState(null)

  const overlayRef    = useRef()
  const inputFileRef  = useRef()
  const inputFileComp = useRef()

  const yaCargoArchivo     = !!presupuesto.bui_archivo
  const yaCargoArchivoComp = !!presupuesto.bui_comp_archivo

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  async function guardar() {
    const hayPrincipal = numero.trim() || archivo
    const hayComp      = mostrarComp && (numeroComp.trim() || archivoComp)

    if (!hayPrincipal && !hayComp) {
      setError('Ingresá al menos el número o el archivo de la BUI'); return
    }
    setError(null); setGuardando(true)
    try {
      const form = new FormData()
      if (numero.trim()) form.append('numero',    numero.trim())
      if (archivo)       form.append('archivo',   archivo)
      if (mostrarComp) {
        if (numeroComp.trim())  form.append('comp_numero',  numeroComp.trim())
        if (archivoComp)        form.append('comp_archivo', archivoComp)
      }

      const actualizado = await api.upload(`/api/presupuestos/${presupuesto.id}/bui`, form)
      onGuardado(actualizado)
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,18,40,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 60px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '22px 28px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>Cargar datos de la BUI</div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 3 }}>
              {presupuesto.numero} · <span style={{ fontWeight: 600 }}>{presupuesto.beneficiario}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: 6, borderRadius: 8, display: 'flex', marginLeft: 12 }}
            onMouseEnter={e => e.currentTarget.style.color = C.navy}
            onMouseLeave={e => e.currentTarget.style.color = '#aeaeb2'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>

          {/* ── BUI Principal ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: C.navy, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>1</span>
              BUI Principal
            </div>

            {/* Número */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                Número de BUI
              </label>
              <input
                value={numero}
                onChange={e => { setNumero(e.target.value); setError(null) }}
                placeholder="Ej: BUI-2026-00123"
                autoFocus
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.navy}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            {/* PDF */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                Archivo PDF
                {yaCargoArchivo && !archivo && (
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: '#0f6e56', background: '#e8faf2', padding: '2px 7px', borderRadius: 10, textTransform: 'none', letterSpacing: 0 }}>
                    ✓ Ya cargado — podés reemplazarlo
                  </span>
                )}
              </label>
              <DropZone
                archivo={archivo}
                onArchivo={setArchivo}
                yaCargoArchivo={yaCargoArchivo}
                inputRef={inputFileRef}
              />
              <input ref={inputFileRef} type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) setArchivo(e.target.files[0]); e.target.value = '' }} />
            </div>
          </div>

          {/* ── Separador / botón agregar complementaria ── */}
          {!mostrarComp ? (
            <button
              onClick={() => setMostrarComp(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 0', borderRadius: 10,
                border: `1.5px dashed ${C.border}`, background: 'transparent',
                color: '#636366', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                width: '100%',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.color = C.navy; e.currentTarget.style.background = '#f5f7fb' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = '#636366'; e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Agregar BUI Complementaria
            </button>
          ) : (
            /* ── BUI Complementaria ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#f8f9fc', borderRadius: 14, padding: '18px 20px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, background: '#636366', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>2</span>
                  BUI Complementaria
                </div>
                {/* Quitar complementaria (solo si no había datos previos) */}
                {!presupuesto.bui_comp_numero && !presupuesto.bui_comp_archivo && (
                  <button
                    onClick={() => { setMostrarComp(false); setNumeroComp(''); setArchivoComp(null) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
                    onMouseLeave={e => e.currentTarget.style.color = '#aeaeb2'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Quitar
                  </button>
                )}
              </div>

              {/* Número complementaria */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                  Número de BUI Complementaria
                </label>
                <input
                  value={numeroComp}
                  onChange={e => { setNumeroComp(e.target.value); setError(null) }}
                  placeholder="Ej: BUIC-2026-00045"
                  style={{ ...inputStyle, background: '#fff' }}
                  onFocus={e => e.target.style.borderColor = C.navy}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>

              {/* PDF complementaria */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                  Archivo PDF
                  {yaCargoArchivoComp && !archivoComp && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: '#0f6e56', background: '#e8faf2', padding: '2px 7px', borderRadius: 10, textTransform: 'none', letterSpacing: 0 }}>
                      ✓ Ya cargado — podés reemplazarlo
                    </span>
                  )}
                </label>
                <DropZone
                  archivo={archivoComp}
                  onArchivo={setArchivoComp}
                  yaCargoArchivo={yaCargoArchivoComp}
                  inputRef={inputFileComp}
                />
                <input ref={inputFileComp} type="file" accept=".pdf" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files[0]) setArchivoComp(e.target.files[0]); e.target.value = '' }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafafa', borderRadius: '0 0 18px 18px', flexShrink: 0 }}>
          <button onClick={onClose} disabled={guardando}
            style={{ padding: '9px 20px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7 }}>
            {guardando ? (
              <>
                <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Guardando…
              </>
            ) : 'Guardar BUI'}
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </button>
        </div>

      </div>
    </div>
  )
}
