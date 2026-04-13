/**
 * MapaAdicional.jsx — v8
 * + Buscador Nominatim (OSM) — reemplaza USIG /suggest/ que no devuelve JSON desde el browser
 * + Popup flotante posicionado sobre el elemento
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'

const CABA_CENTER = [-34.603, -58.450]
const ZOOM_INIT   = 14

const TOOL_PM = {
  punto_control: 'Marker',
  tramo:         'Line',
  zona_area:     'Polygon',
  desvio:        'Marker',
}

const TIPO_LABEL = { punto_control:'Punto', tramo:'Tramo', zona_area:'Area', desvio:'Desvio' }

function crearIcono(color, tipo, activo = false) {
  const isTriangle = tipo === 'desvio'
  const size = activo ? 30 : 26
  const svg = isTriangle
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <polygon points="12,3 22,21 2,21" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
       </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="${color}" stroke="white" stroke-width="${activo ? 3 : 2}"/>
       </svg>`
  const ring = activo ? `box-shadow:0 0 0 3px ${color}44;border-radius:50%;` : ''
  return L.divIcon({
    html: `<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3));${ring}">${svg}</div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2], className: '',
  })
}

function layerToGeometria(layer) {
  if (layer instanceof L.Marker) {
    const { lat, lng } = layer.getLatLng()
    return { type: 'Point', coordinates: [lng, lat] }
  }
  if (layer instanceof L.Polygon) {
    const latlngs = layer.getLatLngs()[0]
    const coords = latlngs.map(p => [p.lng, p.lat])
    coords.push(coords[0])
    return { type: 'Polygon', coordinates: [coords] }
  }
  if (layer instanceof L.Polyline) {
    const latlngs = layer.getLatLngs()
    return { type: 'LineString', coordinates: latlngs.map(p => [p.lng, p.lat]) }
  }
  return null
}

function getAnchorPoint(map, geo) {
  if (!geo) return null
  try {
    if (geo.type === 'Point') {
      const [lng, lat] = geo.coordinates
      return map.latLngToContainerPoint([lat, lng])
    }
    if (geo.type === 'LineString') {
      const mid = Math.floor(geo.coordinates.length / 2)
      const [lng, lat] = geo.coordinates[mid]
      return map.latLngToContainerPoint([lat, lng])
    }
    if (geo.type === 'Polygon') {
      const coords = geo.coordinates[0]
      const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
      const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length
      return map.latLngToContainerPoint([lat, lng])
    }
  } catch (_) {}
  return null
}

// ── Buscador — Nominatim OSM restringido a CABA ───────────────
// USIG /suggest/ redirige al mapa web en lugar de devolver JSON.
// Nominatim funciona sin restricciones CORS y con bounded=1 al bbox de CABA.
function BuscadorDirecciones({ mapRef }) {
  const [query,      setQuery]      = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando,   setBuscando]   = useState(false)
  const [abierto,    setAbierto]    = useState(false)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  // Bounding box de CABA: minLon,minLat,maxLon,maxLat
  const VIEWBOX = '-58.531,-34.706,-58.335,-34.527'

  async function buscar(texto) {
    if (!texto.trim() || texto.length < 3) { setResultados([]); setAbierto(false); return }
    setBuscando(true)
    try {
      const q   = encodeURIComponent(texto + ', Buenos Aires, Argentina')
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&countrycodes=ar&viewbox=${VIEWBOX}&bounded=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      const data = await res.json()
      setResultados(data)
      setAbierto(data.length > 0)
    } catch (_) {
      setResultados([])
    }
    setBuscando(false)
  }

  function handleChange(e) {
    const v = e.target.value
    setQuery(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(v), 400)
  }

  function seleccionar(item) {
    const map = mapRef.current
    if (!map) return
    map.flyTo([parseFloat(item.lat), parseFloat(item.lon)], 17, { duration: 0.8 })
    const partes = item.display_name.split(',')
    setQuery(partes.slice(0, 2).join(',').trim())
    setResultados([])
    setAbierto(false)
  }

  function limpiar() {
    setQuery('')
    setResultados([])
    setAbierto(false)
    inputRef.current?.focus()
  }

  function limpiarLabel(display_name) {
    return display_name.split(',').slice(0, 3).join(',').trim()
  }

  return (
    <div style={{ position:'absolute', top:14, left:14, zIndex:1000, width:268 }}>
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)',
        border:'0.5px solid rgba(0,0,0,0.08)',
        borderRadius: abierto ? '13px 13px 0 0' : 13,
        padding:'9px 12px',
        boxShadow:'0 4px 24px rgba(0,0,0,0.10)',
        transition:'border-radius 0.12s',
      }}>
        {buscando ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2"
            style={{ flexShrink:0, animation:'spin 0.7s linear infinite' }}>
            <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" style={{ flexShrink:0 }}>
            <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
          </svg>
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => resultados.length > 0 && setAbierto(true)}
          onKeyDown={e => { if (e.key === 'Escape') limpiar() }}
          placeholder="Buscar direccion en CABA..."
          style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:13, color:'#1d1d1f', fontFamily:'inherit' }}
        />
        {query && (
          <button onClick={limpiar}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#aeaeb2', padding:'1px', display:'flex', lineHeight:1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {abierto && resultados.length > 0 && (
        <div style={{
          background:'rgba(255,255,255,0.98)', backdropFilter:'blur(12px)',
          border:'0.5px solid rgba(0,0,0,0.08)', borderTop:'none',
          borderRadius:'0 0 13px 13px',
          boxShadow:'0 8px 24px rgba(0,0,0,0.10)',
          overflow:'hidden',
        }}>
          {resultados.map((item, i) => (
            <div
              key={item.place_id}
              onClick={() => seleccionar(item)}
              style={{
                padding:'9px 12px', cursor:'pointer', fontSize:12,
                color:'#1d1d1f', borderTop: i > 0 ? '0.5px solid #f2f2f7' : 'none',
                display:'flex', alignItems:'flex-start', gap:8,
              }}
              onMouseEnter={e => e.currentTarget.style.background='#f5f5f7'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2"
                style={{ flexShrink:0, marginTop:1 }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <span style={{ flex:1, lineHeight:1.4 }}>{limpiarLabel(item.display_name)}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Popup flotante sobre el elemento ─────────────────────────
function PopupElemento({ elemento, faseColor, mapRef, onActualizar, onEliminar, onCerrar }) {
  const [form,   setForm]   = useState({ nombre: elemento?.nombre || '', instruccion: elemento?.instruccion || '' })
  const [saving, setSaving] = useState(false)
  const [pos,    setPos]    = useState(null)

  useEffect(() => {
    setForm({ nombre: elemento?.nombre || '', instruccion: elemento?.instruccion || '' })
  }, [elemento?.id])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !elemento?.geometria) return

    function actualizarPos() {
      const p = getAnchorPoint(map, elemento.geometria)
      if (p) setPos({ x: p.x, y: p.y })
    }

    actualizarPos()
    map.on('move zoom moveend zoomend', actualizarPos)
    return () => map.off('move zoom moveend zoomend', actualizarPos)
  }, [elemento?.id, elemento?.geometria, mapRef])

  if (!elemento || !pos) return null

  async function guardar() {
    setSaving(true)
    await onActualizar(elemento.id, elemento.fase_id, form)
    setSaving(false)
  }

  const color    = faseColor || '#1a2744'
  const W        = 224
  const H_APPROX = 200
  const OFFSET_Y = 18

  const mapEl = mapRef.current?.getContainer()
  const mapW  = mapEl?.offsetWidth  || 800

  let left = pos.x - W / 2
  let top  = pos.y - H_APPROX - OFFSET_Y

  if (top < 10) top = pos.y + OFFSET_Y + 16
  if (left < 8) left = 8
  if (left + W > mapW - 8) left = mapW - W - 8

  return (
    <div style={{
      position:'absolute', left, top, width:W, zIndex:1001,
      background:'rgba(255,255,255,0.97)', backdropFilter:'blur(14px)',
      border:`1.5px solid ${color}44`, borderRadius:16,
      padding:'14px 15px 13px',
      boxShadow:`0 8px 36px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)`,
      pointerEvents:'auto',
    }}>
      <div style={{ position:'absolute', top:0, left:16, right:16, height:3, borderRadius:'0 0 3px 3px', background:color, opacity:0.7 }}/>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:11, marginTop:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:color }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'#1a2744', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            {TIPO_LABEL[elemento.tipo] || elemento.tipo}
          </span>
        </div>
        <button onClick={onCerrar}
          style={{ background:'#f5f5f7', border:'none', borderRadius:7, cursor:'pointer', color:'#8e8e93', padding:'4px 6px', display:'flex', lineHeight:1 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div style={{ marginBottom:8 }}>
        <input
          value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder="Nombre del elemento"
          autoFocus
          style={{ width:'100%', fontSize:13, fontWeight:600, padding:'7px 9px', border:'none', borderRadius:8, background:'#f5f5f7', color:'#1d1d1f', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
        />
      </div>

      <div style={{ marginBottom:12 }}>
        <textarea
          value={form.instruccion}
          onChange={e => setForm(f => ({ ...f, instruccion: e.target.value }))}
          placeholder="Instruccion para el agente..."
          style={{ width:'100%', fontSize:12, padding:'7px 9px', border:'none', borderRadius:8, background:'#f5f5f7', color:'#1d1d1f', outline:'none', resize:'none', minHeight:52, boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.5 }}
        />
      </div>

      <div style={{ display:'flex', gap:6 }}>
        <button
          onClick={() => { if (window.confirm('Eliminar este elemento?')) onEliminar(elemento.id, elemento.fase_id) }}
          style={{ padding:'7px 10px', borderRadius:8, border:'none', background:'#fce8e8', color:'#e24b4a', fontSize:11, fontWeight:600, cursor:'pointer' }}>
          Borrar
        </button>
        <button onClick={guardar} disabled={saving}
          style={{ flex:1, padding:'7px', borderRadius:8, border:'none', background:color, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', opacity:saving?0.6:1, transition:'opacity 0.15s' }}>
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function MapaAdicional({
  fases = [],
  filtroFase = 'todas',
  herramienta = 'mover',
  faseActiva = null,
  elementoActivo = null,
  onElementoCreado,
  onElementoClick,
  onActualizarElemento,
  onEliminarElemento,
  onCerrarElemento,
}) {
  const wrapperRef          = useRef(null)
  const mapRef              = useRef(null)
  const layersRef           = useRef({})
  const onElementoCreadoRef = useRef(onElementoCreado)
  const onElementoClickRef  = useRef(onElementoClick)

  useEffect(() => { onElementoCreadoRef.current = onElementoCreado }, [onElementoCreado])
  useEffect(() => { onElementoClickRef.current  = onElementoClick  }, [onElementoClick])

  // Init mapa
  useEffect(() => {
    if (mapRef.current || !wrapperRef.current) return

    const map = L.map(wrapperRef.current, {
      center: CABA_CENTER, zoom: ZOOM_INIT, zoomControl: false,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    map.pm.addControls({ position: 'topleft', drawControls: false, editControls: false, optionsControls: false, customControls: false })
    map.pm.setGlobalOptions({ snappable: true, snapDistance: 15, allowSelfIntersection: false })

    map.on('pm:create', (e) => {
      const { layer } = e
      const geometria = layerToGeometria(layer)
      if (!geometria) return
      let tipo = 'punto_control'
      if (e.shape === 'Line')    tipo = 'tramo'
      if (e.shape === 'Polygon') tipo = 'zona_area'
      map.removeLayer(layer)
      onElementoCreadoRef.current?.(map._faseActivaActual, { tipo, geometria })
    })

    setTimeout(() => map.invalidateSize(), 150)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Cambiar herramienta
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.pm.disableDraw()
    map.getContainer().style.cursor = ''
    if (herramienta === 'mover' || !faseActiva) return

    map._faseActivaActual = faseActiva
    const pmShape = TOOL_PM[herramienta]
    if (!pmShape) return

    const fase  = fases.find(f => f.id === faseActiva)
    const color = fase?.color || '#1a2744'

    map.pm.enableDraw(pmShape, {
      snappable: true,
      templineStyle: { color, weight: 3 },
      hintlineStyle: { color, weight: 2, dashArray: '6,4' },
      markerStyle:   { icon: crearIcono(color, herramienta) },
      pathOptions:   { color, fillColor: color, fillOpacity: 0.2, weight: 2.5 },
    })
    map.getContainer().style.cursor = 'crosshair'
  }, [herramienta, faseActiva, fases])

  const resolverColor = useCallback((faseId) => {
    return fases.find(f => f.id === faseId)?.color || '#8e8e93'
  }, [fases])

  const esVisible = useCallback((faseId) => {
    return filtroFase === 'todas' || faseId === filtroFase
  }, [filtroFase])

  // Renderizar elementos
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    Object.values(layersRef.current).forEach(l => { try { map.removeLayer(l) } catch(_) {} })
    layersRef.current = {}

    fases.forEach(fase => {
      if (!esVisible(fase.id)) return
      const color = resolverColor(fase.id)

      ;(fase.elementos || []).forEach(el => {
        const geo      = el.geometria
        if (!geo) return
        const isActive = elementoActivo?.id === el.id
        let layer = null

        if ((el.tipo === 'punto_control' || el.tipo === 'desvio') && geo.type === 'Point') {
          const [lng, lat] = geo.coordinates
          layer = L.marker([lat, lng], {
            icon: crearIcono(color, el.tipo, isActive),
            pmIgnore: true,
            zIndexOffset: isActive ? 1000 : 0,
          })
        }

        if (el.tipo === 'tramo' && geo.type === 'LineString') {
          const latlngs = geo.coordinates.map(([lng, lat]) => [lat, lng])
          layer = L.polyline(latlngs, {
            color, weight: isActive ? 5 : 3.5,
            opacity: isActive ? 1 : 0.85,
            lineCap: 'round', lineJoin: 'round', pmIgnore: true,
          })
        }

        if (el.tipo === 'zona_area' && geo.type === 'Polygon') {
          const latlngs = geo.coordinates[0].map(([lng, lat]) => [lat, lng])
          layer = L.polygon(latlngs, {
            color, weight: isActive ? 3.5 : 2.5,
            fillColor: color, fillOpacity: isActive ? 0.28 : 0.14,
            pmIgnore: true,
          })
        }

        if (layer) {
          layer.addTo(map)
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e)
            onElementoClickRef.current?.({ ...el, fase_id: fase.id })
          })
          layersRef.current[el.id] = layer
        }
      })
    })
  }, [fases, filtroFase, elementoActivo, resolverColor, esVisible])

  // Centrar en elemento activo
  useEffect(() => {
    const map = mapRef.current
    if (!map || !elementoActivo) return
    const geo = elementoActivo.geometria
    if (!geo) return

    if (geo.type === 'Point') {
      map.flyTo([geo.coordinates[1], geo.coordinates[0]], Math.max(map.getZoom(), 16), { duration: 0.5 })
    } else {
      const bounds = []
      if (geo.type === 'LineString') geo.coordinates.forEach(([lng,lat]) => bounds.push([lat,lng]))
      if (geo.type === 'Polygon')    geo.coordinates[0].forEach(([lng,lat]) => bounds.push([lat,lng]))
      if (bounds.length) map.flyToBounds(L.latLngBounds(bounds), { padding:[60,60], maxZoom:17, duration:0.6 })
    }
  }, [elementoActivo])

  const faseColorActivo = elementoActivo
    ? fases.find(f => f.id === elementoActivo.fase_id)?.color
    : undefined

  return (
    <div style={{ position:'absolute', inset:0 }}>
      <div ref={wrapperRef} style={{ width:'100%', height:'100%' }}/>

      <BuscadorDirecciones mapRef={mapRef}/>

      {elementoActivo && (
        <PopupElemento
          elemento={elementoActivo}
          faseColor={faseColorActivo}
          mapRef={mapRef}
          onActualizar={onActualizarElemento}
          onEliminar={onEliminarElemento}
          onCerrar={onCerrarElemento}
        />
      )}
    </div>
  )
}
