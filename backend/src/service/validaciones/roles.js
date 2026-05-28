const Joi = require('joi');

// key: minúscula inicial, luego minúsculas/números/_ (2 a 59 chars).
const keyRule = Joi.string().trim().pattern(/^[a-z][a-z0-9_]{1,58}$/)
  .messages({ 'string.pattern.base': 'key inválido: solo minúsculas, números y _ (ej: subjefe_cgm)' });

// Color / bg: clases o hex; string laxo y acotado.
const colorRule = Joi.string().trim().max(50).allow(null, '').optional();

const crearRolSchema = Joi.object({
  key:        keyRule.required().messages({ 'any.required': 'key y label son requeridos' }),
  label:      Joi.string().trim().min(1).max(100).required()
    .messages({ 'any.required': 'key y label son requeridos', 'string.empty': 'key y label son requeridos' }),
  descripcion: Joi.string().trim().max(500).allow(null, '').optional(),
  color:       colorRule,
  bg:          colorRule,
  clonar_de:   keyRule.allow(null, '').optional(),
});

const editarRolSchema = Joi.object({
  label:       Joi.string().trim().min(1).max(100).required()
    .messages({ 'any.required': 'label es requerido', 'string.empty': 'label es requerido' }),
  descripcion: Joi.string().trim().max(500).allow(null, '').optional(),
  color:       colorRule,
  bg:          colorRule,
}).min(1);

module.exports = { crearRolSchema, editarRolSchema };
