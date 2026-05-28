const Joi = require('joi');

// Fechas: validamos que sean ISO 8601 reales pero devolvemos el string original
// (.raw()) para no cambiar el tipo que el model ya espera.
const fechaRule = Joi.date().iso().raw();
const valorUFRule = Joi.number().positive()
  .messages({ 'number.positive': 'El valor UF debe ser mayor a 0', 'number.base': 'El valor UF debe ser numérico' });

const previewSchema = Joi.object({
  fecha_desde: fechaRule.required().messages({ 'any.required': 'fecha_desde es requerida' }),
  fecha_hasta: fechaRule.required().messages({ 'any.required': 'fecha_hasta es requerida' }),
  valor_uf:    valorUFRule.required().messages({ 'any.required': 'valor_uf es requerido' }),
});

const crearLiquidacionSchema = Joi.object({
  fecha_desde:   fechaRule.required().messages({ 'any.required': 'fecha_desde es requerida' }),
  fecha_hasta:   fechaRule.required().messages({ 'any.required': 'fecha_hasta es requerida' }),
  valor_uf:      valorUFRule.required().messages({ 'any.required': 'valor_uf es requerido' }),
  observaciones: Joi.string().trim().max(5000).allow(null, '').optional(),
});

const crearUFSchema = Joi.object({
  valor:         Joi.number().positive().required()
    .messages({ 'number.positive': 'El valor debe ser mayor a 0', 'any.required': 'valor es requerido' }),
  vigente_desde: fechaRule.required().messages({ 'any.required': 'vigente_desde es requerida' }),
});

module.exports = { previewSchema, crearLiquidacionSchema, crearUFSchema };
