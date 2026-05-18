/**
 * Configuración central del mapa (ES0901 D6).
 *
 * ASI exige que las visualizaciones georreferenciales del GCBA usen el
 * Mapa del GCBA, no Google Maps / OpenStreetMap / Carto. Mientras ASI
 * confirma los endpoints públicos exactos de su servicio de tiles (USIG /
 * cartografía.buenosaires.gob.ar), centralizamos la config aquí para que
 * la migración futura sea un único cambio de env vars.
 *
 * Cómo cambiar el provider en producción:
 *   Setear `VITE_MAPA_TILE_URL` (y opcionalmente `VITE_MAPA_TILE_ATTRIBUTION`
 *   y `VITE_MAPA_TILE_SUBDOMAINS`) en el `.env` del entorno destino.
 *
 * Defaults: OSM + Carto Voyager (estado actual del proyecto). En homologación
 * ASI se cambian estos valores por los del Mapa GCBA.
 *
 * Uso desde un componente Leaflet:
 *
 *   import { tileConfig, attachTileLayer } from '@/lib/mapa';
 *   attachTileLayer(map);    // setea el tileLayer default
 *   // o:
 *   import L from 'leaflet';
 *   L.tileLayer(tileConfig().url, tileConfig().options).addTo(map);
 */
import L from 'leaflet'

const env = import.meta.env

const DEFAULT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const DEFAULT_ATTRIBUTION = '© OpenStreetMap © CARTO'
const DEFAULT_SUBDOMAINS = 'abcd'

/**
 * URL del tileLayer activo + opciones para Leaflet.
 * Se llama cada vez para soportar hot-reload en dev.
 */
export function tileConfig() {
  return {
    url: env.VITE_MAPA_TILE_URL || DEFAULT_TILE_URL,
    options: {
      attribution: env.VITE_MAPA_TILE_ATTRIBUTION || DEFAULT_ATTRIBUTION,
      subdomains: env.VITE_MAPA_TILE_SUBDOMAINS || DEFAULT_SUBDOMAINS,
      maxZoom: Number(env.VITE_MAPA_TILE_MAX_ZOOM) || 19,
      crossOrigin: 'anonymous', // necesario para que html2canvas pueda capturar tiles en exports PDF
    },
  }
}

/**
 * Adjunta el tileLayer configurado al `map`. Devuelve el layer creado
 * por si hace falta moverlo o sacarlo después.
 */
export function attachTileLayer(map) {
  const { url, options } = tileConfig()
  return L.tileLayer(url, options).addTo(map)
}

/**
 * Centro y zoom default para CABA. Útil cuando un mapa abre vacío.
 */
export const DEFAULT_CENTER = [-34.6037, -58.3816] // Obelisco
export const DEFAULT_ZOOM = 12

/**
 * Bounding box de CABA aprox., en formato Nominatim (lonW,latS,lonE,latN).
 * Restringe búsquedas geográficas al área de la ciudad.
 */
export const CABA_VIEWBOX = '-58.5310,-34.7050,-58.3354,-34.5265'
