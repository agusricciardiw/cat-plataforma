/**
 * runMigrations — sistema de migraciones incremental con tracking en DB.
 *
 * Cómo funciona:
 *  - Mantiene una tabla `_migrations` con las migraciones ya aplicadas.
 *  - Lee todos los archivos .sql de backend/migrations/ en orden alfabético.
 *  - Aplica los que todavía no están en `_migrations`, cada uno en su propia transacción.
 *  - Baseline detection: si la tabla `_migrations` no existía pero el schema ya está
 *    (detectado por la presencia de la tabla `profiles`), marca automáticamente
 *    001_initial_schema.sql como aplicada. Esto permite adoptar el sistema en un VPS
 *    que ya tiene el schema sin volver a correr la migración inicial.
 *
 * Uso:
 *  - Automático: se llama desde index.js antes de server.listen().
 *  - Manual: `node src/db/runMigrations.js` (útil para CI / deploy checks).
 *
 * Para agregar un cambio de schema:
 *  1. Crear backend/migrations/NNN_descripcion.sql (ej: 002_add_column_foo.sql)
 *  2. Escribir el SQL del cambio (puede ser cualquier DDL).
 *  3. git push — el backend lo aplica solo al arrancar.
 */

const fs   = require('fs');
const path = require('path');

const MIGRATIONS_DIR        = path.join(__dirname, '../../migrations');
const TRACKING_TABLE        = 'public._migrations'; // schema-qualified para sobrevivir search_path vacío (pg_dump estándar)
const TRACKING_TABLE_NAME   = '_migrations';         // nombre bare para consultas a pg_tables (tablename = $1)
const BASELINE_FILE         = '001_initial_schema.sql';
const BASELINE_ANCHOR       = 'profiles'; // tabla que confirma que el schema ya existe

async function runMigrations(pool) {
  const client = await pool.connect();
  try {
    // ── 1. ¿Existe ya la tabla de tracking? ────────────────────────────────
    const { rowCount: trackingExists } = await client.query(`
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = $1
    `, [TRACKING_TABLE_NAME]);

    const isFirstTime = trackingExists === 0;

    // ── 2. Crear tabla de tracking si no existe ─────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
        id          SERIAL PRIMARY KEY,
        name        TEXT UNIQUE NOT NULL,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── 3. Baseline detection ────────────────────────────────────────────────
    // Si el tracking es nuevo pero el schema ya está, marcamos 001 como aplicada
    // para no intentar re-crear tablas que existen.
    if (isFirstTime) {
      const { rowCount: schemaExists } = await client.query(`
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = $1
      `, [BASELINE_ANCHOR]); // BASELINE_ANCHOR = 'profiles', no es el tracking table

      if (schemaExists > 0) {
        await client.query(
          `INSERT INTO ${TRACKING_TABLE} (name) VALUES ($1) ON CONFLICT DO NOTHING`,
          [BASELINE_FILE]
        );
        console.log(`[migrations] schema existente detectado → baseline fijado en ${BASELINE_FILE}`);
      }
    }

    // ── 4. Leer migraciones disponibles ─────────────────────────────────────
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort(); // orden lexicográfico = orden numérico si los archivos están bien nombrados

    // ── 5. Obtener las ya aplicadas ──────────────────────────────────────────
    const { rows } = await client.query(`SELECT name FROM ${TRACKING_TABLE}`);
    const applied  = new Set(rows.map(r => r.name));

    // ── 6. Aplicar las pendientes ─────────────────────────────────────────────
    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      // Strip BOM (pg_dump en Windows puede generar UTF-8 con BOM; Postgres no lo tolera)
      let sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      if (sql.charCodeAt(0) === 0xFEFF) sql = sql.slice(1);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO ${TRACKING_TABLE} (name) VALUES ($1)`,
          [file]
        );
        await client.query('COMMIT');
        count++;
        console.log(`[migrations] ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`[migrations] ✗ ${file} falló: ${err.message}`, { cause: err });
      }
    }

    if (count === 0) {
      console.log('[migrations] up to date');
    } else {
      console.log(`[migrations] ${count} migración(es) aplicada(s)`);
    }
  } finally {
    client.release();
  }
}

// Permite ejecución directa: node src/db/runMigrations.js
if (require.main === module) {
  const pool = require('./pool');
  runMigrations(pool)
    .then(() => { console.log('done'); process.exit(0); })
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runMigrations };
