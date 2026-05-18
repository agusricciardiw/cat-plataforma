/**
 * ResumenOS.jsx — v9
 * Fix 1: tooltips comunas con sticky:true (elimina leader lines)
 * Fix 2: poligono_coords parseado defensivamente (puede llegar como string JSON del backend)
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/api'
import { COMUNAS_GEOJSON } from '../data/comunasCABA'
import { attachTileLayer } from '../lib/mapa'

const TURNOS_DEF = [
  { id: 'manana',     label: 'Turno Manana',            short: 'TM',  color: '#854f0b', bg: '#faeeda' },
  { id: 'intermedio', label: 'Turno Intermedio',         short: 'TI',  color: '#534ab7', bg: '#eeedf8' },
  { id: 'tarde',      label: 'Turno Tarde',              short: 'TT',  color: '#185fa5', bg: '#e8f0fe' },
  { id: 'noche',      label: 'Turno Noche',              short: 'TN',  color: '#1a2744', bg: '#e4eaf5' },
  { id: 'fsd',        label: 'Fin de Semana Diurno',     short: 'FSD', color: '#0f6e56', bg: '#e8faf2' },
  { id: 'fsi',        label: 'Fin de Semana Intermedio', short: 'FSI', color: '#6b21a8', bg: '#f3e8ff' },
  { id: 'fsn',        label: 'Fin de Semana Noche',      short: 'FSN', color: '#8e8e93', bg: '#f5f5f7' },
]
const TURNO_MAP = Object.fromEntries(TURNOS_DEF.map(t => [t.id, t]))
const ORDEN_TURNOS = TURNOS_DEF.map(t => t.id)
const COLORES_PSV = ['#1a2744', '#185fa5', '#0f6e56', '#534ab7', '#854f0b', '#6b21a8']

// Labels dinámicos según tipo de OS — alcoholemia usa Puesto/Itinerante
function labelsOS(osTipo) {
  const esAlco = osTipo === 'alcoholemia'
  return {
    esAlco,
    pluralA:    esAlco ? 'Puestos'      : 'Servicios',
    pluralB:    esAlco ? 'Itinerantes'  : 'Misiones',
    singularA:  esAlco ? 'Puesto'       : 'Servicio',
    singularB:  esAlco ? 'Itinerante'   : 'Misión',
    abrA:       esAlco ? 'pue.'         : 'serv.',
    abrB:       esAlco ? 'iti.'         : 'mis.',
    tituloA:    esAlco ? 'Pue.'         : 'Serv.',
    tituloB:    esAlco ? 'Iti.'         : 'Mis.',
  }
}

// COMUNAS_GEOJSON ahora se importa de ../data/comunasCABA

// Parsear poligono_coords defensivamente — puede llegar como string JSON del backend
function parsePoligonoCoords(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

function ubicLabel(item) {
  if (item.modo_ubicacion === 'interseccion') return `${item.calle || '?'} esq. ${item.calle2 || '?'}`
  if (item.modo_ubicacion === 'entre_calles')  return `${item.calle || '?'} entre ${item.desde || '?'} y ${item.hasta || '?'}`
  if (item.modo_ubicacion === 'poligono')       return item.poligono_desc || 'Zona trazada'
  return [item.calle, item.altura].filter(Boolean).join(' ') || 'Sin direccion'
}
function totalAgentesItem(item) {
  return (item.turnos || []).reduce((acc, e) => acc + (e.cantidad_agentes || 0), 0)
}
function itemIncompleto(item) {
  if (!item.calle && !item.lat) return true
  if (!item.eje_psv) return true
  if ((item.tipo === 'servicio' || item.tipo === 'puesto') && totalAgentesItem(item) === 0) return true
  if (!item.comuna) return true
  return false
}

function StatCard({ value, label, color = '#1a2744', sub, alert }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${alert ? '#f5c800' : '#e5e5ea'}`, padding: '14px 18px', flex: '1 1 130px', position: 'relative', overflow: 'hidden' }}>
      {alert && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#f5c800' }}/>}
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.8px', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#636366', marginTop: 5, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function TabTurno({ porTurno, osTipo }) {
  const L = labelsOS(osTipo)
  const entradas = ORDEN_TURNOS.filter(id => porTurno[id])
  if (entradas.length === 0) return <Vacio texto="Sin datos de turnos en esta OS"/>
  const maxAgentes = Math.max(...entradas.map(id => porTurno[id].agentes || 0), 1)
  return (
    <div>
      <div style={{ fontSize: 13, color: '#636366', marginBottom: 16, lineHeight: 1.5 }}>
        Para cada turno se muestra la cantidad de {L.pluralA.toLowerCase()} y {L.pluralB.toLowerCase()} planificados, y el total de agentes requeridos segun la configuracion de la OS.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr 2fr', padding: '6px 14px', marginBottom: 4 }}>
        {['Turno', L.pluralA, L.pluralB, 'Agentes', 'Carga relativa'].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
        ))}
      </div>
      {entradas.map(id => {
        const t = TURNO_MAP[id]; const d = porTurno[id]
        const pct = Math.round(((d.agentes || 0) / maxAgentes) * 100)
        return (
          <div key={id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr 2fr', padding: '12px 14px', background: '#f9f9fb', borderRadius: 10, marginBottom: 6, border: '0.5px solid #e5e5ea', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: t.bg, color: t.color, minWidth: 36, textAlign: 'center' }}>{t.short}</span>
              <span style={{ fontSize: 12, color: '#3c3c43', fontWeight: 500 }}>{t.label.replace('Turno ','')}</span>
            </div>
            <div><span style={{ fontSize: 20, fontWeight: 800, color: '#185fa5' }}>{d.servicios||0}</span><span style={{ fontSize: 11, color: '#185fa5', marginLeft: 3, opacity: .7 }}>{L.abrA}</span></div>
            <div><span style={{ fontSize: 20, fontWeight: 800, color: '#e24b4a' }}>{d.misiones||0}</span><span style={{ fontSize: 11, color: '#e24b4a', marginLeft: 3, opacity: .7 }}>{L.abrB}</span></div>
            <div><span style={{ fontSize: 20, fontWeight: 800, color: '#1a2744' }}>{d.agentes||0}</span><span style={{ fontSize: 11, color: '#8e8e93', marginLeft: 3 }}>ag.</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 8, background: '#e5e5ea', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: t.color, borderRadius: 4, transition: 'width 0.4s' }}/>
              </div>
              <span style={{ fontSize: 11, color: '#aeaeb2', minWidth: 30 }}>{pct}%</span>
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0f4ff', borderRadius: 10, border: '0.5px solid #c7d2fe' }}>
        <span style={{ fontSize: 12, color: '#3451b2' }}>La carga relativa compara la dotacion de agentes de cada turno contra el turno con mas agentes asignados.</span>
      </div>
    </div>
  )
}

function TabComuna({ porComuna, items, comunasDisponibles, onComunaAsignada, osTipo }) {
  const L = labelsOS(osTipo)
  const entradas = Object.entries(porComuna).sort((a,b) => ((b[1].servicios||0)+(b[1].misiones||0)) - ((a[1].servicios||0)+(a[1].misiones||0)))
  const maxTotal = entradas.length > 0 ? Math.max(...entradas.map(([,d])=>(d.servicios||0)+(d.misiones||0))) : 1
  const itemsSinComuna = items.filter(it => !it.comuna)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {entradas.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: '#636366', marginBottom: 12 }}>{entradas.length} {entradas.length===1?'comuna involucrada':'comunas involucradas'} en esta OS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {entradas.map(([comuna, d], i) => {
              const total=(d.servicios||0)+(d.misiones||0); const pct=Math.round((total/maxTotal)*100)
              return (
                <div key={comuna} style={{ padding: '11px 14px', background: '#f9f9fb', borderRadius: 10, border: '0.5px solid #e5e5ea' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#aeaeb2', minWidth: 22 }}>#{i+1}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', flex: 1 }}>{comuna}</span>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#e8f0fe', borderRadius: 6, padding: '3px 9px' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#185fa5' }}>{d.servicios||0}</span><span style={{ fontSize: 10, color: '#185fa5', opacity: .8 }}>{L.tituloA}</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fce8e8', borderRadius: 6, padding: '3px 9px' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#e24b4a' }}>{d.misiones||0}</span><span style={{ fontSize: 10, color: '#e24b4a', opacity: .8 }}>{L.tituloB}</span></div>
                      {d.agentes>0 && <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f5f5f7', borderRadius: 6, padding: '3px 9px' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#636366' }}>{d.agentes}</span><span style={{ fontSize: 10, color: '#8e8e93' }}>ag.</span></div>}
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#e5e5ea', borderRadius: 3, overflow: 'hidden' }}><div style={{ width:`${pct}%`, height: '100%', background: '#1a2744', borderRadius: 3, transition: 'width 0.4s' }}/></div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {itemsSinComuna.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #f5c800', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>âš </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#854f0b' }}>{itemsSinComuna.length} {itemsSinComuna.length===1?'item sin':'items sin'} comuna asignada</div>
              <div style={{ fontSize: 12, color: '#a16207', marginTop: 1 }}>No se pudo resolver la ubicacion automaticamente. Asignala manualmente.</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {itemsSinComuna.map(it => <SelectorComunaItem key={it.id} item={it} comunasDisponibles={comunasDisponibles} onAsignar={onComunaAsignada}/>)}
          </div>
        </div>
      )}
      {entradas.length === 0 && itemsSinComuna.length === 0 && <Vacio texto="Sin datos de comunas disponibles"/>}
    </div>
  )
}

function SelectorComunaItem({ item, comunasDisponibles, onAsignar }) {
  const [guardando, setGuardando] = useState(false)
  const [asignado, setAsignado]   = useState(false)
  const esMis = (item.tipo === 'mision' || item.tipo === 'itinerante')
  async function handleAsignar(comuna) {
    if (!comuna) return; setGuardando(true)
    try { await api.patch(`/api/os/items/${item.id}/comuna`, { comuna }); onAsignar(item.id, comuna); setAsignado(true) }
    catch (e) { console.warn('Error asignando comuna:', e) }
    setGuardando(false)
  }
  if (asignado) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#fff', borderRadius: 9, border: '0.5px solid #e5e5ea' }}>
      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: esMis?'#fce8e8':'#e8f0fe', color: esMis?'#a32d2d':'#0c447c', flexShrink: 0 }}>{item.codigo}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descripcion}</div>
        <div style={{ fontSize: 11, color: '#8e8e93' }}>{ubicLabel(item)}</div>
      </div>
      {guardando ? <span style={{ fontSize: 11, color: '#8e8e93', flexShrink: 0 }}>Guardando...</span> : (
        <select onChange={e => handleAsignar(e.target.value)} defaultValue="" style={{ fontSize: 12, border: '1px solid #d1d1d6', borderRadius: 8, padding: '5px 10px', background: '#f9f9fb', color: '#1a2744', cursor: 'pointer', outline: 'none', minWidth: 140, flexShrink: 0 }}>
          <option value="">Asignar comuna...</option>
          {comunasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
    </div>
  )
}

function TabEjePSV({ porEjePSV, sinEjePSV, osTipo }) {
  const L = labelsOS(osTipo)
  const entradas = Object.entries(porEjePSV).sort((a,b) => ((b[1].servicios||0)+(b[1].misiones||0)) - ((a[1].servicios||0)+(a[1].misiones||0)))
  const totalConEje = entradas.reduce((acc,[,d]) => acc+(d.servicios||0)+(d.misiones||0), 0)
  const maxTotal = totalConEje > 0 ? Math.max(...entradas.map(([,d])=>(d.servicios||0)+(d.misiones||0))) : 1
  if (entradas.length === 0) return <Vacio texto="Ningun item tiene eje PSV asignado"/>
  return (
    <div>
      <div style={{ fontSize: 13, color: '#636366', marginBottom: 16 }}>
        Los ejes del Plan de Seguridad Vial definen el objetivo operativo de cada servicio o mision.
        {sinEjePSV>0 && <span style={{ color: '#854f0b', fontWeight: 600 }}> {sinEjePSV} {sinEjePSV===1?'item':'items'} sin eje asignado.</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entradas.map(([eje, d], i) => {
          const total=(d.servicios||0)+(d.misiones||0); const pct=totalConEje>0?Math.round((total/totalConEje)*100):0; const barPct=Math.round((total/maxTotal)*100); const color=COLORES_PSV[i%COLORES_PSV.length]
          return (
            <div key={eje} style={{ padding: '12px 16px', background: '#f9f9fb', borderRadius: 10, border: '0.5px solid #e5e5ea' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0, marginTop: 2 }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2744', lineHeight: 1.3, marginBottom: 5 }}>{eje}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#e8f0fe', borderRadius: 6, padding: '3px 9px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#185fa5' }}>{d.servicios||0}</span><span style={{ fontSize: 11, color: '#185fa5' }}>{L.pluralA}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fce8e8', borderRadius: 6, padding: '3px 9px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#e24b4a' }}>{d.misiones||0}</span><span style={{ fontSize: 11, color: '#e24b4a' }}>{L.pluralB}</span></div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{pct}%</div><div style={{ fontSize: 10, color: '#aeaeb2' }}>del total</div></div>
              </div>
              <div style={{ height: 6, background: '#e5e5ea', borderRadius: 3, overflow: 'hidden' }}><div style={{ width:`${barPct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }}/></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TabAlertas({ items }) {
  function getFaltante(item) {
    const falta = []
    if (!item.calle && !item.lat) falta.push({ k:'ubicacion', label:'Sin ubicacion cargada', color:'#854f0b', bg:'#faeeda' })
    if (!item.eje_psv) falta.push({ k:'psv', label:'Sin eje PSV asignado', color:'#534ab7', bg:'#eeedf8' })
    if ((item.tipo==='servicio' || item.tipo==='puesto') && totalAgentesItem(item)===0) falta.push({ k:'agentes', label:'Sin agentes configurados', color:'#e24b4a', bg:'#fce8e8' })
    if (!item.comuna) falta.push({ k:'comuna', label:'Sin comuna asignada', color:'#0f6e56', bg:'#e8faf2' })
    return falta
  }
  const itemsIncompletos = items.filter(it => getFaltante(it).length > 0)
  if (itemsIncompletos.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>âœ“</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f6e56', marginBottom: 5 }}>Todos los items completos</div>
      <div style={{ fontSize: 13, color: '#8e8e93' }}>No hay datos faltantes en esta OS</div>
    </div>
  )
  return (
    <div>
      <div style={{ fontSize: 13, color: '#636366', marginBottom: 16 }}>{itemsIncompletos.length} {itemsIncompletos.length===1?'item tiene':'items tienen'} datos faltantes.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {itemsIncompletos.map(item => {
          const falta=getFaltante(item); const esMis=(item.tipo==='mision' || item.tipo==='itinerante')
          return (
            <div key={item.id} style={{ padding: '12px 14px', background: '#f9f9fb', borderRadius: 10, border: '0.5px solid #e5e5ea' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: esMis?'#fce8e8':'#e8f0fe', color: esMis?'#a32d2d':'#0c447c', flexShrink: 0, marginTop: 1 }}>{item.codigo}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#1a2744', marginBottom: 3 }}>{item.descripcion||'Sin nombre'}</div><div style={{ fontSize: 11, color: '#8e8e93' }}>{ubicLabel(item)}</div></div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {falta.map(f => <span key={f.k} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: f.bg, color: f.color }}>âš  {f.label}</span>)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// â”€â”€ MAPA CORE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FIX v9 + leaflet npm:
// - Usa L del import de npm en vez de CDN
// - Tooltips de comunas: sticky:true elimina leader lines
// - poligono_coords: parseado defensivamente con parsePoligonoCoords()
function MapaCore({ items, height, filtroTipo, filtroTurno, comunasVisible }) {
  const mapRef          = useRef(null)
  const mapObjRef       = useRef(null)
  const capasRef        = useRef([])
  const comunasLayerRef = useRef(null)

  // Normalizar items: parsear poligono_coords si llega como string
  const itemsNorm = items.map(it => {
    if (it.modo_ubicacion === 'poligono' && it.poligono_coords != null) {
      const coords = parsePoligonoCoords(it.poligono_coords)
      return coords !== it.poligono_coords ? { ...it, poligono_coords: coords } : it
    }
    return it
  })

  const itemsMapaables = itemsNorm.filter(it => {
    if (it.modo_ubicacion === 'poligono') return Array.isArray(it.poligono_coords) && it.poligono_coords.length >= 3
    return !!(it.lat && it.lng)
  })

  useEffect(() => {
    if (!mapRef.current || mapObjRef.current) return
    const map = L.map(mapRef.current, { zoomControl: true, preferCanvas: false })
    mapObjRef.current = map
    attachTileLayer(map)
    comunasLayerRef.current = L.geoJSON(COMUNAS_GEOJSON, {
      style: { color: '#1a2744', weight: 2, fillColor: '#3451b2', fillOpacity: 0.05, dashArray: '5 4' },
      onEachFeature: (feature, layer) => {
        const nombre = feature.properties?.nombre || ''
        if (nombre) layer.bindTooltip(nombre, { permanent: false, sticky: true, opacity: 0.8 })
      },
    }).addTo(map)
    map.setView([-34.615, -58.443], 12)
    return () => { if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; comunasLayerRef.current = null } }
  }, [])

  useEffect(() => {
    const map = mapObjRef.current; if (!map) return
    capasRef.current.forEach(c => map.removeLayer(c)); capasRef.current = []
    const filtrados = itemsMapaables.filter(it => {
      if (filtroTipo !== 'todos' && it.tipo !== filtroTipo) return false
      if (filtroTurno !== 'todos' && it.turno !== filtroTurno) return false
      return true
    })
    const bounds = []
    filtrados.forEach(it => {
      const esMis   = (it.tipo === 'mision' || it.tipo === 'itinerante')
      const color   = esMis ? '#e24b4a' : '#185fa5'
      const turno   = TURNO_MAP[it.turno]
      const agentes = totalAgentesItem(it)
      const esPoligono = it.modo_ubicacion === 'poligono' && Array.isArray(it.poligono_coords) && it.poligono_coords.length >= 3

      const popup = `<div style="font-family:system-ui;min-width:200px;padding:2px">
        <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">${it.tipo}</div>
        <div style="font-size:13px;font-weight:700;color:#1a2744;line-height:1.3;margin-bottom:6px">${it.descripcion||'—'}</div>
        <div style="font-size:11px;color:#636366;margin-bottom:6px">${ubicLabel(it)}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${turno?`<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:${turno.bg};color:${turno.color}">${turno.short}</span>`:''}
          ${agentes>0?`<span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#f5f5f7;color:#636366">${agentes} ag.</span>`:''}
          ${it.comuna?`<span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#e8faf2;color:#0f6e56">${it.comuna}</span>`:''}
        </div>
        ${it.eje_psv?`<div style="font-size:10px;color:#8e8e93;margin-top:5px">${it.eje_psv}</div>`:''}
      </div>`

      if (esPoligono) {
        // PolÃ­gono de zona
        const latlngs = it.poligono_coords.map(p => [p.lat, p.lng])
        const poly = L.polygon(latlngs, { color, weight: 2.5, fillColor: color, fillOpacity: 0.18, dashArray: null })
        poly.bindPopup(popup, { maxWidth: 260 })
        poly.addTo(map)
        capasRef.current.push(poly)
        latlngs.forEach(p => bounds.push(p))
        // Marker en el centroide — mismo estilo que markers normales
        if (it.lat && it.lng) {
          const icon = L.divIcon({
            html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:900;">${esMis?'M':'S'}</div></div>`,
            className:'', iconSize:[28,28], iconAnchor:[14,14], popupAnchor:[0,-16],
          })
          const m = L.marker([it.lat, it.lng], { icon })
          m.bindPopup(popup, { maxWidth: 260 })
          m.addTo(map); capasRef.current.push(m)
        }
      } else {
        const icon = L.divIcon({
          html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:900;">${esMis?'M':'S'}</div></div>`,
          className:'', iconSize:[28,28], iconAnchor:[14,28], popupAnchor:[0,-32],
        })
        const marker = L.marker([it.lat, it.lng], { icon })
        marker.bindPopup(popup, { maxWidth: 260 })
        marker.addTo(map); capasRef.current.push(marker)
        bounds.push([it.lat, it.lng])
      }
    })
    if (bounds.length === 1) map.setView(bounds[0], 16)
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [50, 50] })
  }, [filtroTipo, filtroTurno, itemsMapaables.length])

  useEffect(() => {
    const map=mapObjRef.current; const layer=comunasLayerRef.current; if (!map||!layer) return
    comunasVisible ? (map.hasLayer(layer)||layer.addTo(map)) : (map.hasLayer(layer)&&map.removeLayer(layer))
  }, [comunasVisible])

  useEffect(() => {
    if (mapObjRef.current) setTimeout(() => mapObjRef.current?.invalidateSize(), 80)
  }, [height])

  if (itemsMapaables.length === 0) return (
    <div style={{ height, background: '#f5f5f7', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#aeaeb2' }}>
      <div style={{ fontSize: 32 }}>ðŸ—º</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744' }}>Sin coordenadas disponibles</div>
      <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 260 }}>Usa Places Autocomplete o traza una zona para habilitar el mapa.</div>
    </div>
  )
  return <div ref={mapRef} style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden', border: '0.5px solid #e5e5ea' }}/>
}

// â”€â”€ MAPA PRESENTACION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MapaPresentacion({ os, items, onClose }) {
  const L = labelsOS(os?.tipo)
  const [filtroTipo,     setFiltroTipo]     = useState('todos')
  const [filtroTurno,    setFiltroTurno]    = useState('todos')
  const [comunasVisible, setComunasVisible] = useState(true)
  const [altMapa,        setAltMapa]        = useState(() => Math.max(400, window.innerHeight - 110))

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onResize() { setAltMapa(Math.max(400, window.innerHeight - 110)) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const itemsConCoords  = items.filter(it => it.lat && it.lng || parsePoligonoCoords(it.poligono_coords)?.length >= 3)
  const turnosPresentes = [...new Set(itemsConCoords.map(it => it.turno).filter(Boolean))]
  const totalAgentes    = items.reduce((acc, it) => acc + totalAgentesItem(it), 0)

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0d1829', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#1a2744', flexShrink: 0, boxShadow: '0 2px 16px rgba(0,0,0,0.5)', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 5, height: 30, background: '#f5c800', borderRadius: 2 }}/>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#f5c800', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1 }}>DGCAT Â· GCBA</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2, marginTop: 2 }}>
                OS-{String(os.numero).padStart(3,'0')} — {os.titulo || 'Orden de Servicio'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
            {[
              { v: items.filter(i=>(i.tipo==='servicio' || i.tipo==='puesto')).length, label: L.pluralA, color: '#4ecdc4' },
              { v: items.filter(i=>(i.tipo==='mision' || i.tipo==='itinerante')).length,   label: L.pluralB, color: '#e24b4a' },
              { v: totalAgentes || '—',                          label: 'Agentes',   color: '#f5c800' },
              { v: itemsConCoords.length,                        label: 'En mapa',   color: '#a8d8a8' },
            ].map(({ v, label, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '4px 12px', background: 'rgba(255,255,255,0.07)', borderRadius: 8, minWidth: 54 }}>
                <div style={{ fontSize: 17, fontWeight: 900, color, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <button onClick={onClose}
            style={{ marginLeft: 'auto', padding: '5px 16px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Cerrar
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px 10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 2 }}>
            {[['todos','Todos'],['servicio', L.pluralA],['mision', L.pluralB]].map(([val, label]) => (
              <button key={val} onClick={() => setFiltroTipo(val)}
                style={{ padding: '3px 11px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTipo===val?700:400, background: filtroTipo===val?'rgba(255,255,255,0.92)':'transparent', color: filtroTipo===val?'#1a2744':'rgba(255,255,255,0.6)', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)' }}/>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <button onClick={() => setFiltroTurno('todos')}
              style={{ padding: '3px 10px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTurno==='todos'?700:400, background: filtroTurno==='todos'?'rgba(255,255,255,0.18)':'transparent', color: 'rgba(255,255,255,0.7)' }}>
              Todos los turnos
            </button>
            {turnosPresentes.map(id => {
              const t=TURNO_MAP[id]; if (!t) return null
              return (
                <button key={id} onClick={() => setFiltroTurno(id)}
                  style={{ padding: '3px 9px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTurno===id?800:500, background: filtroTurno===id?t.color:t.bg, color: filtroTurno===id?'#fff':t.color }}>
                  {t.short}
                </button>
              )
            })}
          </div>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)' }}/>
          <button onClick={() => setComunasVisible(v => !v)}
            style={{ padding: '3px 12px', borderRadius: 16, border: `1px solid ${comunasVisible?'#4ecdc4':'rgba(255,255,255,0.15)'}`, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: comunasVisible?'rgba(78,205,196,0.12)':'transparent', color: comunasVisible?'#4ecdc4':'rgba(255,255,255,0.4)' }}>
            {comunasVisible ? 'âœ“' : 'â—‹'} Comunas
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#185fa5' }}/><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{L.singularA}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e24b4a' }}/><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{L.singularB}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 10, background: 'rgba(24,95,165,0.3)', border: '1.5px solid #185fa5', borderRadius: 2 }}/><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Zona</span></div>
            {comunasVisible && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 6, border: '1.5px dashed rgba(78,205,196,0.6)', borderRadius: 2 }}/><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Comunas</span></div>}
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginLeft: 6 }}>CAT Plataforma Â· DGCAT/GCBA</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: '8px', minHeight: 0 }}>
        <MapaCore items={items} height={altMapa} filtroTipo={filtroTipo} filtroTurno={filtroTurno} comunasVisible={comunasVisible}/>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

// â”€â”€ TAB MAPA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabMapa({ items, os }) {
  const L = labelsOS(os?.tipo)
  const [filtroTipo,     setFiltroTipo]     = useState('todos')
  const [filtroTurno,    setFiltroTurno]    = useState('todos')
  const [comunasVisible, setComunasVisible] = useState(true)
  const [presentacion,   setPresentacion]   = useState(false)

  const itemsMapaables  = items.filter(it => {
    if (it.modo_ubicacion === 'poligono') {
      const c = parsePoligonoCoords(it.poligono_coords)
      return Array.isArray(c) && c.length >= 3
    }
    return !!(it.lat && it.lng)
  })
  const sinCoords       = items.length - itemsMapaables.length
  const turnosPresentes = [...new Set(itemsMapaables.map(it => it.turno).filter(Boolean))]

  return (
    <>
      {presentacion && <MapaPresentacion os={os} items={items} onClose={() => setPresentacion(false)}/>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Filtros</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['todos','Todos'],['servicio', `Solo ${L.pluralA}`],['mision', `Solo ${L.pluralB}`]].map(([val, label]) => (
            <button key={val} onClick={() => setFiltroTipo(val)}
              style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTipo===val?700:400, background: filtroTipo===val?'#1a2744':'#f0f0f5', color: filtroTipo===val?'#fff':'#636366' }}>
              {label}
            </button>
          ))}
        </div>
        <span style={{ color: '#d1d1d6' }}>|</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setFiltroTurno('todos')}
            style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTurno==='todos'?700:400, background: filtroTurno==='todos'?'#1a2744':'#f0f0f5', color: filtroTurno==='todos'?'#fff':'#636366' }}>
            Todos los turnos
          </button>
          {turnosPresentes.map(id => {
            const t=TURNO_MAP[id]; if (!t) return null
            return (
              <button key={id} onClick={() => setFiltroTurno(id)}
                style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filtroTurno===id?700:400, background: filtroTurno===id?t.color:t.bg, color: filtroTurno===id?'#fff':t.color }}>
                {t.short}
              </button>
            )
          })}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => setComunasVisible(v => !v)}
            style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${comunasVisible?'#1a2744':'#d1d1d6'}`, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: comunasVisible?'#e4eaf5':'#fff', color: comunasVisible?'#1a2744':'#8e8e93' }}>
            {comunasVisible ? 'âœ“' : 'â—‹'} Comunas
          </button>
          <button onClick={() => setPresentacion(true)}
            style={{ padding: '4px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: '#1a2744', color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            Presentar
          </button>
        </div>
      </div>

      <MapaCore items={items} height={260} filtroTipo={filtroTipo} filtroTurno={filtroTurno} comunasVisible={comunasVisible}/>

      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#185fa5' }}/><span style={{ fontSize: 11, color: '#636366' }}>{L.singularA} ({itemsMapaables.filter(i=>(i.tipo==='servicio' || i.tipo==='puesto')).length})</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e24b4a' }}/><span style={{ fontSize: 11, color: '#636366' }}>{L.singularB} ({itemsMapaables.filter(i=>(i.tipo==='mision' || i.tipo==='itinerante')).length})</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 14, height: 10, background: 'rgba(24,95,165,0.2)', border: '2px solid #185fa5', borderRadius: 2 }}/><span style={{ fontSize: 11, color: '#636366' }}>Zona trazada</span></div>
        {comunasVisible && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 16, height: 7, border: '2px dashed #1a2744', borderRadius: 2, background: 'rgba(52,81,178,0.06)' }}/><span style={{ fontSize: 11, color: '#636366' }}>Comunas CABA</span></div>}
        {sinCoords > 0 && <span style={{ fontSize: 11, color: '#854f0b', background: '#faeeda', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{sinCoords} {sinCoords===1?'item':'items'} sin ubicacion</span>}
      </div>
    </>
  )
}

function Vacio({ texto }) {
  return <div style={{ textAlign: 'center', padding: '40px 20px', color: '#aeaeb2', fontSize: 13 }}>{texto}</div>
}
function Tab({ id, label, activo, badge, onClick }) {
  return (
    <button onClick={() => onClick(id)}
      style={{ padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: activo?700:400, color: activo?'#1a2744':'#8e8e93', borderBottom: activo?'2px solid #1a2744':'2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' }}>
      {label}
      {badge > 0 && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 800, background: '#f5c800', color: '#854f0b', padding: '1px 6px', borderRadius: 8 }}>{badge}</span>}
    </button>
  )
}

export default function ResumenOS({ os, onClose }) {
  const [loading, setLoading]     = useState(true)
  const [data, setData]           = useState(null)
  const [error, setError]         = useState(null)
  const [tabActiva, setTabActiva] = useState('turno')
  const [items, setItems]         = useState([])

  useEffect(() => { cargarResumen() }, [os.id])

  async function cargarResumen() {
    setLoading(true); setError(null)
    try { const res = await api.get(`/api/os/${os.id}/resumen`); setData(res); setItems(res.items||[]) }
    catch (e) { setError('No se pudo cargar el resumen'); console.warn(e) }
    setLoading(false)
  }

  function handleComunaAsignada(itemId, comuna) {
    setItems(prev => prev.map(it => it.id===itemId ? {...it, comuna} : it))
    if (!data) return
    const item = items.find(it => it.id===itemId); if (!item) return
    const nuevoPorComuna = {...data.stats.por_comuna}
    if (!nuevoPorComuna[comuna]) nuevoPorComuna[comuna] = {servicios:0, misiones:0, agentes:0}
    if ((item.tipo==='servicio' || item.tipo==='puesto')) nuevoPorComuna[comuna].servicios++; else nuevoPorComuna[comuna].misiones++
    setData(prev => ({...prev, items: prev.items.map(it => it.id===itemId?{...it,comuna}:it), stats: {...prev.stats, por_comuna: nuevoPorComuna, totales: {...prev.stats.totales, comunas: Object.keys(nuevoPorComuna).length}, alertas: {...prev.stats.alertas, sin_comuna: Math.max(0,(prev.stats.alertas.sin_comuna||0)-1)}}}))
  }

  const stats            = data?.stats
  const alertas          = stats?.alertas || {}
  const totalIncompletos = items.filter(itemIncompleto).length
  const L                = labelsOS(os?.tipo)

  const TABS = [
    { id:'turno',   label:'Por turno' },
    { id:'comuna',  label:'Por comuna',  badge: alertas.sin_comuna },
    { id:'psv',     label:'Eje PSV',     badge: alertas.sin_eje_psv },
    { id:'mapa',    label:'Mapa' },
    { id:'alertas', label:'Completitud', badge: totalIncompletos },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 950 }}/>
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 951, background: '#fff', borderRadius: 20, boxShadow: '0 24px 72px rgba(0,0,0,0.2)', width: 'min(900px, 95vw)', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '22px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2744', letterSpacing: '-0.4px' }}>Resumen operativo</div>
              <div style={{ fontSize: 13, color: '#8e8e93', marginTop: 2 }}>OS-{String(os.numero).padStart(3,'0')} Â· {os.titulo||''}</div>
            </div>
            <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: 9, cursor: 'pointer', color: '#636366', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Cerrar
            </button>
          </div>

          {stats && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
              <StatCard value={stats.totales.items} label="Items en la OS" sub={`${stats.totales.servicios} ${L.pluralA.toLowerCase()} · ${stats.totales.misiones} ${L.pluralB.toLowerCase()}`}/>
              <StatCard value={stats.totales.agentes||'—'} label="Agentes requeridos" color="#0f6e56" sub="Segun config. de items"/>
              <StatCard value={stats.totales.comunas||'—'} label="Comunas cubiertas" color="#534ab7" sub="Con ubicacion resuelta"/>
              {totalIncompletos > 0 && <StatCard value={totalIncompletos} label="Items con datos faltantes" color="#854f0b" alert sub="Ver tab Completitud"/>}
            </div>
          )}

          <div style={{ display: 'flex', borderBottom: '0.5px solid #e5e5ea', overflowX: 'auto' }}>
            {TABS.map(t => <Tab key={t.id} {...t} activo={tabActiva===t.id} onClick={setTabActiva}/>)}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#aeaeb2' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>â³</div>
              <div style={{ fontSize: 13 }}>Calculando estadisticas...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#e24b4a' }}>
              <div style={{ fontSize: 13, marginBottom: 12 }}>{error}</div>
              <button onClick={cargarResumen} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#1a2744', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Reintentar</button>
            </div>
          ) : data ? (
            <>
              {tabActiva==='turno'   && <TabTurno porTurno={data.stats.por_turno} osTipo={os?.tipo}/>}
              {tabActiva==='comuna'  && <TabComuna porComuna={data.stats.por_comuna} items={items} comunasDisponibles={data.comunas_disponibles} onComunaAsignada={handleComunaAsignada} osTipo={os?.tipo}/>}
              {tabActiva==='psv'     && <TabEjePSV porEjePSV={data.stats.por_eje_psv} sinEjePSV={alertas.sin_eje_psv} osTipo={os?.tipo}/>}
              {tabActiva==='mapa'    && <TabMapa items={items} os={os}/>}
              {tabActiva==='alertas' && <TabAlertas items={items}/>}
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
