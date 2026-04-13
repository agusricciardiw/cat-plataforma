const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/bases — lista todas las bases activas
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, direccion FROM bases WHERE activa = true ORDER BY nombre`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en GET /bases:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
