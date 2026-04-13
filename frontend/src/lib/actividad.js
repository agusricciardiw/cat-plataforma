import api from '../lib/api'

export async function registrarActividad({ tipo, descripcion, mision_id, metadata }) {
  try {
    await api.post('/api/actividad', { tipo, descripcion, mision_id, metadata })
  } catch (e) {
    console.warn('Error registrando actividad:', e)
  }
}

// ── Stubs de compatibilidad — MisionesAgente.jsx aún los importa ──
// TODO: eliminar cuando MisionesAgente.jsx esté migrado al nuevo schema

export function actividadMisionAsignada() {}
export function actividadMisionAceptada() {}
export function actividadMisionCumplida() {}
export function actividadMisionIncumplida() {}
export function actividadMisionRechazada() {}
export function actividadMisionInterrumpida() {}
export function actividadMisionTomada() {}
export function actividadAgenteReasignado() {}
export function actividadAgenteLibrerado() {}
