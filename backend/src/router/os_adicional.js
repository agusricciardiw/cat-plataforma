const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const c = require('../controller/os_adicional');

router.use(authMiddleware);

// Roles autorizados para crear/modificar OS Adicional. Lectura (GET) queda
// abierta a cualquier autenticado porque la información es operativa y la
// consultan varios roles (supervisores, jefes, planeamiento, etc.).
// Validación / rechazo / estado son del flujo del operador adicional.
const ROLES_EDIT      = ['admin', 'operador_adicionales', 'gerencia', 'director', 'jefe_cgm'];
const ROLES_VALIDAR   = ['admin', 'gerencia', 'director', 'jefe_cgm'];

// ── Prefijos fijos (antes de /:id) ────────────────────────────
router.put('/turnos/:turno_id',            requireRole(...ROLES_EDIT),    c.putTurno);
router.delete('/turnos/:turno_id',         requireRole(...ROLES_EDIT),    c.deleteTurno);
router.post('/fases/:fase_id/duplicar',    requireRole(...ROLES_EDIT),    c.postDuplicarFase);
router.patch('/fases/:fase_id/mover',      requireRole(...ROLES_EDIT),    c.patchMoverFase);
router.put('/fases/:fase_id',              requireRole(...ROLES_EDIT),    c.putFase);
router.delete('/fases/:fase_id',           requireRole(...ROLES_EDIT),    c.deleteFase);
router.post('/fases/:fase_id/elementos',   requireRole(...ROLES_EDIT),    c.postElemento);
router.put('/elementos/:el_id',            requireRole(...ROLES_EDIT),    c.putElemento);
router.delete('/elementos/:el_id',         requireRole(...ROLES_EDIT),    c.deleteElemento);

// ── Colección ─────────────────────────────────────────────────
router.get('/',                                                            c.getOs);
router.post('/',                            requireRole(...ROLES_EDIT),    c.postOs);

// ── OS individual ─────────────────────────────────────────────
router.get('/:id',                                                          c.getOsById);
router.put('/:id',                          requireRole(...ROLES_EDIT),    c.putOs);
router.delete('/:id',                       requireRole(...ROLES_EDIT),    c.deleteOs);
router.post('/:id/enviar-validacion',       requireRole(...ROLES_EDIT),    c.postEnviarValidacion);
router.post('/:id/validar',                 requireRole(...ROLES_VALIDAR), c.postValidar);
router.post('/:id/rechazar',                requireRole(...ROLES_VALIDAR), c.postRechazar);
router.post('/:id/estado',                  requireRole(...ROLES_EDIT),    c.postEstado);
router.get('/:id/turnos',                                                   c.getTurnos);
router.post('/:id/turnos',                  requireRole(...ROLES_EDIT),    c.postTurno);
router.post('/:id/fases',                   requireRole(...ROLES_EDIT),    c.postFase);
router.put('/:id/recursos',                 requireRole(...ROLES_EDIT),    c.putRecursos);

module.exports = router;
