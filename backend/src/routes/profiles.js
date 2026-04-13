const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/profiles — lista agentes (para SheetAsignacion)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { base_id, turno, role, activo } = req.query;

    // Scoping: coordinador y supervisor solo ven su base
    const esRestringido = ['coordinador', 'supervisor'].includes(req.user.role);
    const baseId = esRestringido ? req.user.base_id : (base_id || null);

    let query = `
      SELECT p.id, p.email, p.role, p.base_id, p.turno, p.legajo, 
             p.nombre_completo, p.activo, b.nombre as base_nombre
      FROM profiles p
      LEFT JOIN bases b ON p.base_id = b.id
      WHERE p.activo = true
    `;
    const params = [];

    if (baseId) {
      params.push(baseId);
      query += ` AND p.base_id = $${params.length}`;
    }
    if (turno) {
      params.push(turno);
      query += ` AND p.turno = $${params.length}`;
    }
    if (role) {
      params.push(role);
      query += ` AND p.role = $${params.length}`;
    }

    query += ` ORDER BY p.nombre_completo`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en GET /profiles:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/profiles/me — perfil propio
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.email, p.role, p.base_id, p.turno, p.legajo,
              p.nombre_completo, p.activo, b.nombre as base_nombre
       FROM profiles p
       LEFT JOIN bases b ON p.base_id = b.id
       WHERE p.id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Perfil no encontrado' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en GET /profiles/me:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/profiles/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.email, p.role, p.base_id, p.turno, p.legajo,
              p.nombre_completo, p.activo, b.nombre as base_nombre
       FROM profiles p
       LEFT JOIN bases b ON p.base_id = b.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Perfil no encontrado' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en GET /profiles/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/profiles — crear usuario (solo admin)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { email, password, role, base_id, turno, legajo, nombre_completo } = req.body;

  if (!email || !password || !role || !nombre_completo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO profiles (email, password_hash, role, base_id, turno, legajo, nombre_completo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, role, base_id, turno, legajo, nombre_completo`,
      [email.toLowerCase().trim(), hash, role, base_id || null, turno || null, legajo || null, nombre_completo]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email o legajo ya existe' });
    console.error('Error en POST /profiles:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/profiles/:id — actualizar (admin o el propio usuario)
router.put('/:id', authMiddleware, async (req, res) => {
  const esAdmin = req.user.role === 'admin';
  const esPropio = req.user.id === req.params.id;

  if (!esAdmin && !esPropio) {
    return res.status(403).json({ error: 'Sin permisos' });
  }

  const { nombre_completo, turno, base_id, role, activo } = req.body;

  try {
    const fields = [];
    const params = [];

    if (nombre_completo) { params.push(nombre_completo); fields.push(`nombre_completo = $${params.length}`); }
    if (turno !== undefined) { params.push(turno); fields.push(`turno = $${params.length}`); }
    if (esAdmin && base_id !== undefined) { params.push(base_id); fields.push(`base_id = $${params.length}`); }
    if (esAdmin && role) { params.push(role); fields.push(`role = $${params.length}`); }
    if (esAdmin && activo !== undefined) { params.push(activo); fields.push(`activo = $${params.length}`); }

    if (fields.length === 0) return res.status(400).json({ error: 'Sin campos para actualizar' });

    params.push(new Date());
    fields.push(`updated_at = $${params.length}`);
    params.push(req.params.id);

    const result = await pool.query(
      `UPDATE profiles SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING id, email, role, base_id, turno, nombre_completo, legajo`,
      params
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Perfil no encontrado' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en PUT /profiles/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
