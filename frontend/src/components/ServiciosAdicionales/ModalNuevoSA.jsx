import { useState } from 'react'
import api from '../../lib/api'

const C = { navy: '#1a2744', border: '#e0e4ed', accent: '#f5c800' }

const INP = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 13,
  color: C.navy, outline: 'none', background: '#fafbfc', fontFamily: 'inherit',
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#b91c1c', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

const DOT_CAMPOS = [
  { key: 'dotacion_agentes',       label: 'Infantes',      color: C.navy,    bg: '#eef1f8' },
  { key: 'dotacion_supervisores',  label: 'Supervisores',  color: '#0f6e56', bg: '#e8f5ee' },
  { key: 'dotacion_motorizados',   label: 'Motorizados',   color: '#6f42c1', bg: '#f0ebff' },
  { key: 'dotacion_choferes',      label: 'Choferes',      color: '#c47f00', bg: '#fff8e6' },
  { key: 'dotacion_choferes_grua', label: 'Chof. grúa',   color: '#b45309', bg: '#fef3c7' },
  { key: 'dotacion_coordinadores', label: 'Coordinadores', color: '#0369a1', bg: '#e0f2fe' },
]

export default function ModalNuevoSA({ onClose, onCreado }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState(null)

  const [form, setForm] = useState({
    nombre: '',
    numero_externo: '',
    evento: '',
    fechas: [],
    fechaInput: '',
    horario_desde: '',
    horario_hasta: '',
    dotacion_agentes: '',
    dotacion_supervisores: '',
    dotacion_motorizados: '',
    dotacion_choferes: '',
    dotacion_choferes_grua: '',
    dotacion_coordinadores: '',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function agregarFecha() {
    const v = form.fechaInput
    if (!v || form.fechas.includes(v)) return
    const sorted = [...form.fechas, v].sort()
    setForm(f => ({ ...f, fechas: sorted, fechaInput: '' }))
  }

  function quitarFecha(f) {
    setForm(s => ({ ...s, fechas: s.fechas.filter(x => x !== f) }))
  }

  function formatChip(iso) {
    const [y, m, d] = iso.split('-')
    const dt = new Date(+y, +m - 1, +d)
    return dt.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  async function guardar() {
    if (!form.nombre.trim()) return setError('El nombre es obligatorio')
    setGuardando(true)
    setError(null)
    try {
      const payload = {
        nombre:                  form.nombre.trim(),
        numero_externo:          form.numero_externo.trim() || null,
        evento:                  form.evento.trim() || null,
        fechas:                  form.fechas,
        horario_desde:           form.horario_desde || null,
        horario_hasta:           form.horario_hasta || null,
        dotacion_agentes:        parseInt(form.dotacion_agentes)       || 0,
        dotacion_supervisores:   parseInt(form.dotacion_supervisores)  || 0,
        dotacion_motorizados:    parseInt(form.dotacion_motorizados)   || 0,
        dotacion_choferes:       parseInt(form.dotacion_choferes)      || 0,
        dotacion_choferes_grua:  parseInt(form.dotacion_choferes_grua) || 0,
        dotacion_coordinadores:  parseInt(form.dotacion_coordinadores) || 0,
      }
      const nuevo = await api.post('/api/servicios-adicionales/directo', payload)
      onCreado(nuevo)
    } catch (e) {
      setError(e.message || 'Error al crear el servicio')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${C.navy}, #243561)`, padding: '20px 28px 18px', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            Servicios adicionales
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Nuevo servicio adicional</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            Creación directa, sin pipeline de OS
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Nombre + Número */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Field label="Nombre del servicio" required>
              <input
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej: Partido San Lorenzo vs Boca"
                style={INP}
                autoFocus
              />
            </Field>
            <Field label="Nº externo" hint="Nro. de su sistema actual">
              <input
                value={form.numero_externo}
                onChange={e => set('numero_externo', e.target.value)}
                placeholder="Ej: 2024-045"
                style={INP}
              />
            </Field>
          </div>

          {/* Evento */}
          <Field label="Evento / motivo">
            <input
              value={form.evento}
              onChange={e => set('evento', e.target.value)}
              placeholder="Ej: Fútbol primera división"
              style={INP}
            />
          </Field>

          {/* Fechas + Horario */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
              Fechas del servicio
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date" value={form.fechaInput}
                onChange={e => set('fechaInput', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregarFecha()}
                style={{ ...INP, flex: 1 }}
              />
              <button type="button" onClick={agregarFecha}
                style={{ padding: '9px 16px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                + Agregar
              </button>
            </div>
            {form.fechas.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {form.fechas.map(f => (
                  <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#eef1f8', color: C.navy, fontSize: 12, fontWeight: 600 }}>
                    {formatChip(f)}
                    <button type="button" onClick={() => quitarFecha(f)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: 0, display: 'flex', lineHeight: 1, fontSize: 14 }}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Horario */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Horario desde">
              <input type="time" value={form.horario_desde} onChange={e => set('horario_desde', e.target.value)} style={INP} />
            </Field>
            <Field label="Horario hasta">
              <input type="time" value={form.horario_hasta} onChange={e => set('horario_hasta', e.target.value)} style={INP} />
            </Field>
          </div>

          {/* Dotación */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Dotación requerida
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {DOT_CAMPOS.map(({ key, label, color, bg }) => (
                <div key={key} style={{ background: bg, borderRadius: 10, border: `1px solid ${C.border}`, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 6 }}>{label}</div>
                  <input
                    type="number" min="0" value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder="0"
                    style={{ ...INP, textAlign: 'center', fontSize: 18, fontWeight: 700, color, padding: '6px 8px', background: '#fff' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafafa', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: '#fff', color: '#636366', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: guardando ? '#aeaeb2' : C.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer' }}
          >
            {guardando ? 'Creando…' : 'Crear servicio'}
          </button>
        </div>
      </div>
    </div>
  )
}
