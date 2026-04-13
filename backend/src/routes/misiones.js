const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/misiones
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { fecha, turno, estado, base_id } = req.query;
    const user = req.user;

    let scopeBaseId = null;
    if (user.role === 'gerencia' || user.role === 'admin') {
      scopeBaseId = base_id || null;
    } else {
      scopeBaseId = user.base_id;
    }

    let query = `
      SELECT 
        m.*,
        b.nombre as base_nombre,
        json_agg(
          json_build_object(
            'id', p.id,
            'nombre_completo', p.nombre_completo,
            'legajo', p.legajo,
            'turno', p.turno,
            'es_encargado', ma.es_encargado,
            'estado', ma.estado,
            'aceptado_at', ma.aceptado_at
          )
        ) FILTER (WHERE p.id IS NOT NULL) as agentes
      FROM misiones m
      LEFT JOIN bases b ON m.base_id = b.id
      LEFT JOIN mision_agentes ma ON ma.mision_id = m.id
      LEFT JOIN profiles p ON ma.agente_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (scopeBaseId) { params.push(scopeBaseId); query += ` AND m.base_id = $${params.length}`; }
    if (fecha)       { params.push(fecha);        query += ` AND m.fecha = $${params.length}`; }
    if (estado)      { params.push(estado);       query += ` AND m.estado = $${params.length}`; }
    if (turno && !['gerencia','admin','jefe_base'].includes(user.role)) {
      params.push(turno); query += ` AND m.turno = $${params.length}`;
    }

    query += ` GROUP BY m.id, b.nombre ORDER BY m.created_at DESC`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en GET /misiones:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/misiones/mias — para agentes
router.get('/mias', authMiddleware, requireRole('agente'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, b.nombre as base_nombre, ma.es_encargado, ma.estado as estado_agente
       FROM misiones m
       JOIN mision_agentes ma ON ma.mision_id = m.id
       LEFT JOIN bases b ON m.base_id = b.id
       WHERE ma.agente_id = $1
       ORDER BY m.fecha DESC, m.created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en GET /misiones/mias:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/misiones/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const mision = await pool.query(
      `SELECT m.*, b.nombre as base_nombre
       FROM misiones m LEFT JOIN bases b ON m.base_id = b.id
       WHERE m.id = $1`,
      [req.params.id]
    );
    if (!mision.rows[0]) return res.status(404).json({ error: 'Misión no encontrada' });

    const agentes = await pool.query(
      `SELECT p.id, p.nombre_completo, p.legajo, p.turno,
              ma.es_encargado, ma.estado, ma.asignado_at, ma.aceptado_at
       FROM mision_agentes ma
       JOIN profiles p ON ma.agente_id = p.id
       WHERE ma.mision_id = $1`,
      [req.params.id]
    );

    const interrupciones = await pool.query(
      `SELECT i.*, p.nombre_completo
       FROM interrupciones i
       JOIN profiles p ON i.agente_id = p.id
       WHERE i.mision_id = $1 ORDER BY i.inicio DESC`,
      [req.params.id]
    );

    return res.json({ ...mision.rows[0], agentes: agentes.rows, interrupciones: interrupciones.rows });
  } catch (err) {
    console.error('Error en GET /misiones/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/misiones — crear misión manual
router.post('/', authMiddleware, requireRole('admin', 'gerencia', 'jefe_base', 'coordinador'), async (req, res) => {
  const { base_id, titulo, descripcion, turno, fecha, tipo, modo_ubicacion,
          calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, lat, lng, os_item_id } = req.body;

  if (!titulo || !turno) return res.status(400).json({ error: 'Título y turno son obligatorios' });
  const baseId = base_id || req.user.base_id;

  try {
    const result = await pool.query(
      `INSERT INTO misiones 
        (base_id, titulo, descripcion, turno, fecha, tipo, modo_ubicacion,
         calle, altura, calle2, desde, hasta, poligono_desc, eje_psv, lat, lng, os_item_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [baseId, titulo, descripcion || null, turno,
       fecha || new Date().toISOString().split('T')[0],
       tipo || 'servicio', modo_ubicacion || 'altura',
       calle || null, altura || null, calle2 || null,
       desde || null, hasta || null, poligono_desc || null,
       eje_psv || null, lat || null, lng || null, os_item_id || null]
    );

    await pool.query(
      `INSERT INTO actividad (base_id, mision_id, agente_id, tipo, descripcion)
       VALUES ($1, $2, $3, 'mision_creada', $4)`,
      [baseId, result.rows[0].id, req.user.id, `Misión creada: ${titulo}`]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error en POST /misiones:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/misiones/:id/asignar
router.post('/:id/asignar', authMiddleware, requireRole('admin', 'gerencia', 'jefe_base', 'coordinador', 'supervisor'), async (req, res) => {
  const { agente_ids, encargado_id } = req.body;
  if (!agente_ids || !agente_ids.length) return res.status(400).json({ error: 'Se requiere al menos un agente' });

  const idEncargado = encargado_id || agente_ids[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const agenteId of agente_ids) {
      await client.query(
        `INSERT INTO mision_agentes (mision_id, agente_id, estado, es_encargado)
         VALUES ($1, $2, 'asignado', $3)
         ON CONFLICT (mision_id, agente_id) DO UPDATE SET es_encargado = $3`,
        [req.params.id, agenteId, agenteId === idEncargado]
      );
    }

    await client.query(
      `UPDATE misiones SET estado = 'asignada', encargado_id = $1, updated_at = NOW()
       WHERE id = $2 AND estado = 'sin_asignar'`,
      [idEncargado, req.params.id]
    );

    await client.query('COMMIT');

    const mision = await pool.query(`SELECT base_id, titulo FROM misiones WHERE id = $1`, [req.params.id]);
    await pool.query(
      `INSERT INTO actividad (base_id, mision_id, agente_id, tipo, descripcion)
       VALUES ($1, $2, $3, 'mision_asignada', $4)`,
      [mision.rows[0]?.base_id, req.params.id, req.user.id,
       `${agente_ids.length} agente(s) asignado(s) a: ${mision.rows[0]?.titulo}`]
    );

    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en /asignar:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// POST /api/misiones/:id/aceptar
router.post('/:id/aceptar', authMiddleware, requireRole('agente'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const asignacion = await client.query(
      `SELECT * FROM mision_agentes WHERE mision_id = $1 AND agente_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!asignacion.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No estás asignado a esta misión' });
    }

    await client.query(
      `UPDATE mision_agentes SET estado = 'en_mision', aceptado_at = NOW()
       WHERE mision_id = $1 AND agente_id = $2`,
      [req.params.id, req.user.id]
    );

    const hayEncargado = await client.query(
      `SELECT id FROM mision_agentes WHERE mision_id = $1 AND es_encargado = true`,
      [req.params.id]
    );
    if (!hayEncargado.rows.length) {
      await client.query(
        `UPDATE mision_agentes SET es_encargado = true WHERE mision_id = $1 AND agente_id = $2`,
        [req.params.id, req.user.id]
      );
      await client.query(
        `UPDATE misiones SET encargado_id = $1, updated_at = NOW() WHERE id = $2`,
        [req.user.id, req.params.id]
      );
    }

    await client.query(
      `UPDATE misiones SET estado = 'en_mision', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    // Actualizar estado_turno del agente
    await client.query(
      `UPDATE profiles SET estado_turno = 'en_mision' WHERE id = $1`,
      [req.user.id]
    );

    await client.query('COMMIT');

    const mision = await pool.query(`SELECT base_id, titulo FROM misiones WHERE id = $1`, [req.params.id]);
    await pool.query(
      `INSERT INTO actividad (base_id, mision_id, agente_id, tipo, descripcion)
       VALUES ($1, $2, $3, 'mision_aceptada', $4)`,
      [mision.rows[0]?.base_id, req.params.id, req.user.id,
       `${req.user.nombre_completo} aceptó la misión: ${mision.rows[0]?.titulo}`]
    );

    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en /aceptar:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// POST /api/misiones/:id/interrumpir
router.post('/:id/interrumpir', authMiddleware, requireRole('agente'), async (req, res) => {
  const { motivo } = req.body;
  if (!motivo) return res.status(400).json({ error: 'Motivo requerido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO interrupciones (mision_id, agente_id, motivo) VALUES ($1, $2, $3)`,
      [req.params.id, req.user.id, motivo]
    );

    await client.query(
      `UPDATE misiones SET estado = 'interrumpida', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    await client.query(
      `UPDATE mision_agentes SET estado = 'libre' WHERE mision_id = $1 AND agente_id = $2`,
      [req.params.id, req.user.id]
    );

    await client.query(
      `UPDATE profiles SET estado_turno = 'libre' WHERE id = $1`,
      [req.user.id]
    );

    await client.query('COMMIT');

    const mision = await pool.query(`SELECT base_id, titulo FROM misiones WHERE id = $1`, [req.params.id]);
    await pool.query(
      `INSERT INTO actividad (base_id, mision_id, agente_id, tipo, descripcion)
       VALUES ($1, $2, $3, 'mision_interrumpida', $4)`,
      [mision.rows[0]?.base_id, req.params.id, req.user.id,
       `${req.user.nombre_completo} interrumpió: ${mision.rows[0]?.titulo}. Motivo: ${motivo}`]
    );

    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en /interrumpir:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// POST /api/misiones/:id/cerrar
router.post('/:id/cerrar', authMiddleware, async (req, res) => {
  const { observaciones } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE misiones SET estado = 'cerrada', observaciones = $1, updated_at = NOW() WHERE id = $2`,
      [observaciones || null, req.params.id]
    );

    await client.query(
      `UPDATE mision_agentes SET estado = 'libre' WHERE mision_id = $1`,
      [req.params.id]
    );

    await client.query(
      `UPDATE interrupciones SET fin = NOW(), activa = false WHERE mision_id = $1 AND activa = true`,
      [req.params.id]
    );

    // Liberar agentes en profiles
    await client.query(
      `UPDATE profiles SET estado_turno = 'libre'
       WHERE id IN (
         SELECT agente_id FROM mision_agentes WHERE mision_id = $1
       )`,
      [req.params.id]
    );

    await client.query('COMMIT');

    const mision = await pool.query(`SELECT base_id, titulo FROM misiones WHERE id = $1`, [req.params.id]);
    await pool.query(
      `INSERT INTO actividad (base_id, mision_id, agente_id, tipo, descripcion)
       VALUES ($1, $2, $3, 'mision_cerrada', $4)`,
      [mision.rows[0]?.base_id, req.params.id, req.user.id,
       `Misión cerrada: ${mision.rows[0]?.titulo}`]
    );

    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en /cerrar:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
