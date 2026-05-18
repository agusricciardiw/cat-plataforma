/**
 * Job runner con single-instance lock (ES0901 6.5 — apps stateless en granja).
 *
 * Cuando SIGAT corre en mas de una replica (escalamiento horizontal de
 * OpenShift), `setInterval(...)` se ejecuta en cada replica simultaneamente.
 * Sin coordinacion, los tres jobs internos del backend (cumplida automatica
 * de OS, paso a en_curso de SS.AA., limpieza de refresh/revoked tokens) se
 * disparan N veces y compiten contra los mismos rows.
 *
 * Solucion: cada tick intenta tomar un `pg_try_advisory_lock` con un id
 * exclusivo del job. Solo la replica que toma el lock corre la logica; las
 * demas hacen no-op silencioso. El lock se libera al terminar (o si el
 * proceso cae, Postgres lo libera al cerrar la sesion).
 *
 * Ventajas frente a alternativas:
 *   - No requiere infra extra (Redis/BullMQ). Ya tenemos Postgres.
 *   - Lock atado a la sesion del cliente, no a una transaccion: la logica
 *     adentro puede usar `pool.query` libremente y abrir sus propias
 *     transacciones.
 *   - Si el proceso muere, Postgres libera el lock al cerrar la conexion
 *     -> la proxima replica lo toma en el siguiente tick.
 */
const pool = require('../db/pool');

// IDs arbitrarios pero estables (4810xxx es un prefijo libre). NO cambiar
// despues de deploy: si se cambia, una replica vieja y otra nueva pueden
// agarrar locks distintos y correr ambas el job.
const JOB_LOCK_IDS = Object.freeze({
  VIGENCIA_OS:        4810001,
  SERVICIOS_EN_CURSO: 4810002,
  LIMPIAR_TOKENS:     4810003,
});

/**
 * Ejecuta `fn` solo si esta replica logra tomar el advisory lock `lockId`.
 * Si otra replica ya lo tiene, no hace nada (esto es lo deseado).
 *
 * @param {number} lockId   uno de JOB_LOCK_IDS
 * @param {string} jobName  para logging
 * @param {() => Promise<void>} fn  la logica del job
 */
async function runWithLock(lockId, jobName, fn) {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error(`[job] ${jobName}: no se pudo conectar a la DB (${err.message})`);
    return;
  }
  try {
    const { rows: [{ acquired }] } = await client.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [lockId]
    );
    if (!acquired) return; // otra replica esta corriendo este job
    try {
      await fn();
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    }
  } catch (err) {
    console.error(`[job] ${jobName}: error en lock o ejecucion (${err.message})`);
  } finally {
    client.release();
  }
}

/**
 * Programa un job con interval y lock. Corre una vez al inicio y despues
 * cada `intervalMs`. Devuelve el handle del setInterval por si se quiere
 * cancelar (no se usa hoy pero util para tests).
 */
function scheduleJob({ lockId, name, intervalMs, fn }) {
  const wrapped = () => runWithLock(lockId, name, fn);
  wrapped(); // primer tick inmediato (igual que el comportamiento previo)
  return setInterval(wrapped, intervalMs);
}

module.exports = { JOB_LOCK_IDS, runWithLock, scheduleJob };
