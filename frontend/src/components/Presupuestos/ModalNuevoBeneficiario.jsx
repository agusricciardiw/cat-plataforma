/**
 * ModalNuevoBeneficiario.jsx
 * Modal para crear un beneficiario con datos básicos + documentación adjunta.
 *
 * Flujo:
 * 1. Usuario completa datos + opcionalmente arrastra documentos
 * 2. Al guardar → POST /api/beneficiarios → luego sube los docs uno a uno
 * 3. onCreado(beneficiario) al terminar
 */
import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'

const C = { navy: '#1a2744', border: '#e0e4ed', accent: '#f5c800', bg: '#f8f9fc' }

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 8,
  border: `1.5px solid ${C.border}`,
  fontSize: 13, color: C.navy, background: '#fff',
  outline: 'none', transition: 'border-color 0.15s',
}

function Campo({ label, required, error, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#c0392b' }}> *</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 3 }}>{error}</div>}
    </div>
  )
}

// ── Íconos por tipo de archivo ────────────────────────────────
function IconoArchivo({ mime, nombre }) {
  const ext = (nombre || '').split('.').pop().toLowerCase()
  if (mime?.includes('pdf') || ext === 'pdf') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e24b4a" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
      </svg>
    )
  }
  if (mime?.includes('word') || ext === 'doc' || ext === 'docx') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
      </svg>
    )
  }
  if (mime?.includes('sheet') || mime?.includes('excel') || ext === 'xls' || ext === 'xlsx') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f6e56" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function fmtTamanio(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Componente principal ──────────────────────────────────────
export default function ModalNuevoBeneficiario({ onClose, onCreado }) {
  // Datos básicos
  const [razon_social, setRazonSocial] = useState('')
  const [nombre,       setNombre]      = useState('')
  const [email,        setEmail]       = useState('')
  const [telefono,     setTelefono]    = useState('')
  const [cuit,         setCuit]        = useState('')
  const [errores,      setErrores]     = useState({})

  // Documentos en cola (antes de guardar)
  const [docs,       setDocs]       = useState([])   // [{ file, nombre, id }]
  const [dragging,   setDragging]   = useState(false)

  // Estado de guardado
  const [guardando,  setGuardando]  = useState(false)
  const [progreso,   setProgreso]   = useState('')   // texto de progreso

  const overlayRef = useRef()
  const inputFileRef = useRef()

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  function validar() {
    const e = {}
    if (!razon_social.trim()) e.razon_social = 'Requerido'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  // ── Gestión de archivos ───────────────────────────────────
  function agregarArchivos(files) {
    const nuevos = Array.from(files).map(file => ({
      id:     Math.random().toString(36).slice(2),
      file,
      nombre: file.name,  // editable por el usuario
    }))
    setDocs(prev => [...prev, ...nuevos])
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    agregarArchivos(e.dataTransfer.files)
  }

  function quitarDoc(id) {
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  function renombrarDoc(id, nombre) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, nombre } : d))
  }

  // ── Guardar ───────────────────────────────────────────────
  async function guardar() {
    if (!validar()) return
    setGuardando(true)
    try {
      // 1. Crear beneficiario
      setProgreso('Guardando beneficiario…')
      const b = await api.post('/api/beneficiarios', { razon_social, nombre, email, telefono, cuit })

      // 2. Subir documentos uno a uno
      if (docs.length > 0) {
        for (let i = 0; i < docs.length; i++) {
          const d = docs[i]
          setProgreso(`Subiendo documento ${i + 1} de ${docs.length}…`)
          const formData = new FormData()
          formData.append('archivo', d.file)
          formData.append('nombre', d.nombre || d.file.name)

            await api.upload(`/api/beneficiarios/${b.id}/documentos`, formData)
        }
      }

      onCreado(b)
    } catch (err) {
      alert('Error al guardar: ' + (err.error || err.message || 'Error desconocido'))
    } finally {
      setGuardando(false)
      setProgreso('')
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,18,40,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 18,
        width: '100%', maxWidth: 520,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
      }}>

        {/* Header */}
        <div style={{ padding: '22px 28px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>Nuevo beneficiario</div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>Organismo o empresa que contrata el servicio</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: 6, borderRadius: 8, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = C.navy}
            onMouseLeave={e => e.currentTarget.style.color = '#aeaeb2'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Datos básicos ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Datos del beneficiario
          </div>

          <Campo label="Razón social" required error={errores.razon_social}>
            <input
              value={razon_social}
              onChange={e => { setRazonSocial(e.target.value); setErrores(p => ({ ...p, razon_social: null })) }}
              placeholder="Ej: Ministerio de Transporte GCBA"
              autoFocus
              style={{ ...inputStyle, borderColor: errores.razon_social ? '#c0392b' : C.border }}
              onFocus={e => e.target.style.borderColor = C.navy}
              onBlur={e => e.target.style.borderColor = errores.razon_social ? '#c0392b' : C.border}
            />
          </Campo>

          <Campo label="CUIT">
            <input value={cuit} onChange={e => setCuit(e.target.value)} placeholder="Ej: 30-12345678-9"
              style={inputStyle} onFocus={e => e.target.style.borderColor = C.navy} onBlur={e => e.target.style.borderColor = C.border} />
          </Campo>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Campo label="Nombre de contacto">
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Juan Pérez"
                style={inputStyle} onFocus={e => e.target.style.borderColor = C.navy} onBlur={e => e.target.style.borderColor = C.border} />
            </Campo>
            <Campo label="Teléfono de contacto">
              <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: 11 1234-5678"
                style={inputStyle} onFocus={e => e.target.style.borderColor = C.navy} onBlur={e => e.target.style.borderColor = C.border} />
            </Campo>
          </div>

          <Campo label="Email de contacto">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ej: contacto@ministerio.gob.ar"
              style={inputStyle} onFocus={e => e.target.style.borderColor = C.navy} onBlur={e => e.target.style.borderColor = C.border} />
          </Campo>

          {/* ── Documentación ── */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Documentación <span style={{ fontWeight: 400, color: '#c7c7cc', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
              </div>
              <button
                type="button"
                onClick={() => inputFileRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.color = C.navy }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = '#636366' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Agregar archivo
              </button>
              <input
                ref={inputFileRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={e => { agregarArchivos(e.target.files); e.target.value = '' }}
              />
            </div>

            {/* Zona de drop */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => docs.length === 0 && inputFileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? C.navy : '#d1d5db'}`,
                borderRadius: 12, padding: docs.length === 0 ? '24px 16px' : '12px 16px',
                background: dragging ? '#f0f4ff' : C.bg,
                transition: 'all 0.15s', cursor: docs.length === 0 ? 'pointer' : 'default',
                minHeight: 60,
              }}
            >
              {docs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aeaeb2' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Arrastrá archivos acá</div>
                  <div style={{ fontSize: 11 }}>PDF, Word, Excel, imágenes · Máx. 20 MB c/u</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {docs.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 9, padding: '8px 10px', border: `1px solid ${C.border}` }}>
                      <div style={{ flexShrink: 0 }}>
                        <IconoArchivo mime={d.file.type} nombre={d.file.name} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Nombre editable */}
                        <input
                          value={d.nombre}
                          onChange={e => renombrarDoc(d.id, e.target.value)}
                          style={{ width: '100%', border: 'none', outline: 'none', fontSize: 12, fontWeight: 600, color: C.navy, background: 'transparent', padding: 0 }}
                          onClick={e => e.stopPropagation()}
                        />
                        <div style={{ fontSize: 11, color: '#aeaeb2' }}>
                          {d.file.name} · {fmtTamanio(d.file.size)}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); quitarDoc(d.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: 4, borderRadius: 6, display: 'flex', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
                        onMouseLeave={e => e.currentTarget.style.color = '#aeaeb2'}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {docs.length > 0 && (
              <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 6 }}>
                💡 Podés editar el nombre de cada documento antes de guardar
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', borderRadius: '0 0 18px 18px', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: '#8e8e93' }}>
            {progreso || (docs.length > 0 ? `${docs.length} documento${docs.length > 1 ? 's' : ''} para adjuntar` : '')}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={guardando}
              style={{ padding: '9px 20px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7 }}>
              {guardando ? (
                <>
                  <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  {progreso || 'Guardando…'}
                </>
              ) : 'Guardar beneficiario'}
            </button>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
