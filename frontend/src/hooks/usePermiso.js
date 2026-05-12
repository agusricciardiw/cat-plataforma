import { useAuth } from '../context/AuthContext'

/**
 * Retorna true si el usuario actual tiene el permiso indicado.
 * El rol 'admin' siempre retorna true sin importar el permiso.
 *
 * Uso:
 *   const puedeAprobar = usePermiso('PRESUPUESTOS_APROBAR')
 */
export function usePermiso(key) {
  const { tienePermiso } = useAuth()
  return tienePermiso(key)
}

/**
 * Retorna un objeto con múltiples permisos a la vez.
 * Uso:
 *   const p = usePermisos(['PRESUPUESTOS_APROBAR', 'PRESUPUESTOS_RECHAZAR'])
 *   p.PRESUPUESTOS_APROBAR  // true/false
 */
export function usePermisos(keys) {
  const { tienePermiso } = useAuth()
  return Object.fromEntries(keys.map(k => [k, tienePermiso(k)]))
}
