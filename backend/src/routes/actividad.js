const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/actividad
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { limite = 50, mision_id } = req.query;

    // Agentes no ven el feed global
    if (user.role === 'agente') {
      return res.status(403).json({ error: 'Sin permisos para ver el feed de actividad' });
    }

    let baseId = null;
    if (user.role !== 'gerencia' && user.role !== 'admin') {
      baseId = user.base_id;
    } else if (req.query.base_id) {
      baseId = req.query.base_id;
    }

    let query = `
      SELECT a.*, p.nombre_completo, p.legajo, m.titulo as mision_titulo
      FROM actividad a
      LEFT JOIN profiles p ON a.agente_id = p.id
      LEFT JOIN misiones m ON a.mision_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (baseId) { params.push(baseId); query += ` AND a.base_id = $${params.length}`; }
    if (mision_id) { params.push(mision_id); query += ` AND a.mision_id = $${params.length}`; }

    params.push(parseInt(limite));
    query += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en GET /actividad:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/actividad — registrar evento manual
router.post('/', authMiddleware, async (req, res) => {
  const { mision_id, tipo, descripcion, metadata } = req.body;
  if (!tipo || !descripcion) return res.status(400).json({ error: 'Tipo y descripción requeridos' });

  try {
    const result = await pool.query(
      `INSERT INTO actividad (base_id, mision_id, agente_id, tipo, descripcion, metadata)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.base_id, mision_id || null, req.user.id, tipo, descripcion,
       metadata ? JSON.stringify(metadata) : '{}']
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error en POST /actividad:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
