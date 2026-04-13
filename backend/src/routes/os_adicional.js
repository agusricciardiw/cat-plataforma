const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/os-adicional
router.get('/', async (req, res) => {
  try {
    const { role, base_id } = req.user;
    const esGlobal = ['admin', 'director', 'gerencia', 'planeamiento'].includes(role);
    const { rows } = await pool.query(`
      SELECT
        oa.*,
        b.nombre AS base_nombre,
        p.nombre_completo AS creado_por_nombre,
        COALESCE(json_agg(DISTINCT oaf.fecha ORDER BY oaf.fecha) FILTER (WHERE oaf.fecha IS NOT NULL),'[]') AS fechas,
        COUNT(DISTINCT fases.id) AS total_fases,
        COUNT(DISTINCT el.id)    AS total_elementos
      FROM os_adicional oa
      LEFT JOIN bases b ON b.id = oa.base_id
      LEFT JOIN profiles p ON p.id = oa.creado_por
      LEFT JOIN os_adicional_fechas oaf ON oaf.os_adicional_id = oa.id
      LEFT JOIN os_adicional_fases fases ON fases.os_adicional_id = oa.id
      LEFT JOIN os_adicional_elementos el ON el.fase_id = fases.id
      ${!esGlobal ? 'WHERE oa.base_id = $1' : ''}
      GROUP BY oa.id, b.nombre, p.nombre_completo
      ORDER BY oa.created_at DESC
    `, !esGlobal ? [base_id] : []);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener OS adicionales' });
  }
});

// GET /api/os-adicional/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: [oa] } = await pool.query(`
      SELECT oa.*, b.nombre AS base_nombre, p.nombre_completo AS creado_por_nombre
      FROM os_adicional oa
      LEFT JOIN bases b ON b.id = oa.base_id
      LEFT JOIN profiles p ON p.id = oa.creado_por
      WHERE oa.id = $1
    `, [id]);
    if (!oa) return res.status(404).json({ error: 'OS adicional no encontrada' });

    const [fechas, recursos, fases] = await Promise.all([
      pool.query('SELECT * FROM os_adicional_fechas WHERE os_adicional_id = $1 ORDER BY fecha', [id]),
      pool.query('SELECT * FROM os_adicional_recursos WHERE os_adicional_id = $1 ORDER BY tipo', [id]),
      pool.query('SELECT * FROM os_adicional_fases WHERE os_adicional_id = $1 ORDER BY fecha NULLS LAST, orden, created_at', [id]),
    ]);

    const fasesConElementos = await Promise.all(
      fases.rows.map(async (fase) => {
        const { rows: elementos } = await pool.query(
          'SELECT * FROM os_adicional_elementos WHERE fase_id = $1 ORDER BY created_at',
          [fase.id]
        );
        return { ...fase, elementos };
      })
    );

    res.json({ ...oa, fechas: fechas.rows, recursos: recursos.rows, fases: fasesConElementos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener OS adicional' });
  }
});

// POST /api/os-adicional
router.post('/', async (req, res) => {
  try {
    const { id: creado_por, base_id: base_id_user } = req.user;
    const {
      nombre, evento_motivo, base_id,
      horario_desde, horario_hasta,
      dotacion_agentes, dotacion_supervisores, dotacion_motorizados,
      observaciones, fechas = [], recursos = []
    } = req.body;
    const base = base_id || base_id_user;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [oa] } = await client.query(`
        INSERT INTO os_adicional
          (nombre, evento_motivo, base_id, creado_por,
           horario_desde, horario_hasta,
           dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
      `, [nombre, evento_motivo, base, creado_por,
          horario_desde, horario_hasta,
          dotacion_agentes || 0, dotacion_supervisores || 0, dotacion_motorizados || 0,
          observaciones]);
      for (const f of fechas) {
        await client.query('INSERT INTO os_adicional_fechas (os_adicional_id, fecha) VALUES ($1,$2)', [oa.id, f]);
      }
      for (const r of recursos) {
        await client.query(
          'INSERT INTO os_adicional_recursos (os_adicional_id, tipo, cantidad, descripcion) VALUES ($1,$2,$3,$4)',
          [oa.id, r.tipo, r.cantidad, r.descripcion || null]
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ ...oa, fechas, recursos, fases: [] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear OS adicional' });
  }
});

// PUT /api/os-adicional/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, evento_motivo, horario_desde, horario_hasta,
            dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones } = req.body;
    const { rows: [oa] } = await pool.query(`
      UPDATE os_adicional SET
        nombre = COALESCE($1, nombre),
        evento_motivo = COALESCE($2, evento_motivo),
        horario_desde = COALESCE($3, horario_desde),
        horario_hasta = COALESCE($4, horario_hasta),
        dotacion_agentes = COALESCE($5, dotacion_agentes),
        dotacion_supervisores = COALESCE($6, dotacion_supervisores),
        dotacion_motorizados = COALESCE($7, dotacion_motorizados),
        observaciones = COALESCE($8, observaciones),
        updated_at = NOW()
      WHERE id = $9 RETURNING *
    `, [nombre, evento_motivo, horario_desde, horario_hasta,
        dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones, id]);
    if (!oa) return res.status(404).json({ error: 'No encontrada' });
    res.json(oa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar OS adicional' });
  }
});

// POST /api/os-adicional/:id/estado
router.post('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['borrador','validacion','vigente','cumplida'].includes(estado))
      return res.status(400).json({ error: 'Estado invalido' });
    const { rows: [oa] } = await pool.query(
      'UPDATE os_adicional SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
    );
    if (!oa) return res.status(404).json({ error: 'No encontrada' });
    res.json(oa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// =============================================================================
// FASES
// =============================================================================

router.post('/:id/fases', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, horario_desde, horario_hasta, color, orden, fecha } = req.body;
    const COLORES = ['#e24b4a','#f5c800','#4ecdc4','#8b5cf6','#f97316','#22c55e'];
    const { rows: [count] } = await pool.query(
      'SELECT COUNT(*) FROM os_adicional_fases WHERE os_adicional_id = $1', [id]
    );
    const colorAuto = COLORES[parseInt(count.count) % COLORES.length];
    const { rows: [fase] } = await pool.query(`
      INSERT INTO os_adicional_fases
        (os_adicional_id, nombre, horario_desde, horario_hasta, color, orden, fecha)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [id, nombre, horario_desde || null, horario_hasta || null,
        color || colorAuto, orden || parseInt(count.count), fecha || null]);
    res.status(201).json({ ...fase, elementos: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear fase' });
  }
});

router.put('/fases/:fase_id', async (req, res) => {
  try {
    const { fase_id } = req.params;
    const { nombre, horario_desde, horario_hasta, color, orden, fecha } = req.body;
    const { rows: [fase] } = await pool.query(`
      UPDATE os_adicional_fases SET
        nombre = COALESCE($1, nombre),
        horario_desde = COALESCE($2, horario_desde),
        horario_hasta = COALESCE($3, horario_hasta),
        color = COALESCE($4, color),
        orden = COALESCE($5, orden),
        fecha = COALESCE($6, fecha),
        updated_at = NOW()
      WHERE id = $7 RETURNING *
    `, [nombre, horario_desde, horario_hasta, color, orden, fecha || null, fase_id]);
    if (!fase) return res.status(404).json({ error: 'Fase no encontrada' });
    res.json(fase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar fase' });
  }
});

router.delete('/fases/:fase_id', async (req, res) => {
  try {
    const { fase_id } = req.params;
    await pool.query('DELETE FROM os_adicional_fases WHERE id = $1', [fase_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar fase' });
  }
});

// POST /fases/:fase_id/elementos
router.post('/fases/:fase_id/elementos', async (req, res) => {
  try {
    const { fase_id } = req.params;
    const { tipo, nombre, instruccion, geometria } = req.body;
    const { rows: [el] } = await pool.query(`
      INSERT INTO os_adicional_elementos (fase_id, tipo, nombre, instruccion, geometria)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [fase_id, tipo, nombre || null, instruccion || null, JSON.stringify(geometria)]);
    res.status(201).json(el);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear elemento' });
  }
});

// PUT /elementos/:el_id
router.put('/elementos/:el_id', async (req, res) => {
  try {
    const { el_id } = req.params;
    const { nombre, instruccion, geometria } = req.body;
    const { rows: [el] } = await pool.query(`
      UPDATE os_adicional_elementos SET
        nombre = COALESCE($1, nombre),
        instruccion = COALESCE($2, instruccion),
        geometria = COALESCE($3, geometria),
        updated_at = NOW()
      WHERE id = $4 RETURNING *
    `, [nombre, instruccion, geometria ? JSON.stringify(geometria) : null, el_id]);
    if (!el) return res.status(404).json({ error: 'Elemento no encontrado' });
    res.json(el);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar elemento' });
  }
});

// DELETE /elementos/:el_id
router.delete('/elementos/:el_id', async (req, res) => {
  try {
    const { el_id } = req.params;
    await pool.query('DELETE FROM os_adicional_elementos WHERE id = $1', [el_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar elemento' });
  }
});

// DELETE /:os_id — eliminar OS adicional completa (solo en borrador, CASCADE)
router.delete('/:os_id', async (req, res) => {
  try {
    const { os_id } = req.params;
    const check = await pool.query(
      'SELECT id, estado FROM os_adicional WHERE id = $1',
      [os_id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'OS no encontrada' });
    if (check.rows[0].estado !== 'borrador') {
      return res.status(400).json({ error: 'Solo se puede eliminar una OS en borrador' });
    }
    await pool.query('DELETE FROM os_adicional WHERE id = $1', [os_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar OS' });
  }
});

module.exports = router;
