const identity = require('../services/identity');
const { getPermisosRol } = require('../model/permisos');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  const user = await identity.verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Token inválido o expirado' });

  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sin permisos para esta acción' });
    }
    next();
  };
}

// Verifica que el usuario tenga un permiso específico (soporta roles custom).
// Admin siempre pasa. Para el resto consulta la tabla rol_permisos.
function requirePermiso(permiso) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') return next();
      const permisos = await getPermisosRol(req.user.role);
      if (!permisos.includes(permiso)) {
        return res.status(403).json({ error: 'Sin permisos para esta acción' });
      }
      next();
    } catch (err) {
      console.error('[requirePermiso] Error:', err.message);
      return res.status(500).json({ error: 'Error interno al verificar permisos' });
    }
  };
}

module.exports = { authMiddleware, requireRole, requirePermiso };
