const Joi = require('joi');

// PUT /api/permisos/:rol — lista de claves de permiso a asignar al rol.
const putPermisosRolSchema = Joi.object({
  permisos: Joi.array().items(Joi.string().trim().max(100)).required()
    .messages({
      'any.required': 'permisos debe ser un array',
      'array.base':   'permisos debe ser un array',
    }),
});

module.exports = { putPermisosRolSchema };
