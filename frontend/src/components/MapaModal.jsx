/**
 * MapaModal.jsx
 * Modal full-screen con mapa de CABA, panel de capas y herramientas de dibujo.
 *
 * Capas implementadas:
 *   Internas (propias del sistema):
 *     - Misiones de hoy (lat/lng en DB)
 *     - Bases CAT (geocodifica via GeoRef on-demand)
 *   Externas (BA Data, vía proxy /api/mapa/capa/:nombre):
 *     - Comunas, Barrios (polígonos)
 *     - Comisarías, Hospitales, CESAC (puntos)
 *     - Bocas de subte, Estaciones de subte (puntos)
 *     - Metrobus líneas y paradas
 *     - Ciclovías, Senderos escolares (líneas)
 *     - Escuelas (puntos)
 *
 * Herramientas de dibujo (Geoman):
 *   marker, line, polygon, rectangle, circle + edit + drag + delete
 *   Botón "Limpiar" y "Exportar GeoJSON".
 */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import api from '../lib/api'
import { COMUNAS_GEOJSON } from '../data/comunasCABA'
import { attachTileLayer } from '../lib/mapa'
import { geocode } from '../lib/geo'

function BuscadorDirecciones({ map, onPick }) {
  const [query, setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const [busy,    setBusy]    = useState(false)
  const timer = useRef(null)

  function buscarDebounced(texto) {
    clearTimeout(timer.current)
    if (!texto.trim() || texto.trim().length < 3) {
      setResults([]); setOpen(false); return
    }
    timer.current = setTimeout(async () => {
      setBusy(true)
      try {
        const d = await geocode(texto + ', Buenos Aires, Argentina')
        setResults(Array.isArray(d) ? d : [])
        setOpen(true)
      } catch {
        setResults([])
      } finally { setBusy(false) }
    }, 300)
  }

  function elegir(item) {
    if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
      onPick({ lat: item.lat, lng: item.lng, label: item.label })
    }
    setQuery(item.label.split(',').slice(0, 2).join(',').trim())
    setOpen(false)
  }

  return (
    <div className="sigat-mapa-buscador" style={{
      position: 'absolute', top: 12, left: 60, zIndex: 600,
      width: 340, maxWidth: 'calc(100% - 80px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12,
        boxShadow: '0 4px 18px rgba(15,23,42,0.18)',
        border: '0.5px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px 4px 12px',
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); buscarDebounced(e.target.value) }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar dirección en CABA..."
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 14, color: '#1a2744', padding: '8px 4px',
            fontFamily: 'inherit',
          }}
        />
        {busy && (
          <div style={{ width: 14, height: 14, border: '2px solid #e5e7eb', borderTopColor: '#1a2744', borderRadius: '50%', animation: 'sigatSpin 0.7s linear infinite', marginRight: 6 }}/>
        )}
        {query && !busy && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            style={{ background: '#f5f5f7', border: 'none', borderRadius: 6, width: 22, height: 22, cursor: 'pointer', color: '#8e8e93', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 4 }}
            title="Limpiar"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{
          marginTop: 4, background: '#fff', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(15,23,42,0.22)', border: '0.5px solid #e5e7eb',
          maxHeight: 320, overflowY: 'auto',
        }}>
          {results.map((r, i) => (
            <div key={i} onClick={() => elegir(r)}
              style={{
                padding: '9px 14px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '0.5px solid #f0f0f5' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f7fa'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.label.split(',').slice(0, 2).join(',').trim()}
                </div>
                <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.label.split(',').slice(2, 5).join(',').trim()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const CABA_CENTER = [-34.6118, -58.4173]
const ZOOM_INIT   = 12

// ── Capas internas (data propia del sistema) ─────────────────
const ESTADO_COLOR = {
  sin_asignar:  '#a32d2d',
  asignada:     '#d97706',
  en_mision:    '#185fa5',
  interrumpida: '#854f0b',
  cerrada:      '#0f6e56',
}
const ESTADO_LABEL = {
  sin_asignar:  'Sin asignar',
  asignada:     'Asignada',
  en_mision:    'En curso',
  interrumpida: 'Interrumpida',
  cerrada:      'Cerrada',
}

// ── Capas externas (BA Data) ─────────────────────────────────
const CAPAS_BA = [
  // Límites
  { id: 'barrios',     label: 'Barrios',        grupo: 'Límites',     color: '#9333ea', tipo: 'polygon', pesoKB: 723 },
  // Seguridad
  { id: 'comisarias',  label: 'Comisarías',     grupo: 'Seguridad',   color: '#1e293b', tipo: 'point',   pesoKB: 25  },
  // Salud
  { id: 'hospitales',  label: 'Hospitales',     grupo: 'Salud',       color: '#dc2626', tipo: 'point',   pesoKB: 23  },
  { id: 'cesac',       label: 'CESACs',         grupo: 'Salud',       color: '#ef4444', tipo: 'point',   pesoKB: 31  },
  // Transporte
  { id: 'bocas_subte',      label: 'Bocas de subte',     grupo: 'Transporte', color: '#0369a1', tipo: 'point',   pesoKB: 233 },
  { id: 'estaciones_subte', label: 'Estaciones de subte',grupo: 'Transporte', color: '#0284c7', tipo: 'point',   pesoKB: 17  },
  { id: 'metrobus_lineas',  label: 'Metrobus (recorrido)',grupo: 'Transporte',color: '#ea580c', tipo: 'line',    pesoKB: 250 },
  { id: 'metrobus_paradas', label: 'Metrobus (paradas)', grupo: 'Transporte', color: '#f97316', tipo: 'point',   pesoKB: 187 },
  { id: 'ciclovias',        label: 'Ciclovías',          grupo: 'Transporte', color: '#16a34a', tipo: 'line',    pesoKB: 938 },
  // Educación
  { id: 'escuelas',         label: 'Establecimientos educativos', grupo: 'Educación', color: '#7c3aed', tipo: 'point', pesoKB: 1760 },
  { id: 'senderos_escolares', label: 'Senderos escolares', grupo: 'Educación', color: '#a855f7', tipo: 'line', pesoKB: 334 },
]

const GRUPOS = ['Internos', 'Límites', 'Seguridad', 'Salud', 'Transporte', 'Educación']

// ── Helpers ──────────────────────────────────────────────────
async function geocodificar(direccion) {
  if (!direccion) return null
  try {
    const url = `https://apis.datos.gob.ar/georef/api/direcciones?direccion=${encodeURIComponent(direccion)}&provincia=02&max=1`
    const r = await fetch(url)
    const d = await r.json()
    const loc = d.direcciones?.[0]?.ubicacion
    return loc?.lat ? { lat: loc.lat, lng: loc.lon } : null
  } catch { return null }
}

const cacheBases = new Map()

async function cargarBasesConCoords() {
  const bases = await api.get('/api/bases')
  const list  = Array.isArray(bases) ? bases : []
  const out   = []
  for (const b of list) {
    if (!b.direccion) continue
    const key = `${b.id}:${b.direccion}`
    if (cacheBases.has(key)) {
      const c = cacheBases.get(key)
      if (c) out.push({ ...b, ...c })
      continue
    }
    const coord = await geocodificar(b.direccion + ', CABA')
    cacheBases.set(key, coord)
    if (coord) out.push({ ...b, ...coord })
  }
  return out
}

// Style por tipo de feature externo
function estiloPunto(color) {
  return { radius: 5, fillColor: color, color: '#fff', weight: 1.5, fillOpacity: 0.92 }
}
function estiloLinea(color) {
  return { color, weight: 2.5, opacity: 0.85 }
}
function estiloPoligono(color) {
  return { color, weight: 1.5, fillColor: color, fillOpacity: 0.12, opacity: 0.7 }
}

// Estilo de la capa de comunas (igual al usado en ResumenOS — sobrio, no satura)
const ESTILO_COMUNAS = { color: '#1a2744', weight: 2, fillColor: '#3451b2', fillOpacity: 0.05, dashArray: '5 4' }

function tooltipFeature(feat, defaultLabel) {
  const p = feat.properties || {}
  const nombre = p.NOMBRE || p.nombre || p.NAME || p.name || p.DENOM || p.denom || p.descripcion || p.DESCRIPCION || p.COMUNAS || p.BARRIO || p.barrio || defaultLabel
  const dir    = p.DIRECCION || p.direccion || p.calle || p.ubicacion
  return `<b>${nombre ?? defaultLabel}</b>${dir ? `<br/><span style="color:#636366;font-size:11px">${dir}</span>` : ''}`
}


// ── Componente ───────────────────────────────────────────────
export default function MapaModal({ onClose }) {
  const mapNodeRef   = useRef(null)
  const mapInstance  = useRef(null)
  const layers       = useRef({})       // capaId -> L.layerGroup
  const drawingLayer = useRef(null)     // capa para dibujos del usuario
  const [active, setActive]   = useState({ misiones: true, bases: true, comunas: false, os_vigentes: false })
  const [data,   setData]     = useState({ misiones: [], bases: [], os_vigentes: [], externas: {} })
  const [loading,setLoading]  = useState({})
  const [errors, setErrors]   = useState({})
  const [drawCount, setDrawCount] = useState(0)
  const [mapReady, setMapReady] = useState(false)

  // Cerrar con Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // Bloquear scroll body
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Init mapa + Geoman
  useEffect(() => {
    const node = mapNodeRef.current
    if (!node || mapInstance.current) return

    const map = L.map(node, {
      center: CABA_CENTER, zoom: ZOOM_INIT,
      zoomControl: true, attributionControl: false,
      preferCanvas: true,                  // vectores en canvas → html2canvas captura los dibujos
      renderer: L.canvas({ padding: 0.5 }),
    })
    // Tiles via lib/mapa.js (config central, crossOrigin habilitado para html2canvas)
    attachTileLayer(map)

    // LayerGroups para cada capa
    layers.current.misiones     = L.layerGroup().addTo(map)
    layers.current.bases        = L.layerGroup().addTo(map)
    layers.current.comunas      = L.layerGroup().addTo(map)
    layers.current.os_vigentes  = L.layerGroup().addTo(map)
    CAPAS_BA.forEach(c => { layers.current[c.id] = L.layerGroup().addTo(map) })

    // Capa para dibujos del usuario
    drawingLayer.current = L.featureGroup().addTo(map)

    // Activar Geoman
    map.pm.setLang('es')
    map.pm.addControls({
      position: 'topleft',
      drawCircle: true,
      drawRectangle: true,
      drawPolygon: true,
      drawPolyline: true,
      drawMarker: true,
      drawCircleMarker: false,
      drawText: true,
      cutPolygon: false,
      dragMode: true,
      rotateMode: false,
      editMode: true,
      removalMode: true,
    })
    map.pm.setGlobalOptions({
      pathOptions: {
        color:       '#1a2744',
        fillColor:   '#1a2744',
        fillOpacity: 0.18,
        weight:      2.5,
      },
      markerStyle: {
        icon: L.divIcon({
          html: `<div style="width:22px;height:22px;border-radius:50%;background:#1a2744;border:3px solid #f5c800;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
          iconSize: [22, 22], iconAnchor: [11, 11], className: '',
        }),
      },
    })

    // Capturar dibujos
    function onCreate(e) {
      drawingLayer.current.addLayer(e.layer)
      setDrawCount(drawingLayer.current.getLayers().length)
    }
    function onRemove() {
      setDrawCount(drawingLayer.current.getLayers().length)
    }
    map.on('pm:create', onCreate)
    map.on('pm:remove', onRemove)

    // Click en mapa vacío → popup con "Ver en Street View"
    function onMapClick(e) {
      // Ignorar click si estamos en modo dibujo / edición / borrado de Geoman
      if (map.pm.globalDrawModeEnabled?.() || map.pm.globalEditModeEnabled?.() || map.pm.globalRemovalModeEnabled?.() || map.pm.globalDragModeEnabled?.()) return
      // Ignorar si el click fue sobre un feature/marker (Leaflet pone .leaflet-interactive)
      const tgt = e.originalEvent?.target
      if (tgt && (tgt.closest?.('.leaflet-marker-icon') || tgt.classList?.contains('leaflet-interactive'))) return

      const { lat, lng } = e.latlng
      const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
      const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
      const html = `
        <div style="min-width:180px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="font-size:10px;font-weight:700;color:#aeaeb2;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Punto seleccionado</div>
          <div style="font-size:11px;color:#636366;font-family:ui-monospace,monospace;margin-bottom:10px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
          <a href="${url}" target="_blank" rel="noopener noreferrer"
             style="display:flex;align-items:center;gap:7px;padding:9px 12px;background:#1a2744;color:#fff;text-decoration:none;border-radius:9px;font-size:12px;font-weight:700;justify-content:center;margin-bottom:5px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Ver en Street View
          </a>
          <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer"
             style="display:flex;align-items:center;gap:7px;padding:7px 12px;background:#fff;color:#1a2744;text-decoration:none;border:0.5px solid #e5e7eb;border-radius:9px;font-size:11px;font-weight:600;justify-content:center;">
            Abrir en Google Maps
          </a>
        </div>
      `
      L.popup({ closeButton: true, autoClose: true, className: 'sigat-mapa-popup-sv' })
        .setLatLng([lat, lng])
        .setContent(html)
        .openOn(map)
    }
    map.on('click', onMapClick)

    mapInstance.current = map
    setMapReady(true)
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.off('pm:create', onCreate)
      map.off('pm:remove', onRemove)
      map.off('click', onMapClick)
      try { map.remove() } catch {}
      mapInstance.current = null
      layers.current = {}
      drawingLayer.current = null
      setMapReady(false)
    }
  }, [])

  // ── Cargar misiones cuando se activa ──
  useEffect(() => {
    if (!active.misiones || data.misiones.length > 0) return
    setLoading(l => ({ ...l, misiones: true }))
    const hoy = new Date().toISOString().split('T')[0]
    api.get(`/api/misiones?fecha=${hoy}`)
      .then(d => setData(s => ({ ...s, misiones: Array.isArray(d) ? d : [] })))
      .catch(() => setData(s => ({ ...s, misiones: [] })))
      .finally(() => setLoading(l => ({ ...l, misiones: false })))
  }, [active.misiones])

  // ── Cargar bases cuando se activa ──
  useEffect(() => {
    if (!active.bases || data.bases.length > 0) return
    setLoading(l => ({ ...l, bases: true }))
    cargarBasesConCoords()
      .then(b => setData(s => ({ ...s, bases: b })))
      .catch(() => setData(s => ({ ...s, bases: [] })))
      .finally(() => setLoading(l => ({ ...l, bases: false })))
  }, [active.bases])

  // ── Cargar OS vigentes cuando se activa ──
  useEffect(() => {
    if (!active.os_vigentes || data.os_vigentes.length > 0) return
    setLoading(l => ({ ...l, os_vigentes: true }))
    api.get('/api/os/vigentes-mapa')
      .then(d => setData(s => ({ ...s, os_vigentes: Array.isArray(d) ? d : [] })))
      .catch(() => setData(s => ({ ...s, os_vigentes: [] })))
      .finally(() => setLoading(l => ({ ...l, os_vigentes: false })))
  }, [active.os_vigentes])

  // ── Cargar capas externas (BA Data) cuando se activan ──
  useEffect(() => {
    CAPAS_BA.forEach(c => {
      if (!active[c.id]) return
      if (data.externas[c.id]) return
      if (loading[c.id]) return
      setLoading(l => ({ ...l, [c.id]: true }))
      setErrors(e => ({ ...e, [c.id]: null }))
      api.get(`/api/mapa/capa/${c.id}`)
        .then(geojson => setData(s => ({ ...s, externas: { ...s.externas, [c.id]: geojson } })))
        .catch(err => setErrors(e => ({ ...e, [c.id]: err.message || 'Error de red' })))
        .finally(() => setLoading(l => ({ ...l, [c.id]: false })))
    })
  }, [active])

  // ── Render: misiones ──
  useEffect(() => {
    const lyr = layers.current.misiones
    if (!lyr) return
    lyr.clearLayers()
    if (!active.misiones) return
    data.misiones.filter(m => m.lat && m.lng).forEach(m => {
      L.circleMarker([m.lat, m.lng], {
        radius: 7,
        fillColor: ESTADO_COLOR[m.estado] ?? '#636366',
        color: '#fff', weight: 2, fillOpacity: 0.92,
      }).bindTooltip(
        `<b>${m.titulo ?? 'Misión'}</b><br/><span style="color:${ESTADO_COLOR[m.estado]}">${ESTADO_LABEL[m.estado] ?? m.estado}</span>`,
        { direction: 'top', offset: [0, -6] }
      ).addTo(lyr)
    })
  }, [active.misiones, data.misiones])

  // ── Render: bases ──
  useEffect(() => {
    const lyr = layers.current.bases
    if (!lyr) return
    lyr.clearLayers()
    if (!active.bases) return
    data.bases.forEach(b => {
      const icon = L.divIcon({
        className: 'sigat-base-marker',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#f5c800;border:3px solid #1a2744;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#1a2744;box-shadow:0 2px 8px rgba(0,0,0,0.2);">B</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14],
      })
      L.marker([b.lat, b.lng], { icon }).bindTooltip(
        `<b>${b.nombre ?? 'Base'}</b><br/><span style="color:#636366">${b.direccion ?? ''}</span>`,
        { direction: 'top', offset: [0, -14] }
      ).addTo(lyr)
    })
  }, [active.bases, data.bases])

  // ── Render: comunas (capa interna con GeoJSON local) ──
  useEffect(() => {
    const lyr = layers.current.comunas
    if (!lyr) return
    lyr.clearLayers()
    if (!active.comunas) return
    L.geoJSON(COMUNAS_GEOJSON, {
      style: ESTILO_COMUNAS,
      onEachFeature: (feat, layer) => {
        const nombre = feat.properties?.nombre
        if (nombre) layer.bindTooltip(nombre, { permanent: false, sticky: true, opacity: 0.85 })
      },
    }).addTo(lyr)
  }, [active.comunas])

  // ── Render: OS vigentes (items con geometría) ──
  useEffect(() => {
    const lyr = layers.current.os_vigentes
    if (!lyr) return
    lyr.clearLayers()
    if (!active.os_vigentes) return

    data.os_vigentes.forEach(item => {
      const numeroOS = `OS-${String(item.os_numero ?? '?').padStart(3, '0')}`
      const dir = item.modo_ubicacion === 'altura'
        ? [item.calle, item.altura].filter(Boolean).join(' ')
        : item.modo_ubicacion === 'interseccion'
          ? [item.calle, item.calle2].filter(Boolean).join(' y ')
          : item.modo_ubicacion === 'entre_calles'
            ? `${item.calle ?? ''} entre ${item.desde ?? ''} y ${item.hasta ?? ''}`
            : item.poligono_desc || 'Zona'
      const tipoLabel = item.item_tipo === 'servicio' ? 'Servicio' : 'Misión'
      const color = item.item_tipo === 'servicio' ? '#185fa5' : '#e24b4a'

      const tooltipHtml = `
        <div style="font-size:12px;font-weight:700;color:#1a2744;">${numeroOS} · ${tipoLabel}</div>
        <div style="font-size:11px;color:#636366;">${dir}</div>
        ${item.base_nombre ? `<div style="font-size:10px;color:#8e8e93;margin-top:2px;">${item.base_nombre}</div>` : ''}
        ${item.comuna ? `<div style="font-size:10px;color:#534ab7;margin-top:1px;">${item.comuna}</div>` : ''}
      `

      // Polígono
      if (item.modo_ubicacion === 'poligono' && item.poligono_coords) {
        let coords = item.poligono_coords
        if (typeof coords === 'string') {
          try { coords = JSON.parse(coords) } catch { coords = null }
        }
        if (Array.isArray(coords) && coords.length > 0) {
          const latlngs = coords.map(c => c.lat != null ? [c.lat, c.lng] : c)
          L.polygon(latlngs, {
            color, weight: 2, fillColor: color, fillOpacity: 0.18, opacity: 0.85,
          }).bindTooltip(tooltipHtml, { direction: 'top', sticky: true }).addTo(lyr)
        }
      }
      // Punto
      else if (item.lat != null && item.lng != null) {
        L.circleMarker([item.lat, item.lng], {
          radius: 7,
          fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.92,
        }).bindTooltip(tooltipHtml, { direction: 'top', sticky: true }).addTo(lyr)
      }
    })
  }, [active.os_vigentes, data.os_vigentes])

  // ── Render: capas externas (genérico GeoJSON) ──
  useEffect(() => {
    CAPAS_BA.forEach(c => {
      const lyr = layers.current[c.id]
      if (!lyr) return
      lyr.clearLayers()
      if (!active[c.id]) return
      const gj = data.externas[c.id]
      if (!gj) return

      L.geoJSON(gj, {
        pointToLayer: (feat, latlng) => L.circleMarker(latlng, estiloPunto(c.color)),
        style: () => c.tipo === 'line' ? estiloLinea(c.color) : estiloPoligono(c.color),
        onEachFeature: (feat, layer) => {
          layer.bindTooltip(tooltipFeature(feat, c.label), { direction: 'top', sticky: true })
        },
      }).addTo(lyr)
    })
  }, [active, data.externas])

  function toggle(id) {
    setActive(a => ({ ...a, [id]: !a[id] }))
  }

  function limpiarDibujos() {
    if (!drawingLayer.current) return
    drawingLayer.current.clearLayers()
    setDrawCount(0)
  }

  const [exportando, setExportando] = useState(false)

  async function exportarImagen() {
    const node = mapNodeRef.current
    if (!node || exportando) return
    setExportando(true)
    // Ocultar controles temporalmente (toolbar Geoman, search box, zoom buttons)
    node.classList.add('sigat-mapa-exporting')
    try {
      const { default: html2canvas } = await import('html2canvas')
      // Esperar a que CSS aplique y tiles terminen
      await new Promise(r => setTimeout(r, 300))
      const canvas = await html2canvas(node, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#eef1f6',
        logging: false,
        scale: 2,
      })
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (!blob) throw new Error('No se pudo generar el blob')
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
      a.href = url
      a.download = `mapa-CABA-${ts}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      console.error('Error al exportar mapa:', e)
      alert('No se pudo generar la imagen. Si tenías capas pesadas activas, probá desactivar algunas y reintentar.')
    } finally {
      node.classList.remove('sigat-mapa-exporting')
      setExportando(false)
    }
  }

  // ── Items agrupados para el panel ──
  const capasInternas = [
    { id: 'misiones',    label: 'Misiones de hoy',      color: '#185fa5', grupo: 'Internos' },
    { id: 'bases',       label: 'Bases del CAT',        color: '#f5c800', grupo: 'Internos' },
    { id: 'os_vigentes', label: 'OS ordinarias vigentes', color: '#185fa5', grupo: 'Internos' },
    { id: 'comunas',     label: 'Comunas',              color: '#1a2744', grupo: 'Límites'  },
  ]
  const todasCapas = [...capasInternas, ...CAPAS_BA]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 500, backdropFilter: 'blur(4px)' }} />

      <div style={{
        position: 'fixed', inset: '24px',
        background: '#fff', borderRadius: 18, zIndex: 501,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(15,23,42,0.35)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 22px', borderBottom: '0.5px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a2744" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a2744', letterSpacing: '-0.3px' }}>Mapa operativo · CABA</div>
              <div style={{ fontSize: 11, color: '#8e8e93' }}>Capas + herramientas de medición y dibujo</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {drawCount > 0 && (
              <>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#636366', padding: '4px 10px', background: '#f5f5f7', borderRadius: 8 }}>
                  {drawCount} elemento{drawCount === 1 ? '' : 's'} dibujado{drawCount === 1 ? '' : 's'}
                </span>
                <button onClick={limpiarDibujos}
                  style={{ background: '#fff', color: '#a32d2d', border: '0.5px solid #fecaca', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  title="Borrar todos los dibujos"
                >
                  Limpiar
                </button>
              </>
            )}
            <button onClick={exportarImagen} disabled={exportando}
              style={{ background: exportando ? '#aeaeb2' : '#1a2744', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: exportando ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
              title="Descargar imagen del mapa (PNG)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              {exportando ? 'Generando...' : 'Descargar PNG'}
            </button>
            <button onClick={onClose}
              style={{ background: '#f5f5f7', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1a2744' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Cerrar
            </button>
          </div>
        </div>

        {/* Body: panel + mapa */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* Panel lateral */}
          <div className="sigat-mapa-panel" style={{
            width: 280, flexShrink: 0, background: '#fafbfc',
            borderRight: '0.5px solid #e5e7eb',
            display: 'flex', flexDirection: 'column', overflow: 'auto',
          }}>
            {GRUPOS.map(grupo => {
              const items = todasCapas.filter(c => c.grupo === grupo)
              if (!items.length) return null
              return (
                <div key={grupo} style={{ padding: '14px 16px 6px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    {grupo}
                  </div>
                  {items.map(c => {
                    const isActive = !!active[c.id]
                    const isLoad   = !!loading[c.id]
                    const isErr    = !!errors[c.id]
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggle(c.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', marginBottom: 4,
                          borderRadius: 9,
                          cursor: 'pointer',
                          background: isActive ? '#fff' : 'transparent',
                          border: isActive ? `1.5px solid ${c.color}55` : '1.5px solid transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f0f2f5' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${isActive ? c.color : '#c7c7cc'}`,
                          background: isActive ? c.color : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isActive && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }}/>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                          </div>
                          {isLoad && <div style={{ fontSize: 9, color: '#8e8e93', marginTop: 1 }}>cargando...</div>}
                          {isErr && <div style={{ fontSize: 9, color: '#a32d2d', marginTop: 1 }}>error: {errors[c.id]}</div>}
                          {!isLoad && !isErr && c.pesoKB && !isActive && (
                            <div style={{ fontSize: 9, color: '#c7c7cc', marginTop: 1 }}>{c.pesoKB < 1024 ? c.pesoKB + ' KB' : (c.pesoKB/1024).toFixed(1) + ' MB'}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Ayuda dibujo */}
            <div style={{ padding: '14px 16px', marginTop: 'auto', borderTop: '0.5px solid #eef0f3', background: '#fff' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Herramientas de dibujo
              </div>
              <div style={{ fontSize: 11, color: '#636366', lineHeight: 1.5 }}>
                Usá la barra arriba a la izquierda del mapa para dibujar zonas, líneas o marcadores. Cuando termines, exportá como GeoJSON para guardar o compartir.
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <div ref={mapNodeRef} style={{ width: '100%', height: '100%' }} />
            {mapReady && (
              <BuscadorDirecciones
                map={mapInstance.current}
                onPick={({ lat, lng, label }) => {
                  const map = mapInstance.current
                  if (!map) return
                  map.flyTo([lat, lng], 17, { duration: 0.8 })
                  // Marker temporal con popup, auto-eliminar a los 12s
                  const icon = L.divIcon({
                    html: `<div class="sigat-search-marker" style="
                      width: 28px; height: 28px; border-radius: 50%;
                      background: #f5c800; border: 3px solid #1a2744;
                      box-shadow: 0 4px 14px rgba(245,200,0,0.6);
                      animation: sigatPulseRing 1.6s ease-out infinite;
                    "></div>`,
                    iconSize: [28, 28], iconAnchor: [14, 14], className: '',
                  })
                  const m = L.marker([lat, lng], { icon, interactive: true }).addTo(map)
                  m.bindPopup(`<b>${label.split(',').slice(0, 2).join(',').trim()}</b><br/><span style="color:#636366;font-size:11px">${label.split(',').slice(2, 5).join(',').trim()}</span>`).openPopup()
                  setTimeout(() => { try { map.removeLayer(m) } catch {} }, 12000)
                }}
              />
            )}

          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sigat-mapa-panel  { width: 240px !important; }
          .sigat-mapa-buscador { width: 280px !important; }
        }
        @media (max-width: 560px) {
          .sigat-mapa-panel    { display: none !important; }
          .sigat-mapa-buscador { left: 12px !important; right: 12px !important; width: auto !important; max-width: none !important; }
        }
        /* Geoman toolbar (fix posición sobre Leaflet zoom) */
        .leaflet-pm-toolbar { margin-top: 8px !important; }
        /* Sin outline negro al click en polígonos/líneas (focus default del SVG) */
        .leaflet-interactive:focus,
        .leaflet-container .leaflet-interactive { outline: none !important; }
        path.leaflet-interactive { outline: none !important; }
        /* Modo "exportando": ocultar UI (toolbar, search, zoom, popups) al capturar */
        .sigat-mapa-exporting .leaflet-control-container,
        .sigat-mapa-exporting .sigat-mapa-buscador,
        .sigat-mapa-exporting .leaflet-popup { display: none !important; }
        @keyframes sigatSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes sigatPulseRing {
          0%   { box-shadow: 0 4px 14px rgba(245,200,0,0.6), 0 0 0 0 rgba(245,200,0,0.55); }
          100% { box-shadow: 0 4px 14px rgba(245,200,0,0.6), 0 0 0 20px rgba(245,200,0,0); }
        }
      `}</style>
    </>
  )
}
