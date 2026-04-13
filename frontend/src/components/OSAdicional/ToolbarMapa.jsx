/**
 * ToolbarMapa.jsx — v3
 * Toolbar Apple-style: flotante, pill, sin soviético.
 * PanelElemento: panel lateral minimalista post-dibujo.
 */
import { useState, useEffect } from 'react'

const HERRAMIENTAS = [
  { id: 'mover',         icon: '✦', label: 'Mover'  },
  { id: 'punto_control', icon: '●', label: 'Punto'  },
  { id: 'tramo',         icon: '╌', label: 'Tramo'  },
  { id: 'zona_area',     icon: '▢', label: 'Area'   },
  { id: 'desvio',        icon: '▲', label: 'Desvio' },
]

export function ToolbarMapa({ herramienta, onCambiarHerramienta, faseActiva, fases, filtroFase, onCambiarFiltro }) {
  const fase = fases.find(f => f.id === faseActiva)

  return (
    <>
      {/* Toolbar central */}
      <div style={{
        position:'absolute', top:14, left:'50%', transform:'translateX(-50%)',
        zIndex:1000, display:'flex', alignItems:'center',
        background:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)',
        border:'0.5px solid rgba(0,0,0,0.08)',
        borderRadius:16, padding:'5px 6px',
        boxShadow:'0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        gap:2,
      }}>
        {HERRAMIENTAS.map(h => {
          const activa = herramienta === h.id
          return (
            <button key={h.id} title={h.label}
              onClick={() => onCambiarHerramienta(h.id)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                gap:2, padding:'6px 13px', borderRadius:11, border:'none',
                cursor:'pointer', transition:'all 0.12s',
                background: activa ? (fase?.color || '#1a2744') : 'transparent',
                color: activa ? '#fff' : '#636366',
                minWidth:48,
              }}
              onMouseEnter={e => { if (!activa) e.currentTarget.style.background='#f0f0f5' }}
              onMouseLeave={e => { if (!activa) e.currentTarget.style.background='transparent' }}>
              <span style={{ fontSize:14, lineHeight:1 }}>{h.icon}</span>
              <span style={{ fontSize:9, fontWeight:activa?700:500, letterSpacing:'0.02em', opacity: activa?1:0.7 }}>{h.label}</span>
            </button>
          )
        })}

        {/* Separador + estado de fase activa */}
        <div style={{ width:'0.5px', height:32, background:'#e5e5ea', margin:'0 4px' }}/>
        <div style={{ padding:'4px 10px', fontSize:11, whiteSpace:'nowrap' }}>
          {fase ? (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:fase.color }}/>
              <span style={{ color:'#1d1d1f', fontWeight:600, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis' }}>{fase.nombre}</span>
            </div>
          ) : (
            <span style={{ color:'#aeaeb2' }}>Sin fase activa</span>
          )}
        </div>
      </div>

      {/* Filtro fases — esquina superior derecha */}
      {fases.length > 0 && (
        <div style={{
          position:'absolute', top:14, right:14, zIndex:1000,
          background:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)',
          border:'0.5px solid rgba(0,0,0,0.08)',
          borderRadius:14, padding:'10px 14px',
          boxShadow:'0 4px 24px rgba(0,0,0,0.08)',
          minWidth:148,
        }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#aeaeb2', letterSpacing:'0.06em', marginBottom:8 }}>MOSTRAR</div>
          <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', marginBottom:7 }}>
            <input type="radio" name="filtro-fase" value="todas"
              checked={filtroFase === 'todas'} onChange={() => onCambiarFiltro('todas')}
              style={{ accentColor:'#1a2744', width:12, height:12 }}/>
            <span style={{ fontSize:12, color:'#1d1d1f', fontWeight:500 }}>Todas</span>
          </label>
          {fases.map(fase => (
            <label key={fase.id} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', marginBottom:5 }}>
              <input type="radio" name="filtro-fase" value={fase.id}
                checked={filtroFase === fase.id} onChange={() => onCambiarFiltro(fase.id)}
                style={{ accentColor:fase.color, width:12, height:12 }}/>
              <div style={{ width:8, height:8, borderRadius:'50%', background:fase.color, flexShrink:0 }}/>
              <span style={{ fontSize:11, color:'#1d1d1f', fontWeight:500, maxWidth:96, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {fase.nombre}
              </span>
            </label>
          ))}
        </div>
      )}
    </>
  )
}

// ── Panel elemento activo ─────────────────────────────────────
export function PanelElemento({ elemento, faseColor, onActualizar, onEliminar, onCerrar }) {
  const [form,   setForm]   = useState({ nombre: elemento?.nombre || '', instruccion: elemento?.instruccion || '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({ nombre: elemento?.nombre || '', instruccion: elemento?.instruccion || '' })
  }, [elemento?.id])

  if (!elemento) return null

  const TIPO_LABEL = {
    punto_control: 'Punto de control',
    tramo:         'Tramo',
    zona_area:     'Area',
    desvio:        'Desvio',
  }

  async function guardar() {
    setSaving(true)
    await onActualizar(elemento.id, elemento.fase_id, form)
    setSaving(false)
  }

  return (
    <div style={{
      position:'absolute', bottom:16, right:16, width:230, zIndex:1000,
      background:'rgba(255,255,255,0.96)', backdropFilter:'blur(12px)',
      border:'0.5px solid rgba(0,0,0,0.08)',
      borderRadius:16, padding:'14px 16px',
      boxShadow:'0 8px 32px rgba(0,0,0,0.12)',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: faseColor || '#1a2744' }}/>
          <span style={{ fontSize:12, fontWeight:700, color:'#1a2744' }}>
            {TIPO_LABEL[elemento.tipo] || elemento.tipo}
          </span>
        </div>
        <button onClick={onCerrar}
          style={{ background:'#f5f5f7', border:'none', borderRadius:8, cursor:'pointer', color:'#8e8e93', padding:'5px 7px', display:'flex', lineHeight:1 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style={{ marginBottom:9 }}>
        <div style={{ fontSize:10, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.05em', marginBottom:4 }}>NOMBRE</div>
        <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder="Nombre del elemento"
          style={{ width:'100%', fontSize:13, padding:'8px 10px', border:'none', borderRadius:9, background:'#f5f5f7', color:'#1d1d1f', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
      </div>

      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:600, color:'#aeaeb2', letterSpacing:'0.05em', marginBottom:4 }}>INSTRUCCION</div>
        <textarea value={form.instruccion} onChange={e => setForm(f => ({ ...f, instruccion: e.target.value }))}
          placeholder="Instruccion para el agente..."
          style={{ width:'100%', fontSize:12, padding:'8px 10px', border:'none', borderRadius:9, background:'#f5f5f7', color:'#1d1d1f', outline:'none', resize:'none', minHeight:56, boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.5 }}/>
      </div>

      <div style={{ display:'flex', gap:7 }}>
        <button
          onClick={() => { if (window.confirm('Eliminar este elemento?')) onEliminar(elemento.id, elemento.fase_id) }}
          style={{ padding:'8px 11px', borderRadius:9, border:'none', background:'#fce8e8', color:'#e24b4a', fontSize:11, fontWeight:600, cursor:'pointer' }}>
          Borrar
        </button>
        <button onClick={guardar} disabled={saving}
          style={{ flex:1, padding:'8px', borderRadius:9, border:'none', background:'#1a2744', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Leyenda ───────────────────────────────────────────────────
export function LeyendaMapa({ fases, filtroFase }) {
  const visibles = filtroFase === 'todas' ? fases : fases.filter(f => f.id === filtroFase)
  if (visibles.length === 0) return null

  return (
    <div style={{
      position:'absolute', bottom:16, left:10, zIndex:1000,
      background:'rgba(255,255,255,0.92)', backdropFilter:'blur(10px)',
      border:'0.5px solid rgba(0,0,0,0.08)',
      borderRadius:12, padding:'9px 13px',
      pointerEvents:'none',
      boxShadow:'0 2px 12px rgba(0,0,0,0.07)',
    }}>
      {visibles.map(fase => (
        <div key={fase.id} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:fase.color }}/>
          <span style={{ fontSize:11, color:'#1d1d1f', fontWeight:600 }}>{fase.nombre}</span>
          {(fase.horario_desde || fase.horario_hasta) && (
            <span style={{ fontSize:10, color:'#8e8e93' }}>
              {[fase.horario_desde?.slice(0,5), fase.horario_hasta?.slice(0,5)].filter(Boolean).join('–')}hs
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
