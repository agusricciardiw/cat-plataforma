const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Credenciales incorrectas' });
  }

  try {
    const result = await pool.query(
      `SELECT p.*, b.nombre as base_nombre 
       FROM profiles p
       LEFT JOIN bases b ON p.base_id = b.id
       WHERE p.email = $1 AND p.activo = true`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    // Mensaje genérico siempre (ASI Vu6)
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      base_id: user.base_id,
      turno: user.turno,
      nombre_completo: user.nombre_completo,
      legajo: user.legajo,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    // Refresh token
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
    await pool.query(
      `INSERT INTO refresh_tokens (profile_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt]
    );

    return res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        base_id: user.base_id,
        base_nombre: user.base_nombre,
        turno: user.turno,
        nombre_completo: user.nombre_completo,
        legajo: user.legajo,
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Token requerido' });

  try {
    const result = await pool.query(
      `SELECT rt.*, p.email, p.role, p.base_id, p.turno, p.nombre_completo, p.legajo
       FROM refresh_tokens rt
       JOIN profiles p ON rt.profile_id = p.id
       WHERE rt.token = $1 AND rt.expires_at > NOW() AND p.activo = true`,
      [refreshToken]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const user = result.rows[0];
    const payload = {
      id: user.profile_id,
      email: user.email,
      role: user.role,
      base_id: user.base_id,
      turno: user.turno,
      nombre_completo: user.nombre_completo,
      legajo: user.legajo,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    return res.json({ token });
  } catch (err) {
    console.error('Error en refresh:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await pool.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
  }
  return res.json({ ok: true });
});

module.exports = router;
