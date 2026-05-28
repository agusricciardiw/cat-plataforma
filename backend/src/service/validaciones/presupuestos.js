const Joi = require('joi');

const ESTADOS = ['borrador', 'enviado', 'aprobado', 'rechazado', 'vencido', 'cancelado'];

// Los ítems van a una columna jsonb. Estructura flexible (dia, personal, etc.);
// validamos que sea un array de objetos y dejamos pasar claves extra.
const itemsRule = Joi.array().items(
  Joi.object({
    dia:      Joi.string().trim().optional(),
    personal: Joi.number().min(0).optional(),
  }).unknown(true)
);

// Campos compartidos entre crear / actualizar / modificar-aprobado.
const baseFields = {
  beneficiario_id: Joi.string().uuid().allow(null, '').optional(),
  valor_modulo:    Joi.number().positive().optional(),
  validez_dias:    Joi.number().integer().positive().optional(),
  items:           itemsRule.optional(),
  observaciones:   Joi.string().trim().max(5000).allow(null, '').optional(),
};

const crearPresupuestoSchema = Joi.object({
  ...baseFields,
  beneficiario: Joi.string().trim().min(1).max(255).required()
    .messages({ 'any.required': 'El beneficiario es requerido', 'string.empty': 'El beneficiario es requerido' }),
  evento: Joi.string().trim().min(1).max(255).required()
    .messages({ 'any.required': 'El evento es requerido', 'string.empty': 'El evento es requerido' }),
});

const actualizarPresupuestoSchema = Joi.object({
  ...baseFields,
  beneficiario: Joi.string().trim().min(1).max(255).optional(),
  evento:       Joi.string().trim().min(1).max(255).optional(),
  estado:       Joi.string().valid(...ESTADOS)
    .messages({ 'any.only': 'Estado inválido' }).optional(),
}).min(1).messages({ 'object.min': 'Debe enviar al menos un campo para actualizar' });

// modificar-aprobado: mismos campos editables pero sin tocar estado.
const modificarAprobadoSchema = Joi.object({
  ...baseFields,
  beneficiario: Joi.string().trim().min(1).max(255).optional(),
  evento:       Joi.string().trim().min(1).max(255).optional(),
}).min(1).messages({ 'object.min': 'Debe enviar al menos un campo para actualizar' });

// BUI: números de boletín (los archivos se validan aparte por magic bytes).
const buiSchema = Joi.object({
  numero:      Joi.string().trim().max(100).allow(null, '').optional(),
  comp_numero: Joi.string().trim().max(100).allow(null, '').optional(),
});

module.exports = {
  ESTADOS,
  crearPresupuestoSchema,
  actualizarPresupuestoSchema,
  modificarAprobadoSchema,
  buiSchema,
};
