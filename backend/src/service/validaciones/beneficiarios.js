const Joi = require('joi');

// CUIT argentino: 11 dígitos, con o sin guiones (XX-XXXXXXXX-X).
const cuitPattern = /^\d{2}-?\d{8}-?\d$/;

// Email sin validación de TLD contra lista (los dominios .gob.ar son válidos
// y no queremos depender de la lista de TLDs de Joi).
const emailRule = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(255)
  .messages({ 'string.email': 'Email inválido' });

const cuitRule = Joi.string().trim().pattern(cuitPattern)
  .messages({ 'string.pattern.base': 'CUIT inválido (formato XX-XXXXXXXX-X)' });

const crearBeneficiarioSchema = Joi.object({
  razon_social: Joi.string().trim().min(1).max(255).required()
    .messages({
      'any.required': 'La razón social es requerida',
      'string.empty': 'La razón social es requerida',
    }),
  nombre:   Joi.string().trim().max(255).allow(null, '').optional(),
  email:    emailRule.allow(null, '').optional(),
  telefono: Joi.string().trim().max(50).allow(null, '').optional(),
  cuit:     cuitRule.allow(null, '').optional(),
});

const actualizarBeneficiarioSchema = Joi.object({
  razon_social: Joi.string().trim().min(1).max(255).optional(),
  nombre:   Joi.string().trim().max(255).allow(null, '').optional(),
  email:    emailRule.allow(null, '').optional(),
  telefono: Joi.string().trim().max(50).allow(null, '').optional(),
  cuit:     cuitRule.allow(null, '').optional(),
  activo:   Joi.boolean().optional(),
}).min(1).messages({ 'object.min': 'Debe enviar al menos un campo para actualizar' });

module.exports = { crearBeneficiarioSchema, actualizarBeneficiarioSchema };
