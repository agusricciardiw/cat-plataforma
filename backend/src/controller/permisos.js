const { PERMISOS_DEF, getTodosLosPermisos, setPermisosRol } = require('../model/permisos');
const { getRoles } = require('../model/roles');
const { putPermisosRolSchema } = require('../service/validaciones/permisos');

const VALIDATE_OPTS = { abortEarly: false, stripUnknown: true };

async function getPermisos(req, res) {
  try {
    const [mapa, roles] = await Promise.all([
      getTodosLosPermisos(),
      getRoles(),
    ]);
    // Devuelve roles como objetos completos (key, label, color, bg, descripcion, es_sistema)
    res.json({ permisos_def: PERMISOS_DEF, roles, mapa });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

async function putPermisosRol(req, res) {
  const { rol } = req.params;
  if (rol === 'admin') return res.status(400).json({ error: 'Los permisos de admin no se pueden modificar' });
  const { error, value } = putPermisosRolSchema.validate(req.body, VALIDATE_OPTS);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    await setPermisosRol(rol, value.permisos);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(400).json({ error: e.message || 'Error interno' }); }
}

module.exports = { getPermisos, putPermisosRol };
