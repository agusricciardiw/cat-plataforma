/**
 * Cliente de geocodificación (ES0901 D5 + 8.3).
 *
 * ASI exige validar/normalizar direcciones contra el catálogo del GCBA
 * (API GEO de USIG). Mientras se confirman los endpoints públicos
 * exactos y se obtienen las credenciales si hace falta, encapsulamos
 * acá el contrato para que los componentes consuman una interfaz única
 * — la migración futura es solo cambiar el driver / env vars.
 *
 * Drivers soportados (vía `VITE_GEO_PROVIDER`):
 *   - "google"     Google Geocoding API (default actual; requiere
 *                  `VITE_GOOGLE_MAPS_API_KEY`)
 *   - "nominatim"  OpenStreetMap Nominatim (uso libre, rate limited)
 *   - "gcba"       API GEO del catálogo GCBA (pendiente confirmación
 *                  con ASI / DGISIS)
 *
 * Contrato común que devuelve cada driver:
 *
 *   geocode(direccion: string) => Promise<Array<{
 *     lat: number,
 *     lng: number,
 *     label: string,            // dirección normalizada para mostrar
 *     raw?: unknown             // payload original del provider
 *   }>>
 *
 * La normalización del label depende del driver. El consumidor solo se
 * apoya en `lat`, `lng` y `label`.
 */
import { CABA_VIEWBOX } from './mapa'

const env = import.meta.env
const PROVIDER = env.VITE_GEO_PROVIDER || 'google'

// ── Google Geocoding API ───────────────────────────────────────────────
async function geocodeGoogle(direccion) {
  const key = env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('VITE_GOOGLE_MAPS_API_KEY no configurada')
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccion + ', CABA, Argentina')}&key=${key}&language=es&region=ar`
  const r = await fetch(url)
  const data = await r.json()
  if (data.status !== 'OK') return []
  return (data.results || []).map(res => ({
    lat: res.geometry.location.lat,
    lng: res.geometry.location.lng,
    label: res.formatted_address,
    raw: res,
  }))
}

// ── OpenStreetMap Nominatim ────────────────────────────────────────────
async function geocodeNominatim(direccion) {
  const q = encodeURIComponent(direccion)
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&countrycodes=ar&viewbox=${CABA_VIEWBOX}&bounded=1`
  const r = await fetch(url)
  const data = await r.json()
  return (Array.isArray(data) ? data : []).map(res => ({
    lat: parseFloat(res.lat),
    lng: parseFloat(res.lon),
    label: res.display_name,
    raw: res,
  }))
}

// ── API GEO del catálogo GCBA (stub) ───────────────────────────────────
// Cuando ASI / DGISIS confirme el endpoint público y credenciales,
// completar este driver y switchear `VITE_GEO_PROVIDER=gcba`.
//
// Documentación oficial conocida: USIG ofrece servicios REST en
// `https://servicios.usig.buenosaires.gob.ar/` (ver wiki interna).
// El endpoint específico de normalización de direcciones suele estar
// bajo `/normalizar?direccion=...` o `/geocoder/2.2/geocoding?...`.
//
// El stub actual arroja en runtime con mensaje claro si se intenta usar.
async function geocodeGCBA(/* direccion */) {
  throw new Error(
    'VITE_GEO_PROVIDER=gcba todavía no implementado. ' +
    'Pendiente: confirmar endpoint del catálogo USIG con ASI/DGISIS y completar driver en src/lib/geo.js'
  )
}

/**
 * Punto de entrada único. Decide el driver según env y delega.
 */
export async function geocode(direccion) {
  if (!direccion || !direccion.trim()) return []
  switch (PROVIDER) {
    case 'nominatim': return geocodeNominatim(direccion)
    case 'gcba':      return geocodeGCBA(direccion)
    case 'google':
    default:          return geocodeGoogle(direccion)
  }
}

/** Provider activo (debug / UI). */
export const provider = PROVIDER
