const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_GET_MAX, RATE_LIMIT_POST_MAX } = require('../config');
const c = require('../controller/facturacion');
const multer = require('multer');
const path   = require('path');
const storage = require('../services/storage');

const ROLES_RRHH = ['admin', 'gerencia', 'director', 'operador_adicionales', 'jefe_cgm'];

// Rate limit para las rutas publicas sin auth (ES0902 Vu9)
const limitGet = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_GET_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
});

const limitPost = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_POST_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos antes de volver a intentar.' },
});

// Multer en memoria: el archivo queda en req.file.buffer hasta que el handler
// lo persiste vía el adapter de storage. Esto desacopla el medio fisico (ES0901 8.4).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf', '.jpg', '.jpeg', '.png'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Solo PDF, JPG o PNG'), ok);
  },
});

// ── Rutas específicas PRIMERO (antes de /:id genérico) ────────

// Públicas (agentes via token — sin auth)
router.get ('/form/:token', limitGet, c.getForm);
router.post('/form/:token', limitPost, upload.single('factura_archivo'), async (req, res) => {
  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const name = `factura_${req.params.token}_${Date.now()}${ext}`;
    req.body.factura_archivo = await storage.save(req.file.buffer, name);
  }
  return c.postForm(req, res);
});

// Protegidas específicas
router.get  ('/agentes',        authMiddleware, requireRole(...ROLES_RRHH), c.getAgentes);
router.patch('/items/:item_id', authMiddleware, requireRole(...ROLES_RRHH), c.accionRRHH);

// ── Rutas genéricas ───────────────────────────────────────────
router.get ('/', authMiddleware, requireRole(...ROLES_RRHH), c.getLista);
router.post('/', authMiddleware, requireRole(...ROLES_RRHH), c.crear);
router.get ('/:id', authMiddleware, requireRole(...ROLES_RRHH), c.getById);

module.exports = router;
