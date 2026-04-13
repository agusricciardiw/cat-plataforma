/**
 * MapaPoligono.jsx
 * Mapa interactivo para dibujar un polígono sobre CABA.
 * Usa Google Maps DrawingManager.
 * Props:
 *   poligono   : array de {lat,lng} — coordenadas actuales
 *   onChange   : fn(coordenadas, descripcion) — cuando cambia el polígono
 *   height     : number — altura del mapa en px (default 260)
 */
import { useEffect, useRef, useState } from 'react'
import PlacesAutocomplete, { onMapsReady } from './PlacesAutocomplete'

const CABA_CENTER = { lat: -34.6118, lng: -58.4173 }

export default function MapaPoligono({ poligono = [], onChange, height = 260 }) {
  const mapDivRef    = useRef(null)
  const mapRef       = useRef(null)
  const polygonRef   = useRef(null)
  const drawingRef   = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    onMapsReady(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return

    // Crear el mapa
    mapRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: CABA_CENTER,
      zoom: 14,
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
      ],
    })

    // DrawingManager para polígonos
    drawingRef.current = new window.google.maps.drawing.DrawingManager({
      drawingMode: window.google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: window.google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
      },
      polygonOptions: {
        fillColor: '#1a2744',
        fillOpacity: 0.18,
        strokeColor: '#1a2744',
        strokeWeight: 2,
        editable: true,
        draggable: true,
      },
    })

    drawingRef.current.setMap(mapRef.current)

    // Al completar un polígono
    window.google.maps.event.addListener(drawingRef.current, 'polygoncomplete', polygon => {
      // Eliminar polígono anterior
      if (polygonRef.current) polygonRef.current.setMap(null)
      polygonRef.current = polygon

      // Desactivar modo dibujo
      drawingRef.current.setDrawingMode(null)

      actualizarPoligono(polygon)

      // Escuchar cambios en los vértices (drag de puntos)
      window.google.maps.event.addListener(polygon.getPath(), 'set_at', () => actualizarPoligono(polygon))
      window.google.maps.event.addListener(polygon.getPath(), 'insert_at', () => actualizarPoligono(polygon))
      window.google.maps.event.addListener(polygon.getPath(), 'remove_at', () => actualizarPoligono(polygon))
    })

    // Si ya hay un polígono guardado, dibujarlo
    if (poligono.length >= 3) {
      const savedPolygon = new window.google.maps.Polygon({
        paths: poligono,
        fillColor: '#1a2744',
        fillOpacity: 0.18,
        strokeColor: '#1a2744',
        strokeWeight: 2,
        editable: true,
        draggable: true,
        map: mapRef.current,
      })
      polygonRef.current = savedPolygon
      drawingRef.current.setDrawingMode(null)

      // Centrar en el polígono guardado
      const bounds = new window.google.maps.LatLngBounds()
      poligono.forEach(p => bounds.extend(p))
      mapRef.current.fitBounds(bounds)

      window.google.maps.event.addListener(savedPolygon.getPath(), 'set_at', () => actualizarPoligono(savedPolygon))
      window.google.maps.event.addListener(savedPolygon.getPath(), 'insert_at', () => actualizarPoligono(savedPolygon))
    }
  }, [ready])

  function actualizarPoligono(polygon) {
    const path = polygon.getPath()
    const coords = []
    for (let i = 0; i < path.getLength(); i++) {
      const p = path.getAt(i)
      coords.push({ lat: p.lat(), lng: p.lng() })
    }
    // Generar descripción textual aproximada del centroide
    const lat = coords.reduce((s, p) => s + p.lat, 0) / coords.length
    const lng = coords.reduce((s, p) => s + p.lng, 0) / coords.length
    const desc = `Zona delimitada (${coords.length} vértices)`
    onChange?.(coords, desc, { lat, lng })
  }

  function limpiarPoligono() {
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    if (drawingRef.current) {
      drawingRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON)
    }
    onChange?.([], '', null)
  }

  function buscarEnMapa(val, place) {
    if (!place || !mapRef.current) return
    mapRef.current.panTo({ lat: place.lat, lng: place.lng })
    mapRef.current.setZoom(16)
  }

  const INP_BUSCAR = {
    width: '100%', background: '#fff', border: 'none', outline: 'none',
    fontSize: 13, fontFamily: 'inherit', color: '#1d1d1f', padding: '9px 12px',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid #e5e5ea' }}>
      {/* Buscador para navegar el mapa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '0.5px solid #e5e5ea', background: '#fff' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <PlacesAutocomplete
          value=""
          onChange={buscarEnMapa}
          placeholder="Buscar una dirección para navegar…"
          style={INP_BUSCAR}
        />
      </div>

      {/* Mapa */}
      <div style={{ position: 'relative' }}>
        {!ready && (
          <div style={{ height, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aeaeb2', fontSize: 13 }}>
            Cargando mapa…
          </div>
        )}
        <div ref={mapDivRef} style={{ height, display: ready ? 'block' : 'none' }}/>
        {ready && poligono.length >= 3 && (
          <button onClick={limpiarPoligono}
            style={{ position: 'absolute', bottom: 8, right: 8, background: '#fff', border: '0.5px solid #e5e5ea', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#e24b4a', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', fontWeight: 600 }}>
            Borrar zona
          </button>
        )}
        {ready && poligono.length === 0 && (
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#534ab7', fontWeight: 600, pointerEvents: 'none', boxShadow: '0 1px 6px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>
            Usá la herramienta de dibujo para trazar la zona
          </div>
        )}
      </div>
    </div>
  )
}
