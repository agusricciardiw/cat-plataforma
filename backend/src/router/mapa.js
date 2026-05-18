/**
 * router/mapa.js
 * Endpoints para proxy de capas públicas de BA Data.
 * Autenticación requerida (no es info sensible pero limitamos a usuarios logueados).
 */
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { obtenerCapa, listarCapas } = require('../service/mapa');

router.get('/capas', authMiddleware, (req, res) => {
  res.json(listarCapas());
});

router.get('/capa/:nombre', authMiddleware, async (req, res) => {
  const result = await obtenerCapa(req.params.nombre);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.set('Cache-Control', 'public, max-age=600'); // 10 min en el browser
  res.json(result.data);
});

module.exports = router;
