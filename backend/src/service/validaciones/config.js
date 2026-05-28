const Joi = require('joi');

// PUT /api/config/smtp — todos los campos opcionales pero al menos uno.
// smtp_from puede ser "Nombre <addr@dom>" o un email pelado → string laxo.
const setSMTPSchema = Joi.object({
  smtp_host: Joi.string().trim().hostname().max(255).optional()
    .messages({ 'string.hostname': 'smtp_host inválido' }),
  smtp_port: Joi.number().integer().min(1).max(65535).optional()
    .messages({ 'number.base': 'smtp_port debe ser numérico', 'number.min': 'smtp_port fuera de rango', 'number.max': 'smtp_port fuera de rango' }),
  smtp_user: Joi.string().trim().max(255).allow('').optional(),
  smtp_pass: Joi.string().max(500).allow('').optional(),
  smtp_from: Joi.string().trim().max(255).allow('').optional(),
}).min(1).messages({ 'object.min': 'Sin campos para actualizar' });

const testSMTPSchema = Joi.object({
  destino: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(255).optional()
    .messages({ 'string.email': 'destino inválido' }),
});

module.exports = { setSMTPSchema, testSMTPSchema };
