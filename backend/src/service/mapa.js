/**
 * service/mapa.js
 * Proxy de capas públicas desde BA Data (cdn.buenosaires.gob.ar) con cache en memoria.
 *
 * Razón: el CDN GCBA no envía Access-Control-Allow-Origin, entonces no se puede
 * fetchear directo desde el browser. Proxyeamos desde acá con headers CORS propios.
 *
 * Cache: 1 hora por capa. Los datasets cambian mensualmente como mucho.
 */

const CAPAS_URLS = {
  comunas:           'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/ministerio-de-educacion/comunas/comunas.geojson',
  barrios:           'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/ministerio-de-educacion/barrios/barrios.geojson',
  comisarias:        'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/ministerio-de-justicia-y-seguridad/comisarias-policia-ciudad/comisarias_policia.geojson',
  hospitales:        'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/ministerio-de-salud/hospitales/hospitales.geojson',
  cesac:             'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/ministerio-de-salud/centros-salud-accion-comunitaria-cesac/centros_salud_nivel_1_cesac.geojson',
  bocas_subte:       'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/sbase/bocas-subte/bocas-de-subte.geojson',
  estaciones_subte:  'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/sbase/subte-estaciones/estaciones-de-subte.geojson',
  ciclovias:         'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/transporte-y-obras-publicas/ciclovias/ciclovias.geojson',
  escuelas:          'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/ministerio-de-educacion/establecimientos-educativos/establecimientos_educativos.geojson',
  metrobus_lineas:   'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/transporte-y-obras-publicas/metrobus/recorrido-de-metrobus.geojson',
  metrobus_paradas:  'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/transporte-y-obras-publicas/metrobus/estaciones-de-metrobus.geojson',
  senderos_escolares:'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/ministerio-de-justicia-y-seguridad/senderos-escolares/senderos_escolares.geojson',
};

const TTL_MS = 60 * 60 * 1000; // 1 hora
const FETCH_TIMEOUT_MS = 15000;
const cache = new Map(); // capa -> { data, expires }

async function fetchConTimeout(url, ms) {
  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return r;
  } finally { clearTimeout(t); }
}

async function obtenerCapa(nombre) {
  const url = CAPAS_URLS[nombre];
  if (!url) return { error: 'Capa no encontrada', status: 404 };

  const cached = cache.get(nombre);
  if (cached && cached.expires > Date.now()) return { data: cached.data, fromCache: true };

  try {
    const r = await fetchConTimeout(url, FETCH_TIMEOUT_MS);
    if (!r.ok) return { error: `Capa no disponible (HTTP ${r.status})`, status: 502 };
    const data = await r.json();
    cache.set(nombre, { data, expires: Date.now() + TTL_MS });
    return { data, fromCache: false };
  } catch (e) {
    console.error(`[mapa] Error al obtener capa ${nombre}:`, e.message);
    return { error: 'No se pudo cargar la capa desde BA Data', status: 502 };
  }
}

function listarCapas() {
  return Object.keys(CAPAS_URLS).map(id => ({
    id,
    cargada: cache.has(id),
  }));
}

module.exports = { obtenerCapa, listarCapas, CAPAS_URLS };
