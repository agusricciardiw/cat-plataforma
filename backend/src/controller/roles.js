const { getRoles, getRolByKey, createRol, updateRol, deleteRol } = require('../model/roles');
const { getPermisosRol, setPermisosRol } = require('../model/permisos');
const pool = require('../db/pool');
const { crearRolSchema, editarRolSchema } = require('../service/validaciones/roles');

const VALIDATE_OPTS = { abortEarly: false, stripUnknown: true };

// GET /api/roles
async function listarRoles(req, res) {
  try {
    const roles = await getRoles();
    res.json(roles);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/roles
async function crearRol(req, res) {
  const { error, value } = crearRolSchema.validate(req.body, VALIDATE_OPTS);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { key, label, descripcion, color, bg, clonar_de } = value;

  const existente = await getRolByKey(key);
  if (existente) return res.status(409).json({ error: `Ya existe un rol con key "${key}"` });

  try {
    const rol = await createRol({ key, label, descripcion, color, bg });

    // Si se especifica un rol para clonar permisos
    if (clonar_de) {
      const permsOrigen = await getPermisosRol(clonar_de);
      if (permsOrigen.length > 0) {
        await setPermisosRol(key, permsOrigen);
      }
    }

    res.status(201).json(rol);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message || 'Error interno' }); }
}

// PATCH /api/roles/:key
async function editarRol(req, res) {
  const { key } = req.params;
  const { error, value } = editarRolSchema.validate(req.body, VALIDATE_OPTS);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { label, descripcion, color, bg } = value;
  try {
    const rol = await updateRol(key, { label, descripcion, color, bg });
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json(rol);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
}

// DELETE /api/roles/:key
async function eliminarRol(req, res) {
  const { key } = req.params;
  if (key === 'admin') return res.status(400).json({ error: 'No se puede eliminar el rol admin' });
  try {
    // Verificar que no haya usuarios con ese rol
    const usuarios = await pool.query('SELECT COUNT(*) FROM profiles WHERE role=$1', [key]);
    if (parseInt(usuarios.rows[0].count) > 0)
      return res.status(409).json({ error: `Hay ${usuarios.rows[0].count} usuario(s) con ese rol. Reasignálos antes de eliminar.` });

    await deleteRol(key);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(400).json({ error: e.message || 'Error interno' }); }
}

module.exports = { listarRoles, crearRol, editarRol, eliminarRol };
